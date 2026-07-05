import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

function normalizePrefix(input: string | undefined, fallback: string): string {
    const normalized = (input ?? fallback)
        .trim()
        .replace(/^\/+/, "")
        .replace(/\/+$/, "");

    return normalized.length > 0 ? normalized : fallback;
}

function normalizeOptionalPrefix(input: string | undefined, fallback: string): string {
    if (input === undefined) {
        return normalizePrefix(undefined, fallback);
    }

    return input
        .trim()
        .replace(/^\/+/, "")
        .replace(/\/+$/, "");
}

function readPositiveInteger(input: string | undefined, fallback: number): number {
    const parsedValue = Number(input);
    return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

const rootDir = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const isProduction = process.env.NODE_ENV === "production";

const adminUsername = process.env.ADMIN_USERNAME?.trim() || "admin";
const adminPassword = process.env.ADMIN_PASSWORD?.trim() || (!isProduction ? "local-dev-password" : "");
const adminSessionSecret = process.env.ADMIN_SESSION_SECRET?.trim() || (!isProduction ? "local-dev-session-secret" : "");
const port = Number(process.env.PORT || "5000");
const configuredPublicAppUrl = process.env.PUBLIC_APP_URL?.trim().replace(/\/+$/, "");
const maxServerUploadBytes = readPositiveInteger(process.env.CRM_MAX_SERVER_UPLOAD_BYTES, 25 * 1024 * 1024);
const maxDirectUploadBytes = readPositiveInteger(process.env.CRM_MAX_DIRECT_UPLOAD_BYTES, 200 * 1024 * 1024);

if (isProduction && adminPassword.length === 0) {
    throw new Error("ADMIN_PASSWORD must be set in production.");
}

if (isProduction && adminSessionSecret.length === 0) {
    throw new Error("ADMIN_SESSION_SECRET must be set in production.");
}

export const config = {
    rootDir,
    distDir: resolve(rootDir, "dist"),
    localDataDir: resolve(rootDir, "data", "app-data"),
    localMediaDir: resolve(rootDir, "data", "media"),
    localUploadPath: "/uploads",
    isProduction,
    port,
    sessionCookieName: "ndp_admin_session",
    adminUsername,
    adminPassword,
    adminSessionSecret,
    sessionDurationMs: 1000 * 60 * 60 * 24 * 14,
    maxUploadBytes: maxServerUploadBytes,
    maxServerUploadBytes,
    maxDirectUploadBytes,
    s3Bucket: process.env.CRM_S3_BUCKET?.trim() || process.env.APP_S3_BUCKET?.trim() || "",
    s3Region: process.env.CRM_S3_REGION?.trim() || process.env.AWS_REGION?.trim() || "us-east-1",
    s3DataPrefix: normalizePrefix(process.env.CRM_S3_DATA_PREFIX, "app-data"),
    s3MediaPrefix: normalizeOptionalPrefix(process.env.CRM_S3_MEDIA_PREFIX, "site-assets"),
    publicAssetBaseUrl: (process.env.CRM_PUBLIC_ASSET_BASE_URL?.trim() || "").replace(/\/+$/, ""),
    publicAppUrl: configuredPublicAppUrl || (isProduction ? "https://nikkidodgephotography.com" : `http://localhost:${port}`),
    discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL?.trim() || "",
    discordWebhookUsername: process.env.DISCORD_WEBHOOK_USERNAME?.trim() || "Nikki Dodge CRM",
};

export const isS3Enabled = config.s3Bucket.length > 0;
