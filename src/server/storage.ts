import type { S3Client } from "@aws-sdk/client-s3";
import { dirname, join, relative, resolve } from "node:path";
import { promises as fs } from "node:fs";
import { Readable } from "node:stream";
import type { CalendarEvent, Lead, MediaItem } from "../shared/crm.js";
import { defaultSiteSettings, mergeSiteSettings, type SiteSettings } from "../shared/siteSettings.js";
import { config, isS3Enabled } from "./config.js";

type DataDocumentName = "leads" | "calendar" | "settings";

const dataFileNames: Record<DataDocumentName, string> = {
    leads: "leads.json",
    calendar: "calendar.json",
    settings: "settings.json",
};

let s3SdkPromise: Promise<typeof import("@aws-sdk/client-s3")> | null = null;
let s3ClientPromise: Promise<S3Client> | null = null;

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
                relativeKey: key.replace(new RegExp(`^${config.s3MediaPrefix}/?`), ""),
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

                    items.push({
                        key: object.Key,
                        relativeKey: object.Key.replace(new RegExp(`^${config.s3MediaPrefix}/?`), ""),
                        size: object.Size ?? 0,
                        lastModified: object.LastModified?.toISOString() ?? null,
                        publicUrl: getPublicUrlForMediaKey(object.Key),
                    });
                }

                continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
            } while (continuationToken);

            return items.sort((left, right) => right.key.localeCompare(left.key));
        }

        return walkLocalMedia(sanitizedPrefix);
    },

    async uploadMedia(params: {
        fileName: string;
        contentType: string;
        buffer: Buffer;
        prefix?: string;
    }): Promise<MediaItem> {
        const safePrefix = sanitizePathFragment(params.prefix ?? "");
        const safeName = sanitizeFileName(params.fileName);
        const stampedName = `${Date.now()}-${safeName}`;
        const key = joinKey(config.s3MediaPrefix, safePrefix, stampedName);

        if (isS3Enabled) {
            const [{ PutObjectCommand }, s3Client] = await Promise.all([getS3Sdk(), getS3Client()]);
            await s3Client.send(new PutObjectCommand({
                Bucket: config.s3Bucket,
                Key: key,
                Body: params.buffer,
                ContentType: params.contentType || "application/octet-stream",
            }));
        } else {
            const destinationPath = getLocalMediaPath(join(safePrefix, stampedName));
            await fs.mkdir(dirname(destinationPath), { recursive: true });
            await fs.writeFile(destinationPath, params.buffer);
        }

        return {
            key,
            relativeKey: key.replace(new RegExp(`^${config.s3MediaPrefix}/?`), ""),
            size: params.buffer.length,
            lastModified: new Date().toISOString(),
            publicUrl: getPublicUrlForMediaKey(key),
        };
    },

    async deleteMedia(key: string): Promise<void> {
        const sanitizedKey = sanitizePathFragment(key);
        if (!sanitizedKey.startsWith(config.s3MediaPrefix)) {
            throw new Error("Media key must live under the configured media prefix.");
        }

        if (sanitizedKey.startsWith(config.s3DataPrefix)) {
            throw new Error("Refusing to delete data storage objects.");
        }

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
