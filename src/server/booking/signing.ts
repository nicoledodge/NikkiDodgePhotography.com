import { createHash, randomUUID } from "node:crypto";
import sharp from "sharp";
import type { PoolClient } from "pg";
import { pool, withTransaction } from "./db.js";

export const CONSENT_VERSION = "2026-09-16";
export interface BookingActor {
  id: string;
  name: string;
  email: string;
  role: string;
  emailVerified?: boolean;
}
export interface SignatureInput {
  legalName: string;
  method: "typed" | "drawn";
  signature?: string;
  consentAccepted: boolean;
  intentAccepted: boolean;
  authorityAccepted: boolean;
  consentVersion: string;
}
export class BookingError extends Error {
  constructor(
    message: string,
    public statusCode = 400,
  ) {
    super(message);
  }
}
export function requireVerifiedActor(user: BookingActor): void {
  if (!user.id || !user.email || user.emailVerified !== true) {
    throw new BookingError(
      "Sign in with a verified email before continuing.",
      403,
    );
  }
}
export function isAssignedSigner(
  signer: { user_id?: string | null; email: string; role: string },
  user: BookingActor,
): boolean {
  if (signer.role === "admin" && user.role !== "admin") return false;
  return signer.user_id
    ? signer.user_id === user.id
    : user.emailVerified === true &&
        signer.email.toLowerCase() === user.email.toLowerCase();
}
export function snapshotHash(snapshot: string): string {
  return createHash("sha256").update(snapshot, "utf8").digest("hex");
}
export function assertFrozenContract(
  snapshot: string,
  expectedHash: string,
): void {
  if (
    !snapshot?.trim() ||
    !expectedHash ||
    snapshotHash(snapshot) !== expectedHash
  ) {
    throw new BookingError(
      "This contract is unavailable or has changed. Ask Nikki for a new proposal.",
      409,
    );
  }
}
export async function validateSignatureInput(input: SignatureInput) {
  if (!input || typeof input !== "object")
    throw new BookingError("A signature and consent are required.");
  const legalName =
    typeof input.legalName === "string" ? input.legalName.trim() : "";
  if (
    legalName.length < 2 ||
    legalName.length > 160 ||
    /[\x00-\x1f\x7f]/.test(legalName)
  ) {
    throw new BookingError("Enter your full legal name (2–160 characters).");
  }
  if (
    input.consentAccepted !== true ||
    input.intentAccepted !== true ||
    input.authorityAccepted !== true ||
    input.consentVersion !== CONSENT_VERSION
  ) {
    throw new BookingError(
      "Review the current disclosure and confirm consent, signing intent, and your authority to sign.",
    );
  }
  if (input.method === "typed")
    return { legalName, method: "typed" as const, signature: legalName };
  if (input.method !== "drawn")
    throw new BookingError("Choose a typed or drawn signature.");
  const match = /^data:image\/png;base64,([A-Za-z0-9+/]+={0,2})$/.exec(
    input.signature || "",
  );
  if (!match || match[1].length > 350_000)
    throw new BookingError("Draw a signature using the signature pad.");
  try {
    const source = Buffer.from(match[1], "base64");
    if (source.length < 60 || source.length > 256_000)
      throw new Error("Invalid size");
    const metadata = await sharp(source, {
      limitInputPixels: 4_194_304,
    }).metadata();
    if (
      metadata.format !== "png" ||
      !metadata.width ||
      !metadata.height ||
      metadata.width > 4096 ||
      metadata.height > 4096
    )
      throw new Error("Invalid PNG");
    // Decode and re-encode instead of retaining arbitrary metadata or a mislabeled payload.
    const image = sharp(source, { limitInputPixels: 4_194_304 });
    const stats = await image.stats();
    if (stats.channels[3]?.max === 0) throw new Error("Invisible signature");
    const visibleVariance = stats.channels
      .slice(0, 3)
      .some((channel) => channel.stdev > 1);
    const alphaVariance = stats.channels[3] && stats.channels[3].stdev > 1;
    if (!visibleVariance && !alphaVariance) throw new Error("Blank signature");
    const png = await image.png().toBuffer();
    return {
      legalName,
      method: "drawn" as const,
      signature: `data:image/png;base64,${png.toString("base64")}`,
    };
  } catch {
    throw new BookingError(
      "The signature image is invalid or blank. Clear the pad and draw again.",
    );
  }
}

