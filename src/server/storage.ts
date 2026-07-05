import type { S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import { dirname, join, relative, resolve } from "node:path";
import { promises as fs } from "node:fs";
import { Readable } from "node:stream";
import type { CalendarEvent, CalendarFeed, Lead, MediaFolderCreateResult, MediaItem, MediaUploadTarget } from "../shared/crm.js";
import { defaultSiteSettings, mergeSiteSettings, type SiteSettings } from "../shared/siteSettings.js";
import { config, isS3Enabled } from "./config.js";

type DataDocumentName = "leads" | "calendar" | "calendarFeeds" | "settings";

const dataFileNames: Record<DataDocumentName, string> = {
    leads: "leads.json",
    calendar: "calendar.json",
    calendarFeeds: "calendar-feeds.json",
    settings: "settings.json",
};

let s3SdkPromise: Promise<typeof import("@aws-sdk/client-s3")> | null = null;
let s3ClientPromise: Promise<S3Client> | null = null;
let s3PresignerPromise: Promise<typeof import("@aws-sdk/s3-request-presigner")> | null = null;

const presignedUploadExpiresSeconds = 15 * 60;

async function getS3Sdk(): Promise<typeof import("@aws-sdk/client-s3")> {
    if (!s3SdkPromise) {
        s3SdkPromise = import("@aws-sdk/client-s3");
    }

    return s3SdkPromise;
}

async function getS3Client(): Promise<S3Client> {
    if (!isS3Enabled) {
        throw new Error("S3 access requested without CRM_S3_BUCKET configured.");
    }

    if (!s3ClientPromise) {
        s3ClientPromise = (async () => {
            const { S3Client: AwsS3Client } = await getS3Sdk();
            return new AwsS3Client({
                region: config.s3Region,
            });
        })();
    }

    return s3ClientPromise;
}

async function getS3Presigner(): Promise<typeof import("@aws-sdk/s3-request-presigner")> {
    if (!s3PresignerPromise) {
        s3PresignerPromise = import("@aws-sdk/s3-request-presigner");
    }

    return s3PresignerPromise;
}

function joinKey(...segments: string[]): string {
    return segments
        .map((segment) => segment.trim().replace(/^\/+/, "").replace(/\/+$/, ""))
        .filter((segment) => segment.length > 0)
        .join("/");
}

function sanitizePathFragment(input: string): string {
    return input
        .replace(/\\/g, "/")
        .split("/")
        .filter((segment) => segment.length > 0 && segment !== "." && segment !== "..")
        .join("/");
}

function sanitizeFileName(fileName: string): string {
    const strippedName = fileName.trim().replace(/\s+/g, "-").replace(/[^a-zA-Z0-9._-]/g, "");
    return strippedName.length > 0 ? strippedName.toLowerCase() : "upload.bin";
}

function buildMediaKey(fileName: string, prefix = ""): string {
    const safePrefix = sanitizePathFragment(prefix);
    const safeName = sanitizeFileName(fileName);
    const stampedName = `${Date.now()}-${randomUUID().slice(0, 8)}-${safeName}`;
    return joinKey(config.s3MediaPrefix, safePrefix, stampedName);
}

function buildMediaFolderKey(prefix: string): string {
    const safePrefix = sanitizePathFragment(prefix);
    const folderKey = joinKey(config.s3MediaPrefix, safePrefix);
    if (!folderKey) {
        throw new Error("A folder name is required.");
    }

    assertMediaKey(folderKey);
    return `${folderKey}/`;
}

function isDataKey(key: string): boolean {
    return key === config.s3DataPrefix || key.startsWith(`${config.s3DataPrefix}/`);
}

function getRelativeMediaKey(key: string): string {
    if (!config.s3MediaPrefix) {
        return key;
    }

    const prefixWithSlash = `${config.s3MediaPrefix}/`;
    return key.startsWith(prefixWithSlash) ? key.slice(prefixWithSlash.length) : key;
}

function assertMediaKey(rawKey: string): string {
    const sanitizedKey = sanitizePathFragment(rawKey);
    if (!sanitizedKey) {
        throw new Error("A media key is required.");
    }

    if (isDataKey(sanitizedKey)) {
        throw new Error("Refusing to modify data storage objects.");
    }

    if (!config.s3MediaPrefix) {
        return sanitizedKey;
    }

    const mediaPrefixWithSlash = `${config.s3MediaPrefix}/`;
    if (sanitizedKey !== config.s3MediaPrefix && !sanitizedKey.startsWith(mediaPrefixWithSlash)) {
        throw new Error("Media key must live under the configured media prefix.");
    }

    return sanitizedKey;
}

function encodePathSegments(input: string): string {
    return input
        .split("/")
        .filter(Boolean)
        .map((segment) => encodeURIComponent(segment))
        .join("/");
}

async function streamToString(stream: Readable): Promise<string> {
    const chunks: Buffer[] = [];

    for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    return Buffer.concat(chunks).toString("utf8");
}

async function readBodyAsString(body: unknown): Promise<string | null> {
    if (!body) {
        return null;
    }

    if (typeof body === "string") {
        return body;
    }

    if (body instanceof Uint8Array) {
        return Buffer.from(body).toString("utf8");
    }

    if (typeof body === "object" && "transformToString" in body && typeof body.transformToString === "function") {
        return await body.transformToString();
    }

    if (body instanceof Readable) {
        return await streamToString(body);
    }

    return null;
}

function getLocalDataPath(documentName: DataDocumentName): string {
    return resolve(config.localDataDir, dataFileNames[documentName]);
}

function getS3DataKey(documentName: DataDocumentName): string {
    return joinKey(config.s3DataPrefix, dataFileNames[documentName]);
}

function getLocalMediaPath(relativeKey = ""): string {
    return resolve(config.localMediaDir, config.s3MediaPrefix, sanitizePathFragment(relativeKey));
}

function getPublicUrlForMediaKey(key: string): string {
    if (isS3Enabled) {
        if (config.publicAssetBaseUrl.length > 0) {
            return `${config.publicAssetBaseUrl}/${encodePathSegments(key)}`;
        }

        return `https://${config.s3Bucket}.s3.${config.s3Region}.amazonaws.com/${encodePathSegments(key)}`;
    }

    return `${config.localUploadPath}/${encodePathSegments(key)}`;
}

async function getMediaItemForKey(key: string, fallbackSize = 0): Promise<MediaItem> {
    const sanitizedKey = assertMediaKey(key);

    if (isS3Enabled) {
        const [{ HeadObjectCommand }, s3Client] = await Promise.all([getS3Sdk(), getS3Client()]);
        const response = await s3Client.send(new HeadObjectCommand({
            Bucket: config.s3Bucket,
            Key: sanitizedKey,
        }));

        return {
            key: sanitizedKey,
            relativeKey: getRelativeMediaKey(sanitizedKey),
            size: response.ContentLength ?? fallbackSize,
            lastModified: response.LastModified?.toISOString() ?? null,
            publicUrl: getPublicUrlForMediaKey(sanitizedKey),
        };
    }

    const absolutePath = resolve(config.localMediaDir, sanitizedKey);
    const stats = await fs.stat(absolutePath);

    return {
        key: sanitizedKey,
        relativeKey: getRelativeMediaKey(sanitizedKey),
        size: stats.size,
        lastModified: stats.mtime.toISOString(),
        publicUrl: getPublicUrlForMediaKey(sanitizedKey),
    };
}

async function ensureLocalStorage(): Promise<void> {
    await fs.mkdir(config.localDataDir, { recursive: true });
    await fs.mkdir(getLocalMediaPath(), { recursive: true });
}

async function readJsonDocument<T>(documentName: DataDocumentName, fallbackValue: T): Promise<T> {
    if (isS3Enabled) {
        try {
            const [{ GetObjectCommand }, s3Client] = await Promise.all([getS3Sdk(), getS3Client()]);
            const response = await s3Client.send(new GetObjectCommand({
                Bucket: config.s3Bucket,
                Key: getS3DataKey(documentName),
            }));

            const body = await readBodyAsString(response.Body);
            if (!body) {
                return fallbackValue;
            }

            return JSON.parse(body) as T;
        } catch (error) {
            if (error instanceof Error && /NoSuchKey|NotFound|The specified key does not exist/i.test(error.message)) {
                return fallbackValue;
            }

            throw error;
        }
    }

    await ensureLocalStorage();

    try {
        const payload = await fs.readFile(getLocalDataPath(documentName), "utf8");
        return JSON.parse(payload) as T;
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            return fallbackValue;
        }

        throw error;
    }
}

