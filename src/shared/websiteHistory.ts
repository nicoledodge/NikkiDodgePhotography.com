import { normalizeWebsiteContent, type WebsiteContent, type WebsiteDocument, type WebsiteVersion } from "./website.js";

export const WEBSITE_HISTORY_LIMIT = 30;
export const WEBSITE_HISTORY_BYTES = 8 * 1024 * 1024;
export const WEBSITE_DRAFT_CHECKPOINT_MS = 60_000;
const encoder = new TextEncoder();
const sameContent = (left: WebsiteContent, right: WebsiteContent) => JSON.stringify(left) === JSON.stringify(right);
const bytes = (value: unknown) => encoder.encode(JSON.stringify(value, null, 2)).byteLength;

/** Bound retained snapshots while keeping the most recent copy of the current publication. */
export function trimWebsiteHistory(history: WebsiteVersion[], published: WebsiteContent): WebsiteVersion[] {
    const publication = history.find(version => sameContent(version.content, published));
    const result: WebsiteVersion[] = [];
    let totalBytes = 2;
    const retain = (version: WebsiteVersion) => {
        const addedBytes = bytes([version]) - 2;
        if (result.length >= WEBSITE_HISTORY_LIMIT || totalBytes + addedBytes > WEBSITE_HISTORY_BYTES) return;
        result.push(version); totalBytes += addedBytes;
    };
    if (publication) retain(publication);
    for (const version of history) {
        if (version !== publication) retain(version);
    }
    const retained = new Set(result);
    return history.filter(version => retained.has(version));
}

/** Legacy documents are upgraded in memory only; reading does not create or rewrite a file. */
export function readWebsiteHistory(document: WebsiteDocument): WebsiteVersion[] {
    const history: WebsiteVersion[] = [];
    const ids = new Set<string>();
    for (const candidate of Array.isArray(document.history) ? document.history : []) {
        if (!candidate || typeof candidate !== "object" || typeof candidate.id !== "string" || !/^[a-zA-Z0-9-]{1,160}$/.test(candidate.id) || ids.has(candidate.id)
            || !Number.isSafeInteger(candidate.revision) || candidate.revision < 0 || candidate.revision > document.revision
            || typeof candidate.createdAt !== "string" || !Number.isFinite(Date.parse(candidate.createdAt))
            || !["draft", "publish", "restore"].includes(candidate.label)) continue;
        try {
            const content = normalizeWebsiteContent(candidate.content);
            history.push({ id: candidate.id, revision: candidate.revision, createdAt: candidate.createdAt, label: candidate.label, content });
            ids.add(candidate.id);
        } catch { /* An invalid historical record cannot become a recovery target. */ }
    }
    history.sort((left, right) => right.revision - left.revision || Date.parse(right.createdAt) - Date.parse(left.createdAt));
    return trimWebsiteHistory(history, document.published);
}

/** Capture checkpoints before replacing a draft, and explicit versions for publications. */
export function nextWebsiteHistory(document: WebsiteDocument, action: "draft" | "publish" | "restore" | "recover", content: WebsiteContent, now = Date.now()): WebsiteVersion[] {
    const history = readWebsiteHistory(document);
    const previous = normalizeWebsiteContent(document.draft);
    const published = normalizeWebsiteContent(document.published);
    const changed = !sameContent(previous, content);
    if (action === "draft" && !changed) return history;
    const checkpoint = history[0];
    const append = (snapshot: WebsiteContent, label: WebsiteVersion["label"], revision = document.revision, createdAt = new Date(now).toISOString()) => {
        history.unshift({ id: crypto.randomUUID(), revision, createdAt, label, content: snapshot });
    };
    // A legacy document can contain an unpublished draft with no history. Preserve both states.
    if (!history.some(version => sameContent(version.content, published)) && !sameContent(previous, published)) {
        append(published, "publish", document.revision, document.publishedAt || new Date(now).toISOString());
    }
    if (action === "draft") {
        // Keep the first checkpoint in a typing burst instead of replacing it with each autosave.
        if ((!checkpoint || now - Date.parse(checkpoint.createdAt) >= WEBSITE_DRAFT_CHECKPOINT_MS)
            && !history.some(version => sameContent(version.content, previous))) append(previous, "draft");
    } else {
        if (changed && (!history[0] || !sameContent(history[0].content, previous))) append(previous, "draft");
        if (action === "publish" || action === "restore") append(content, action, document.revision + 1);
    }
    history.sort((left, right) => right.revision - left.revision || Date.parse(right.createdAt) - Date.parse(left.createdAt));
    return trimWebsiteHistory(history, action === "publish" || action === "restore" ? content : published);
}
