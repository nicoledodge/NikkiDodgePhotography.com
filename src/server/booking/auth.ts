import { betterAuth } from "better-auth";
import { fromNodeHeaders } from "better-auth/node";
import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";
import type { BookingUser, SocialProvider } from "../../shared/booking.js";
import { pool } from "./db.js";

const env = process.env;
export const authOrigin = (
  env.BETTER_AUTH_URL ||
  env.PUBLIC_APP_URL ||
  "http://localhost:5173"
).replace(/\/+$/, "");
export const configuredProviders = (
  ["google", "facebook", "microsoft"] as const
).filter((provider) => {
  const prefix = provider.toUpperCase();
  return !!env[`${prefix}_CLIENT_ID`] && !!env[`${prefix}_CLIENT_SECRET`];
});
const authConfigured =
  env.AUTH_ENABLED === "true" &&
  !!pool &&
  !!env.BETTER_AUTH_SECRET &&
  env.BETTER_AUTH_SECRET.length >= 32;
const providerCredentials = (provider: SocialProvider) => ({
  clientId: env[`${provider.toUpperCase()}_CLIENT_ID`]!,
  clientSecret: env[`${provider.toUpperCase()}_CLIENT_SECRET`]!,
});

export const auth = authConfigured
  ? betterAuth({
      database: pool!,
      baseURL: authOrigin,
      secret: env.BETTER_AUTH_SECRET,
      trustedOrigins: [authOrigin],
      onAPIError: { errorURL: `${authOrigin}/login` },
      emailAndPassword: { enabled: false },
      socialProviders: {
        ...(configuredProviders.includes("google")
          ? {
              google: {
                ...providerCredentials("google"),
                prompt: "select_account" as const,
              },
            }
          : {}),
        ...(configuredProviders.includes("facebook")
          ? {
              facebook: {
                ...providerCredentials("facebook"),
                mapProfileToUser: (profile) => ({
                  email:
                    profile.email ||
                    `facebook-${"id" in profile ? profile.id : profile.sub}@identity.invalid`,
                  emailVerified: false,
                }),
              },
            }
          : {}),
        ...(configuredProviders.includes("microsoft")
          ? {
              microsoft: {
                ...providerCredentials("microsoft"),
                tenantId: "common",
                mapProfileToUser: (profile) => ({
                  email:
                    profile.email ||
                    `microsoft-${profile.oid || profile.sub}@identity.invalid`,
                  emailVerified: false,
                  image: undefined,
                }),
              },
            }
          : {}),
      },
      account: {
        encryptOAuthTokens: true,
        accountLinking: {
          enabled: true,
          disableImplicitLinking: true,
          allowDifferentEmails: true,
        },
      },
      user: {
        additionalFields: {
          role: { type: "string", defaultValue: "client", input: false },
        },
        changeEmail: { enabled: true },
      },
      emailVerification: {
        sendOnSignUp: false,
        autoSignInAfterVerification: false,
        sendVerificationEmail: async ({ user, url }) => {
          if (user.email.endsWith("@identity.invalid"))
            throw new Error("Add your contact email before verifying it.");
          await pool!.query(
            `INSERT INTO notification_jobs(id,kind,recipient,payload) VALUES($1,'email',$2,$3)`,
            [
              randomUUID(),
              user.email,
              JSON.stringify({
                subject: "Verify your email — Nikki Dodge Photography",
                text: `Please verify your contact email to continue your photography booking:\n\n${url}\n\nIf you did not request this, you can ignore this email.`,
              }),
            ],
          );
        },
      },
      session: {
        expiresIn: 60 * 60 * 24 * 7,
        updateAge: 60 * 60 * 24,
        cookieCache: { enabled: false },
      },
      rateLimit: { enabled: true, window: 60, max: 30 },
      advanced: {
        useSecureCookies: env.NODE_ENV === "production",
        defaultCookieAttributes: { httpOnly: true, sameSite: "lax" },
      },
    })
  : null;

declare global {
  namespace Express {
    interface Request {
      bookingUser?: BookingUser;
    }
  }
}

export async function getBookingUser(
  req: Request,
): Promise<BookingUser | null> {
  if (!auth) return null;
  const result = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  if (!result?.user) return null;
  const user = result.user;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified,
    role: user.role === "admin" ? "admin" : "client",
  };
}

export function requireBookingUser(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  void getBookingUser(req)
    .then((user) => {
      if (!user) {
        res.status(401).json({ error: "Please sign in to continue." });
        return;
      }
      req.bookingUser = user;
      next();
    })
    .catch(next);
}

export function requireVerifiedContact(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (
    !req.bookingUser?.emailVerified ||
    req.bookingUser.email.endsWith("@identity.invalid")
  ) {
    res
      .status(403)
      .json({
        error: "Verify your contact email before continuing.",
        code: "EMAIL_VERIFICATION_REQUIRED",
      });
    return;
  }
  next();
}

export function requireBookingAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  requireBookingUser(req, res, (error) => {
    if (error) {
      next(error);
      return;
    }
    if (req.bookingUser?.role !== "admin" || !req.bookingUser.emailVerified) {
      res.status(403).json({ error: "Administrator access required." });
      return;
    }
    next();
  });
}

export function sameOriginMutation(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    next();
    return;
  }
  if (req.get("origin") !== authOrigin) {
    res.status(403).json({ error: "Request origin is not allowed." });
    return;
  }
  next();
}