async function writeJsonDocument<T>(documentName: DataDocumentName, payload: T): Promise<void> {
    const serializedPayload = JSON.stringify(payload, null, 2);

    if (isS3Enabled) {
        const [{ PutObjectCommand }, s3Client] = await Promise.all([getS3Sdk(), getS3Client()]);
        await s3Client.send(new PutObjectCommand({
            Bucket: config.s3Bucket,
            Key: getS3DataKey(documentName),
            Body: serializedPayload,
            ContentType: "application/json",
        }));
        return;
    }

    await ensureLocalStorage();
    const filePath = getLocalDataPath(documentName);
    await fs.mkdir(dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, serializedPayload, "utf8");
}

async function walkLocalMedia(relativePrefix = ""): Promise<MediaItem[]> {
    const rootPath = getLocalMediaPath(relativePrefix);
    const mediaRootPath = resolve(config.localMediaDir);

    try {
        const stats = await fs.stat(rootPath);
        if (!stats.isDirectory()) {
            return [];
        }
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            return [];
        }
        throw error;
    }

    const items: MediaItem[] = [];

    async function visitDirectory(currentPath: string): Promise<void> {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });
        if (entries.length === 0 && currentPath !== rootPath) {
            const folderKey = `${relative(mediaRootPath, currentPath).replace(/\\/g, "/")}/`;
            items.push({
                key: folderKey,
                relativeKey: getRelativeMediaKey(folderKey),
                size: 0,
                lastModified: null,
                publicUrl: getPublicUrlForMediaKey(folderKey),
                isFolderMarker: true,
            });
            return;
        }

        for (const entry of entries) {
            const nextPath = join(currentPath, entry.name);
            if (entry.isDirectory()) {
                await visitDirectory(nextPath);
                continue;
            }

            if (!entry.isFile()) {
                continue;
            }

            const stats = await fs.stat(nextPath);
            const key = relative(mediaRootPath, nextPath).replace(/\\/g, "/");

            items.push({
                key,
                relativeKey: getRelativeMediaKey(key),
                size: stats.size,
                lastModified: stats.mtime.toISOString(),
                publicUrl: getPublicUrlForMediaKey(key),
            });
        }
    }

    await visitDirectory(rootPath);

    return items.sort((left, right) => right.relativeKey.localeCompare(left.relativeKey));
}