export function getSigningReadiness() {
  return {
    ready: Boolean(pool),
    database: Boolean(pool),
    consentVersion: CONSENT_VERSION,
  };
}

export async function appendAudit(
  client: PoolClient,
  args: {
    bookingId: string;
    proposalId: string;
    type: string;
    actorId?: string | null;
    details: Record<string, unknown>;
  },
) {
  await client.query(
    `INSERT INTO audit_events (id, booking_id, proposal_id, event_type, actor_id, details, created_at)
        VALUES ($1,$2,$3,$4,$5,$6::jsonb,NOW())`,
    [
      randomUUID(),
      args.bookingId,
      args.proposalId,
      args.type,
      args.actorId || null,
      JSON.stringify(args.details),
    ],
  );
}

export async function signProposal(
  user: BookingActor,
  proposalId: string,
  input: SignatureInput,
  meta: { ip: string | null; userAgent: string | null },
) {
  requireVerifiedActor(user);
  const signature = await validateSignatureInput(input);
  const result = await withTransaction(async (client) => {
    // All signing, issue, checkout and expiry operations lock the proposal first.
    const result = await client.query(
      `SELECT p.*, b.user_id AS booking_user_id FROM proposals p
            JOIN booking_requests b ON b.id=p.booking_id WHERE p.id=$1 FOR UPDATE OF p`,
      [proposalId],
    );
    const proposal = result.rows[0];
    if (!proposal) throw new BookingError("Proposal not found.", 404);
    const signers = await client.query(
      "SELECT * FROM proposal_signers WHERE proposal_id=$1 FOR UPDATE",
      [proposalId],
    );
    const signer = signers.rows.find((row) => isAssignedSigner(row, user));
    if (!signer)
      throw new BookingError(
        "This proposal is assigned to a different signer.",
        403,
      );
    assertFrozenContract(proposal.contract_snapshot, proposal.contract_hash);
    if (signer.signed_at)
      return {
        ok: true,
        alreadySigned: true,
        status: proposal.status,
        proposalId,
      };
    if (
      !proposal.hold_expires_at ||
      new Date(proposal.hold_expires_at).getTime() <= Date.now()
    ) {
      throw new BookingError(
        "The date hold has expired. Ask Nikki to renew the proposal.",
        409,
      );
    }
    const held = await client.query(
      `SELECT id FROM reservations WHERE proposal_id=$1 AND status='held' FOR UPDATE`,
      [proposalId],
    );
    if (!held.rowCount)
      throw new BookingError(
        "This date is no longer held. Ask Nikki for a new proposal.",
        409,
      );
    if (signer.role === "admin") {
      if (proposal.status !== "draft")
        throw new BookingError(
          "Only a draft proposal can be signed by Nikki.",
          409,
        );
    } else {
      if (proposal.status !== "sent")
        throw new BookingError("This proposal is not open for signing.", 409);
      if (!signers.rows.some((row) => row.role === "admin" && row.signed_at)) {
        throw new BookingError(
          "Nikki must sign this proposal before clients can sign.",
          409,
        );
      }
    }
    const signedAt = new Date().toISOString();
    await client.query(
      `INSERT INTO signatures (id,signer_id,proposal_id,legal_name,method,signature,consent_version,ip,user_agent,signed_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        randomUUID(),
        signer.id,
        proposalId,
        signature.legalName,
        signature.method,
        signature.signature,
        CONSENT_VERSION,
        meta.ip?.slice(0, 200) || "",
        meta.userAgent?.slice(0, 1000) || "",
        signedAt,
      ],
    );
    await client.query(
      "UPDATE proposal_signers SET signed_at=$1,user_id=$2 WHERE id=$3",
      [signedAt, user.id, signer.id],
    );
    await appendAudit(client, {
      bookingId: proposal.booking_id,
      proposalId,
      type: "contract_signed",
      actorId: user.id,
      details: {
        signerId: signer.id,
        legalName: signature.legalName,
        email: user.email,
        role: signer.role,
        method: signature.method,
        contractHash: proposal.contract_hash,
        signatureHash: snapshotHash(signature.signature),
        consentVersion: CONSENT_VERSION,
        consentAccepted: true,
        intentAccepted: true,
        authorityAccepted: true,
        ip: meta.ip,
        userAgent: meta.userAgent,
        signedAt,
      },
    });
    const fullySigned = signers.rows.every(
      (row) => row.id === signer.id || row.signed_at,
    );
    if (fullySigned) {
      await client.query(`UPDATE proposals SET status='signed' WHERE id=$1`, [
        proposalId,
      ]);
      await client.query(
        `UPDATE booking_requests SET status='proposed',updated_at=NOW() WHERE id=$1`,
        [proposal.booking_id],
      );
      await client.query(
        `INSERT INTO notification_jobs (id,kind,recipient,payload,status,attempts,next_attempt_at,created_at)
                VALUES ($1,'contract_generate','',$2::jsonb,'pending',0,NOW(),NOW())`,
        [randomUUID(), JSON.stringify({ proposalId })],
      );
    }
    return {
      ok: true,
      alreadySigned: false,
      status: fullySigned ? "signed" : proposal.status,
      proposalId,
      signedAt,
    };
  });
  if (user.role === "admin" && result.status === "draft")
    return issueProposal(user, proposalId);
  return result;
}

export function portalUrl(bookingId: string): string {
  const base = new URL(process.env.PUBLIC_APP_URL || "http://localhost:5173");
  if (
    !["http:", "https:"].includes(base.protocol) ||
    (process.env.NODE_ENV === "production" && base.protocol !== "https:")
  ) {
    throw new BookingError(
      "The secure client portal URL is not configured.",
      503,
    );
  }
  return new URL(
    `/client/bookings/${encodeURIComponent(bookingId)}`,
    base,
  ).toString();
}

export async function issueProposal(user: BookingActor, proposalId: string) {
  requireVerifiedActor(user);
  if (user.role !== "admin")
    throw new BookingError("Staff access required.", 403);
  return withTransaction(async (client) => {
    const proposal = (
      await client.query("SELECT * FROM proposals WHERE id=$1 FOR UPDATE", [
        proposalId,
      ])
    ).rows[0];
    if (!proposal) throw new BookingError("Proposal not found.", 404);
    if (proposal.status === "sent")
      return { ok: true, status: "sent", proposalId };
    if (proposal.status !== "draft")
      throw new BookingError("Only signed drafts can be sent.", 409);
    assertFrozenContract(proposal.contract_snapshot, proposal.contract_hash);
    const signers = (
      await client.query(
        "SELECT * FROM proposal_signers WHERE proposal_id=$1",
        [proposalId],
      )
    ).rows;
    if (
      !signers.some((row) => row.role === "admin" && row.signed_at) ||
      !signers.some((row) => row.role === "client")
    ) {
      throw new BookingError(
        "A staff signature and at least one client signer are required.",
        409,
      );
    }
    const held = await client.query(
      `SELECT id FROM reservations WHERE proposal_id=$1 AND status='held' FOR UPDATE`,
      [proposalId],
    );
    if (
      !held.rowCount ||
      new Date(proposal.hold_expires_at).getTime() <= Date.now()
    )
      throw new BookingError("Renew the date hold before sending.", 409);
    const url = portalUrl(proposal.booking_id);
    await client.query(`UPDATE proposals SET status='sent' WHERE id=$1`, [
      proposalId,
    ]);
    await client.query(
      `UPDATE booking_requests SET status='proposed',updated_at=NOW() WHERE id=$1`,
      [proposal.booking_id],
    );
    for (const signer of signers.filter((row) => row.role === "client")) {
      await client.query(
        `INSERT INTO notification_jobs (id,kind,recipient,payload) VALUES ($1,'email',$2,$3::jsonb)`,
        [
          randomUUID(),
          signer.email,
          JSON.stringify({
            proposalId,
            subject: "Your photography proposal is ready",
            text: `Hi ${signer.name},\n\nYour proposal from Nikki Dodge Photography is ready to review and sign. Sign in with ${signer.email} to continue.\n\n${url}\n\nYour date hold expires ${new Date(proposal.hold_expires_at).toISOString()}. Your reservation is confirmed after all required signatures and the retainer payment.`,
          }),
        ],
      );
    }
    await appendAudit(client, {
      bookingId: proposal.booking_id,
      proposalId,
      type: "proposal_sent",
      actorId: user.id,
      details: {
        contractHash: proposal.contract_hash,
        holdExpiresAt: proposal.hold_expires_at,
      },
    });
    return { ok: true, status: "sent", proposalId };
  });
}
