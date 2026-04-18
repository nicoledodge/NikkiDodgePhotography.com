import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

function normalizePrefix(input: string | undefined, fallback: string): string {
    const normalized = (input ?? fallback)
        .trim()
        .replace(/^\/+/, "")
        .replace(/\/+$/, "");

    return normalized.length > 0 ? normalized : fallback;
}

const rootDir = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const isProduction = process.env.NODE_ENV === "production";

const adminUsername = process.env.ADMIN_USERNAME?.trim() || "admin";
const adminPassword = process.env.ADMIN_PASSWORD?.trim() || (!isProduction ? "local-dev-password" : "");
const adminSessionSecret = process.env.ADMIN_SESSION_SECRET?.trim() || (!isProduction ? "local-dev-session-secret" : "");

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
    port: Number(process.env.PORT || "5000"),
    sessionCookieName: "ndp_admin_session",
    adminUsername,
    adminPassword,
    adminSessionSecret,
    sessionDurationMs: 1000 * 60 * 60 * 24 * 14,
    maxUploadBytes: 25 * 1024 * 1024,
    s3Bucket: process.env.CRM_S3_BUCKET?.trim() || process.env.APP_S3_BUCKET?.trim() || "",
    s3Region: process.env.CRM_S3_REGION?.trim() || process.env.AWS_REGION?.trim() || "us-east-1",
    s3DataPrefix: normalizePrefix(process.env.CRM_S3_DATA_PREFIX, "app-data"),
    s3MediaPrefix: normalizePrefix(process.env.CRM_S3_MEDIA_PREFIX, "site-assets"),
    publicAssetBaseUrl: (process.env.CRM_PUBLIC_ASSET_BASE_URL?.trim() || "").replace(/\/+$/, ""),
};

export const isS3Enabled = config.s3Bucket.length > 0;
