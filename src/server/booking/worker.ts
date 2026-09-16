import nodemailer from "nodemailer";
import { pool, withTransaction } from "./db.js";
import { generateProposalDocuments } from "./documents.js";
import { reconcileExpiredHolds } from "./payments.js";
import { portalUrl } from "./signing.js";

export function getEmailReadiness() {
  const transport = Boolean(process.env.SMTP_URL || process.env.SMTP_HOST);
  const from = Boolean(process.env.SMTP_FROM);
  return { ready: transport && from, transport, from };
}
function mailTransport() {
  const timeouts = {
    connectionTimeout: 30_000,
    greetingTimeout: 20_000,
    socketTimeout: 120_000,
  };
  const isProduction = process.env.NODE_ENV === "production";
  const tlsServername = process.env.SMTP_TLS_SERVERNAME?.trim();
  if (process.env.SMTP_URL) {
    let smtpUrl = process.env.SMTP_URL;
    if (isProduction || tlsServername) {
      // URL options take precedence in Nodemailer, including nested TLS options.
      const connectionUrl = new URL(smtpUrl);
      if (isProduction && connectionUrl.protocol === "smtp:") {
        connectionUrl.searchParams.set("requireTLS", "true");
        connectionUrl.searchParams.set("ignoreTLS", "false");
        connectionUrl.searchParams.set("opportunisticTLS", "false");
      }
      if (tlsServername) {
        connectionUrl.searchParams.set("tls.servername", tlsServername);
      }
      connectionUrl.searchParams.set("tls.rejectUnauthorized", "true");
      smtpUrl = connectionUrl.toString();
    }
    return nodemailer.createTransport({
      url: smtpUrl,
      ...timeouts,
    });
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    ...timeouts,
    requireTLS: isProduction && process.env.SMTP_SECURE !== "true",
    ...(tlsServername
      ? { tls: { servername: tlsServername, rejectUnauthorized: true } }
      : {}),
    ...(process.env.SMTP_USER
      ? {
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          },
        }
      : {}),
  });
}
let running = false;
export async function processBookingJobs(): Promise<void> {
  if (!pool || running) return;
  running = true;
  try {
    await pool.query(`UPDATE notification_jobs SET status='failed',last_error='Job lease expired after the final attempt. Review and retry.'
            WHERE status='processing' AND next_attempt_at<=NOW() AND attempts>=8`);
    // Reconciliation failures deliberately keep the date held. Other jobs can still proceed.
    try {
      await reconcileExpiredHolds();
    } catch {
      console.error(
        "[booking] Date-hold reconciliation failed; holds retained for retry.",
      );
    }
    for (let i = 0; i < 10; i++) {
      const job = await withTransaction(async (client) => {
        const selected = await client.query(
          `SELECT * FROM notification_jobs WHERE status IN ('pending','processing')
                    AND next_attempt_at<=NOW() AND attempts<8
                    AND ($1::boolean OR kind<>'email') ORDER BY next_attempt_at,created_at FOR UPDATE SKIP LOCKED LIMIT 1`,
          [getEmailReadiness().ready],
        );
        if (!selected.rowCount) return null;
        const row = selected.rows[0];
        await client.query(
          `UPDATE notification_jobs SET status='processing',attempts=attempts+1,next_attempt_at=NOW()+interval '5 minutes' WHERE id=$1`,
          [row.id],
        );
        return { ...row, attempts: row.attempts + 1 };
      });
      if (!job) break;
      try {
        if (job.kind === "contract_generate") {
          await generateProposalDocuments(String(job.payload.proposalId));
        } else if (job.kind === "email") {
          if (
            !job.recipient ||
            typeof job.payload.subject !== "string" ||
            typeof job.payload.text !== "string"
          )
            throw new Error("Invalid email job");
          let text = job.payload.text as string;
          if (job.payload.proposalId) {
            const proposal = (
              await pool.query(
                "SELECT status,booking_id FROM proposals WHERE id=$1",
                [job.payload.proposalId],
              )
            ).rows[0];
            const balancePaid = await pool.query(
              `SELECT id FROM payments WHERE proposal_id=$1 AND kind='balance' AND status='paid'`,
              [job.payload.proposalId],
            );
            const reminder =
              job.payload.subject === "Your photography balance is coming due";
            const invite =
              job.payload.subject === "Your photography proposal is ready";
            if (
              (reminder &&
                (!proposal ||
                  proposal.status !== "confirmed" ||
                  balancePaid.rowCount)) ||
              (invite && (!proposal || proposal.status !== "sent"))
            ) {
              await pool.query(
                `UPDATE notification_jobs SET status='skipped',last_error=NULL WHERE id=$1`,
                [job.id],
              );
              continue;
            }
            if (proposal && !text.includes("http"))
              text += `\n\n${portalUrl(String(proposal.booking_id))}`;
          }
          await mailTransport().sendMail({
            from: process.env.SMTP_FROM,
            to: job.recipient,
            subject: job.payload.subject,
            text,
            messageId: `<booking-${job.id}@${new URL(process.env.PUBLIC_APP_URL || "http://localhost").hostname}>`,
          });
        } else throw new Error("Unknown booking job type");
        await pool.query(
          `UPDATE notification_jobs SET status='sent',last_error=NULL WHERE id=$1`,
          [job.id],
        );
      } catch {
        const nextAttempt = new Date(
          Date.now() + Math.min(6 * 60 * 60_000, 30_000 * 2 ** job.attempts),
        );
        await pool.query(
          `UPDATE notification_jobs SET status=$1,next_attempt_at=$2,last_error=$3 WHERE id=$4`,
          [
            job.attempts >= 8 ? "failed" : "pending",
            nextAttempt,
            job.kind === "email"
              ? "Email delivery failed. Check SMTP configuration and recipient."
              : "Document generation failed. Check private storage and PDF font configuration.",
            job.id,
          ],
        );
        console.error(
          `[booking] ${job.kind === "email" ? "Email" : "Document"} job failed; attempt ${job.attempts}.`,
        );
      }
    }
  } finally {
    running = false;
  }
}