async function removeEmptyDirectories(startPath: string): Promise<void> {
    let currentPath = dirname(startPath);
    const rootPath = resolve(config.localMediaDir);

    while (currentPath.startsWith(rootPath) && currentPath !== rootPath) {
        const remainingEntries = await fs.readdir(currentPath);
        if (remainingEntries.length > 0) {
            break;
        }

        await fs.rmdir(currentPath);
        currentPath = dirname(currentPath);
    }
}

export const storage = {
    async getLeads(): Promise<Lead[]> {
        const leads = await readJsonDocument<Lead[]>("leads", []);
        return leads.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    },

    async saveLeads(leads: Lead[]): Promise<void> {
        await writeJsonDocument("leads", leads);
    },

    async getCalendar(): Promise<CalendarEvent[]> {
        const events = await readJsonDocument<CalendarEvent[]>("calendar", []);
        return events.sort((left, right) => left.start.localeCompare(right.start));
    },

    async saveCalendar(events: CalendarEvent[]): Promise<void> {
        await writeJsonDocument("calendar", events);
    },

    async getCalendarFeeds(): Promise<CalendarFeed[]> {
        const feeds = await readJsonDocument<CalendarFeed[]>("calendarFeeds", []);
        return feeds.sort((left, right) => left.name.localeCompare(right.name));
    },

    async saveCalendarFeeds(feeds: CalendarFeed[]): Promise<void> {
        await writeJsonDocument("calendarFeeds", feeds);
    },

    async getSettings(): Promise<SiteSettings> {
        const settings = await readJsonDocument<SiteSettings>("settings", defaultSiteSettings);
        return mergeSiteSettings(settings);
    },

    async saveSettings(settings: SiteSettings): Promise<void> {
        await writeJsonDocument("settings", mergeSiteSettings(settings));
    },

    async listMedia(prefix = ""): Promise<MediaItem[]> {
        const sanitizedPrefix = sanitizePathFragment(prefix);
        const fullPrefix = joinKey(config.s3MediaPrefix, sanitizedPrefix);

        if (isS3Enabled) {
            const [{ ListObjectsV2Command }, s3Client] = await Promise.all([getS3Sdk(), getS3Client()]);
            const items: MediaItem[] = [];
            let continuationToken: string | undefined;

            do {
                const response = await s3Client.send(new ListObjectsV2Command({
                    Bucket: config.s3Bucket,
                    Prefix: fullPrefix,
                    ContinuationToken: continuationToken,
                }));

                for (const object of response.Contents ?? []) {
                    if (!object.Key) {
                        continue;
                    }

                    if (isDataKey(object.Key)) {
                        continue;
                    }

                    items.push({
                        key: object.Key,
                        relativeKey: getRelativeMediaKey(object.Key),
                        size: object.Size ?? 0,
                        lastModified: object.LastModified?.toISOString() ?? null,
                        publicUrl: getPublicUrlForMediaKey(object.Key),
                        isFolderMarker: object.Key.endsWith("/") && (object.Size ?? 0) === 0,
                    });
                }

                continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
            } while (continuationToken);

            return items.sort((left, right) => right.key.localeCompare(left.key));
        }

        return walkLocalMedia(sanitizedPrefix);
    },

    async createMediaFolder(prefix: string): Promise<MediaFolderCreateResult> {
        const safePrefix = sanitizePathFragment(prefix);
        if (!safePrefix) {
            throw new Error("A folder name is required.");
        }

        const folderKey = buildMediaFolderKey(safePrefix);

        if (isS3Enabled) {
            const [{ PutObjectCommand }, s3Client] = await Promise.all([getS3Sdk(), getS3Client()]);
            await s3Client.send(new PutObjectCommand({
                Bucket: config.s3Bucket,
                Key: folderKey,
                Body: "",
                ContentType: "application/x-directory",
            }));
        } else {
            const destinationPath = resolve(config.localMediaDir, folderKey);
            await fs.mkdir(destinationPath, { recursive: true });
        }

        return {
            prefix: getRelativeMediaKey(folderKey).replace(/\/+$/, ""),
            key: folderKey,
        };
    },

    async createMediaUploadTarget(params: {
        fileName: string;
        contentType: string;
        size: number;
        prefix?: string;
    }): Promise<MediaUploadTarget> {
        const contentType = params.contentType.trim() || "application/octet-stream";
        const key = buildMediaKey(params.fileName, params.prefix);
        const expiresAt = new Date(Date.now() + presignedUploadExpiresSeconds * 1000).toISOString();

        if (!isS3Enabled) {
            return {
                method: "server",
                uploadUrl: "/api/admin/media/upload",
                key,
                relativeKey: getRelativeMediaKey(key),
                publicUrl: getPublicUrlForMediaKey(key),
                headers: {},
                maxBytes: config.maxServerUploadBytes,
                expiresAt: null,
            };
        }

        const [{ PutObjectCommand }, { getSignedUrl }, s3Client] = await Promise.all([
            getS3Sdk(),
            getS3Presigner(),
            getS3Client(),
        ]);
        const command = new PutObjectCommand({
            Bucket: config.s3Bucket,
            Key: key,
            ContentType: contentType,
        });
        const uploadUrl = await getSignedUrl(s3Client, command, {
            expiresIn: presignedUploadExpiresSeconds,
        });

        return {
            method: "s3",
            uploadUrl,
            key,
            relativeKey: getRelativeMediaKey(key),
            publicUrl: getPublicUrlForMediaKey(key),
            headers: {
                "Content-Type": contentType,
            },
            maxBytes: config.maxDirectUploadBytes,
            expiresAt,
        };
    },

    async uploadMedia(params: {
        fileName: string;
        contentType: string;
        buffer: Buffer;
        prefix?: string;
    }): Promise<MediaItem> {
        const safePrefix = sanitizePathFragment(params.prefix ?? "");
        const key = buildMediaKey(params.fileName, safePrefix);

        if (isS3Enabled) {
            const [{ PutObjectCommand }, s3Client] = await Promise.all([getS3Sdk(), getS3Client()]);
            await s3Client.send(new PutObjectCommand({
                Bucket: config.s3Bucket,
                Key: key,
                Body: params.buffer,
                ContentType: params.contentType || "application/octet-stream",
            }));
        } else {
            const destinationPath = resolve(config.localMediaDir, key);
            await fs.mkdir(dirname(destinationPath), { recursive: true });
            await fs.writeFile(destinationPath, params.buffer);
        }

        return {
            key,
            relativeKey: getRelativeMediaKey(key),
            size: params.buffer.length,
            lastModified: new Date().toISOString(),
            publicUrl: getPublicUrlForMediaKey(key),
        };
    },

    async moveMedia(params: {
        key: string;
        prefix: string;
    }): Promise<MediaItem> {
        const sourceKey = assertMediaKey(params.key);
        const safePrefix = sanitizePathFragment(params.prefix);
        const sourceSegments = sourceKey.split("/").filter(Boolean);
        const fileName = sourceSegments[sourceSegments.length - 1] ?? "upload.bin";
        const destinationKey = joinKey(config.s3MediaPrefix, safePrefix, fileName);
        assertMediaKey(destinationKey);

        if (destinationKey === sourceKey) {
            return getMediaItemForKey(sourceKey);
        }

        if (isS3Enabled) {
            const [{ CopyObjectCommand, DeleteObjectCommand }, s3Client] = await Promise.all([getS3Sdk(), getS3Client()]);
            await s3Client.send(new CopyObjectCommand({
                Bucket: config.s3Bucket,
                CopySource: `${config.s3Bucket}/${encodePathSegments(sourceKey)}`,
                Key: destinationKey,
            }));
            await s3Client.send(new DeleteObjectCommand({
                Bucket: config.s3Bucket,
                Key: sourceKey,
            }));

            return getMediaItemForKey(destinationKey);
        }

        const sourcePath = resolve(config.localMediaDir, sourceKey);
        const destinationPath = resolve(config.localMediaDir, destinationKey);
        await fs.mkdir(dirname(destinationPath), { recursive: true });
        await fs.rename(sourcePath, destinationPath);
        await removeEmptyDirectories(sourcePath);

        return getMediaItemForKey(destinationKey);
    },

    async deleteMedia(key: string): Promise<void> {
        const sanitizedKey = assertMediaKey(key);

        if (isS3Enabled) {
            const [{ DeleteObjectCommand }, s3Client] = await Promise.all([getS3Sdk(), getS3Client()]);
            await s3Client.send(new DeleteObjectCommand({
                Bucket: config.s3Bucket,
                Key: sanitizedKey,
            }));
            return;
        }

        const absolutePath = resolve(config.localMediaDir, sanitizedKey);
        await fs.rm(absolutePath, { force: true });
        await removeEmptyDirectories(absolutePath);
    },
};
