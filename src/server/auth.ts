import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { config } from "./config.js";

declare global {
    namespace Express {
        interface Request {
            adminUser?: string;
        }
    }
}

interface SessionPayload {
    sub: string;
    exp: number;
}

function encodeBase64Url(value: string): string {
    return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string): string {
    return Buffer.from(value, "base64url").toString("utf8");
}

function signValue(value: string): string {
    return crypto
        .createHmac("sha256", config.adminSessionSecret)
        .update(value)
        .digest("base64url");
}

function parseCookies(req: Request): Record<string, string> {
    const header = req.headers.cookie;
    if (!header) {
        return {};
    }

    return header.split(";").reduce<Record<string, string>>((cookies, chunk) => {
        const [rawName, ...rawValue] = chunk.trim().split("=");
        if (!rawName || rawValue.length === 0) {
            return cookies;
        }

        cookies[rawName] = decodeURIComponent(rawValue.join("="));
        return cookies;
    }, {});
}

function safeCompare(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);

    if (leftBuffer.length !== rightBuffer.length) {
        return false;
    }

    return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function createSessionToken(username: string): string {
    const payload: SessionPayload = {
        sub: username,
        exp: Date.now() + config.sessionDurationMs,
    };

    const encodedPayload = encodeBase64Url(JSON.stringify(payload));
    const signature = signValue(encodedPayload);
    return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
    const [encodedPayload, signature] = token.split(".");

    if (!encodedPayload || !signature) {
        return null;
    }

    const expectedSignature = signValue(encodedPayload);
    if (!safeCompare(signature, expectedSignature)) {
        return null;
    }

    try {
        const payload = JSON.parse(decodeBase64Url(encodedPayload)) as SessionPayload;
        if (payload.exp <= Date.now() || payload.sub !== config.adminUsername) {
            return null;
        }
        return payload;
    } catch {
        return null;
    }
}

export function readSessionFromRequest(req: Request): SessionPayload | null {
    const cookies = parseCookies(req);
    const token = cookies[config.sessionCookieName];
    if (!token) {
        return null;
    }

    return verifySessionToken(token);
}

export function isAdminCredentialMatch(username: string, password: string): boolean {
    return safeCompare(username, config.adminUsername) && safeCompare(password, config.adminPassword);
}

export function shouldUseSecureCookies(req: Request): boolean {
    if (!config.isProduction) {
        return false;
    }

    if (req.secure) {
        return true;
    }

    return req.get("x-forwarded-proto") === "https";
}

export function setSessionCookie(req: Request, res: Response, token: string): void {
    res.cookie(config.sessionCookieName, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: shouldUseSecureCookies(req),
        maxAge: config.sessionDurationMs,
        path: "/",
    });
}

export function clearSessionCookie(req: Request, res: Response): void {
    res.clearCookie(config.sessionCookieName, {
        httpOnly: true,
        sameSite: "lax",
        secure: shouldUseSecureCookies(req),
        path: "/",
    });
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
    const session = readSessionFromRequest(req);
    if (!session) {
        res.status(401).json({ error: "Authentication required." });
        return;
    }

    req.adminUser = session.sub;
    next();
}
