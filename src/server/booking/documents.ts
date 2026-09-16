import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { pool, withTransaction } from "./db.js";
import {
  appendAudit,
  assertFrozenContract,
  BookingError,
  requireVerifiedActor,
  type BookingActor,
} from "./signing.js";

type DocumentKind = "contract" | "certificate";
interface SignatureRecord {
  legal_name: string;
  method: string;
  signature: string;
  signed_at: Date | string;
  email: string;
  role: string;
  consent_version: string;
  ip: string;
  user_agent: string;
}
interface ContractData {
  proposalId: string;
  bookingId: string;
  version: number;
  snapshot: string;
  snapshotHash: string;
  signatures: SignatureRecord[];
  auditEvents: Record<string, unknown>[];
}
const fontPath = () =>
  process.env.DOCUMENTS_FONT_PATH ||
  path.resolve("assets/fonts/NotoSans-Regular.ttf");
const bucket = () => process.env.DOCUMENTS_S3_BUCKET;
function s3Client() {
  const endpoint = process.env.CRM_S3_ENDPOINT || process.env.S3_ENDPOINT;
  const accessKeyId =
    process.env.CRM_S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey =
    process.env.CRM_S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
  return new S3Client({
    region:
      process.env.DOCUMENTS_S3_REGION ||
      process.env.CRM_S3_REGION ||
      process.env.AWS_REGION ||
      "us-east-1",
    endpoint: endpoint || undefined,
    forcePathStyle: Boolean(endpoint),
    ...(accessKeyId && secretAccessKey
      ? {
          credentials: {
            accessKeyId,
            secretAccessKey,
            sessionToken:
              process.env.CRM_S3_SESSION_TOKEN || process.env.AWS_SESSION_TOKEN,
          },
        }
      : {}),
  });
}
export function getDocumentReadiness() {
  const publicBucket = process.env.CRM_S3_BUCKET || process.env.APP_S3_BUCKET;
  const privateStorage =
    Boolean(bucket() && bucket() !== publicBucket) ||
    (!bucket() && process.env.NODE_ENV !== "production");
  const font = existsSync(fontPath());
  return {
    ready: Boolean(pool) && privateStorage && font,
    privateStorage,
    font,
    storage: bucket()
      ? "private-s3"
      : process.env.NODE_ENV === "production"
        ? "unconfigured"
        : "private-local",
  };
}
function hash(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}
class Typesetter {
  page: PDFPage;
  y = 744;
  constructor(
    readonly pdf: PDFDocument,
    readonly font: PDFFont,
  ) {
    this.page = pdf.addPage([612, 792]);
  }
  nextPage() {
    this.page = this.pdf.addPage([612, 792]);
    this.y = 744;
  }
  line(text: string, size = 10) {
    if (this.y < 54 + size * 1.5) this.nextPage();
    this.page.drawText(text, {
      x: 48,
      y: this.y,
      size,
      font: this.font,
      color: rgb(0.12, 0.13, 0.13),
    });
    this.y -= size * 1.55;
  }
  text(text: string, size = 10) {
    for (const paragraph of text.replace(/\r\n/g, "\n").split("\n")) {
      if (!paragraph) {
        this.y -= size;
        continue;
      }
      let line = "";
      for (const char of paragraph) {
        if (this.font.widthOfTextAtSize(line + char, size) > 516) {
          this.line(line, size);
          line = "";
        }
        line += char;
      }
      if (line) this.line(line, size);
    }
  }
}
async function newPdf(title: string) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(await readFile(fontPath()), {
    subset: true,
  });
  pdf.setTitle(title);
  pdf.setAuthor("Nikki Dodge Photography");
  pdf.setProducer("Nikki Dodge Photography client portal");
  return { pdf, layout: new Typesetter(pdf, font) };
}
function footer(pdf: PDFDocument, font: PDFFont, proposalId: string) {
  const pages = pdf.getPages();
  pages.forEach((page, i) =>
    page.drawText(`${proposalId}  |  ${i + 1} / ${pages.length}`, {
      x: 48,
      y: 26,
      size: 8,
      font,
      color: rgb(0.4, 0.4, 0.4),
    }),
  );
}
export async function renderSignedDocuments(data: ContractData) {
  assertFrozenContract(data.snapshot, data.snapshotHash);
  if (
    !data.signatures.length ||
    !data.signatures.some((s) => s.role === "admin") ||
    !data.signatures.some((s) => s.role === "client")
  )
    throw new BookingError("All contract signatures are required.", 409);
  const { pdf, layout } = await newPdf("Signed photography agreement");
  layout.text("NIKKI DODGE PHOTOGRAPHY", 16);
  layout.text(`Signed photography agreement · Version ${data.version}`, 11);
  layout.text(
    `Proposal ${data.proposalId}\nContract text SHA-256: ${data.snapshotHash}`,
    8,
  );
  layout.y -= 16;
  layout.text(data.snapshot);
  layout.y -= 24;
  layout.text("Electronic signatures", 14);
  for (const signer of data.signatures) {
    if (layout.y < 200) layout.nextPage();
    layout.y -= 12;
    layout.text(signer.legal_name, 15);
    if (signer.method === "drawn") {
      const image = await pdf.embedPng(
        Buffer.from(signer.signature.split(",")[1], "base64"),
      );
      const scale = Math.min(260 / image.width, 75 / image.height);
      layout.page.drawImage(image, {
        x: 48,
        y: layout.y - image.height * scale,
        width: image.width * scale,
        height: image.height * scale,
      });
      layout.y -= image.height * scale + 8;
    }
    layout.text(
      `${signer.role === "admin" ? "Photographer" : "Client"} · ${signer.email}\nSigned ${new Date(signer.signed_at).toISOString()}\nMethod: ${signer.method} · Consent version: ${signer.consent_version}`,
      9,
    );
  }
  // Preserve exact Unicode source alongside the visible rendering, independent of font glyph coverage.
  await pdf.attach(Buffer.from(data.snapshot), "contract-source.txt", {
    mimeType: "text/plain",
    description:
      "Exact frozen contract source covered by the contract text SHA-256.",
  });
  await pdf.attach(
    Buffer.from(
      JSON.stringify(
        data.signatures.map(({ signature, ...record }) => ({
          ...record,
          signatureSha256: hash(Buffer.from(signature)),
        })),
        null,
        2,
      ),
    ),
    "signature-evidence.json",
    { mimeType: "application/json" },
  );
  footer(pdf, layout.font, data.proposalId);
  const contract = Buffer.from(await pdf.save());
  const contractHash = hash(contract);
  const certificateDoc = await newPdf(
    "Electronic signature completion certificate",
  );
  const certificate = certificateDoc.layout;
  certificate.text("Completion certificate", 18);
  certificate.text(
    `Nikki Dodge Photography\nProposal ${data.proposalId}\nBooking ${data.bookingId}\nVersion ${data.version}`,
    10,
  );
  certificate.y -= 12;
  certificate.text(
    `Final signed contract PDF SHA-256:\n${contractHash}\n\nFrozen contract text SHA-256:\n${data.snapshotHash}`,
    9,
  );
  certificate.y -= 12;
  certificate.text("Signer evidence", 14);
  for (const signer of data.signatures)
    certificate.text(
      `\n${signer.legal_name} (${signer.role})\nEmail: ${signer.email}\nSigned: ${new Date(signer.signed_at).toISOString()}\nMethod: ${signer.method}\nConsent version: ${signer.consent_version}\nIP address: ${signer.ip || "unavailable"}\nUser agent: ${signer.user_agent || "unavailable"}`,
      9,
    );
  certificate.y -= 12;
  certificate.text("Audit events", 14);
  for (const event of data.auditEvents)
    certificate.text(
      `${String(event.created_at)} · ${String(event.event_type)}\n${JSON.stringify(event.details)}`,
      8,
    );
  await certificateDoc.pdf.attach(
    Buffer.from(
      JSON.stringify(
        {
          proposalId: data.proposalId,
          contractSha256: contractHash,
          contractTextSha256: data.snapshotHash,
          events: data.auditEvents,
        },
        null,
        2,
      ),
    ),
    "audit-evidence.json",
    { mimeType: "application/json" },
  );
  footer(certificateDoc.pdf, certificate.font, data.proposalId);
  return {
    contract,
    certificate: Buffer.from(await certificateDoc.pdf.save()),
    contractHash,
  };
}
async function storeDocument(key: string, bytes: Buffer) {
  if (!getDocumentReadiness().privateStorage)
    throw new BookingError(
      "Use a separate private bucket for signed agreements.",
      503,
    );
  if (bucket()) {
    await s3Client().send(
      new PutObjectCommand({
        Bucket: bucket(),
        Key: key,
        Body: bytes,
        ContentType: "application/pdf",
        ServerSideEncryption: "AES256",
        CacheControl: "private, no-store",
      }),
    );
    return;
  }
  if (process.env.NODE_ENV === "production")
    throw new BookingError("Private contract storage is not configured.", 503);
  const root = path.resolve(
    process.env.DOCUMENTS_LOCAL_DIR || "data/booking-documents",
  );
  const file = path.resolve(root, key);
  if (!file.startsWith(root + path.sep))
    throw new BookingError("Invalid document storage path.", 500);
  await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  await writeFile(file, bytes, { mode: 0o600 });
}
export async function generateProposalDocuments(
  proposalId: string,
): Promise<void> {
  if (!getDocumentReadiness().ready)
    throw new BookingError(
      "Private contract documents are not configured.",
      503,
    );
  await withTransaction(async (client) => {
    const proposal = (
      await client.query("SELECT * FROM proposals WHERE id=$1 FOR UPDATE", [
        proposalId,
      ])
    ).rows[0];
    if (!proposal) throw new BookingError("Proposal not found.", 404);
    const existing = (
      await client.query("SELECT kind FROM documents WHERE proposal_id=$1", [
        proposalId,
      ])
    ).rows;
    if (existing.length === 2) return;
    const unsigned = await client.query(
      "SELECT id FROM proposal_signers WHERE proposal_id=$1 AND signed_at IS NULL",
      [proposalId],
    );
    if (unsigned.rowCount)
      throw new BookingError(
        "The agreement is still awaiting signatures.",
        409,
      );
    const signatures = (
      await client.query<SignatureRecord>(
        `SELECT s.*,ps.email,ps.role FROM signatures s JOIN proposal_signers ps ON ps.id=s.signer_id
            WHERE s.proposal_id=$1 ORDER BY s.signed_at, s.id`,
        [proposalId],
      )
    ).rows;
    const events = (
      await client.query(
        "SELECT event_type,actor_id,details,created_at FROM audit_events WHERE proposal_id=$1 ORDER BY created_at,id",
        [proposalId],
      )
    ).rows;
    const rendered = await renderSignedDocuments({
      proposalId,
      bookingId: proposal.booking_id,
      version: proposal.version,
      snapshot: proposal.contract_snapshot,
      snapshotHash: proposal.contract_hash,
      signatures,
      auditEvents: events,
    });
    for (const kind of ["contract", "certificate"] as const) {
      const bytes = rendered[kind];
      const sha256 = hash(bytes);
      const prefix = (
        process.env.DOCUMENTS_S3_PREFIX || "booking-documents"
      ).replace(/^\/+|\/+$/g, "");
      const key = `${prefix}/${proposalId}/${sha256}-${kind}.pdf`;
      await storeDocument(key, bytes);
      await client.query(
        `INSERT INTO documents (id,proposal_id,kind,storage_key,sha256) VALUES ($1,$2,$3,$4,$5)
                ON CONFLICT (proposal_id,kind) DO NOTHING`,
        [randomUUID(), proposalId, kind, key, sha256],
      );
    }
    await appendAudit(client, {
      bookingId: proposal.booking_id,
      proposalId,
      type: "documents_generated",
      details: { contractSha256: rendered.contractHash },
    });
    const recipients = (
      await client.query(
        `SELECT email FROM proposal_signers WHERE proposal_id=$1 AND role='client'`,
        [proposalId],
      )
    ).rows;
    for (const recipient of recipients)
      await client.query(
        `INSERT INTO notification_jobs (id,kind,recipient,payload) VALUES ($1,'email',$2,$3::jsonb)`,
        [
          randomUUID(),
          recipient.email,
          JSON.stringify({
            proposalId,
            subject: "Your signed photography agreement is ready",
            text: "All signatures are complete. Your signed agreement and completion certificate are available in your secure client portal. The date is confirmed when the retainer is received.",
          }),
        ],
      );
  });
}
export async function getDocument(
  user: BookingActor,
  proposalId: string,
  kind: DocumentKind,
) {
  requireVerifiedActor(user);
  if (!pool) throw new BookingError("Booking documents are unavailable.", 503);
  if (!getDocumentReadiness().privateStorage)
    throw new BookingError("Private contract storage is not configured.", 503);
  if (kind !== "contract" && kind !== "certificate")
    throw new BookingError("Document not found.", 404);
  if (user.role !== "admin") {
    const allowed = await pool.query(
      `SELECT id FROM proposal_signers WHERE proposal_id=$1 AND user_id=$2`,
      [proposalId, user.id],
    );
    if (!allowed.rowCount)
      throw new BookingError(
        "This document belongs to a different client.",
        403,
      );
  }
  const document = (
    await pool.query(
      "SELECT * FROM documents WHERE proposal_id=$1 AND kind=$2",
      [proposalId, kind],
    )
  ).rows[0];
  if (!document)
    throw new BookingError(
      "Your document is being prepared. Please check back shortly.",
      409,
    );
  let buffer: Buffer;
  if (bucket()) {
    const result = await s3Client().send(
      new GetObjectCommand({ Bucket: bucket(), Key: document.storage_key }),
    );
    if (!result.Body)
      throw new BookingError("Document temporarily unavailable.", 503);
    buffer = Buffer.from(await result.Body.transformToByteArray());
  } else {
    if (process.env.NODE_ENV === "production")
      throw new BookingError(
        "Private contract storage is not configured.",
        503,
      );
    const root = path.resolve(
      process.env.DOCUMENTS_LOCAL_DIR || "data/booking-documents",
    );
    const file = path.resolve(root, document.storage_key);
    if (!file.startsWith(root + path.sep))
      throw new BookingError("Invalid document path.", 500);
    buffer = await readFile(file);
  }
  if (hash(buffer) !== document.sha256)
    throw new BookingError(
      "The document integrity check failed. Contact Nikki.",
      503,
    );
  return {
    buffer,
    contentType: "application/pdf",
    fileName: `nikki-dodge-${kind}-${proposalId}.pdf`,
    sha256: document.sha256,
  };
}
