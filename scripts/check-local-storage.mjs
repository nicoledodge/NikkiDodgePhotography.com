import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { normalizeWebsiteContent } from "../dist-server/shared/website.js";
import { nextWebsiteHistory, readWebsiteHistory, WEBSITE_HISTORY_BYTES, WEBSITE_HISTORY_LIMIT } from "../dist-server/shared/websiteHistory.js";
import { websiteChanges } from "../dist-server/shared/websiteChanges.js";

const root = await mkdtemp(join(tmpdir(), "nikki-storage-check-"));
const port = 18000 + Math.floor(Math.random() * 10000);
const base = `http://127.0.0.1:${port}`;
let child;
let cookie;
async function start(readOnly = false) {
    child = spawn(process.execPath, ["dist-server/server.js"], {
        env: { ...process.env, PORT: String(port), NODE_ENV: "test", CRM_S3_BUCKET: "", APP_S3_BUCKET: "",
            CRM_LOCAL_STORAGE_ROOT: root, CRM_PUBLIC_ASSET_BASE_URL: "", CRM_S3_MEDIA_PREFIX: "",
            CRM_STORAGE_READ_ONLY: String(readOnly), ADMIN_USERNAME: "storage-check",
            CRM_MAX_SERVER_UPLOAD_BYTES: String(25 * 1024 * 1024),
            ADMIN_PASSWORD: "storage-check", ADMIN_SESSION_SECRET: "isolated-storage-check",
            DISCORD_WEBHOOK_URL: "" },
        stdio: ["ignore", "ignore", "pipe"],
    });
    for (let i = 0; i < 100; i++) {
        try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {}
        if (child.exitCode !== null) throw new Error(`Server exited: ${child.exitCode}`);
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    throw new Error("Local server did not become healthy");
}
async function stop() {
    if (!child || child.exitCode !== null) return;
    const done = once(child, "exit");
    child.kill("SIGTERM");
    await done;
}
async function request(path, method = "GET", body) {
    const response = await fetch(base + path, {
        method, headers: { ...(cookie ? { cookie } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
        body: body ? JSON.stringify(body) : undefined,
    });
    assert.ok(response.ok, `${method} ${path}: ${response.status}`);
    return response;
}
// Deterministic clocks verify autosave coalescing without a minute-long integration wait.
function verifyHistoryCheckpoints() {
    const empty = { pages: {} };
    const content = title => normalizeWebsiteContent({ pages: { home: [{ id: "custom-history-check", kind: "text", fields: { title } }] } });
    const now = Date.parse("2030-01-01T00:00:00Z");
    let document = { revision: 0, draft: empty, published: empty };
    const save = (title, at) => {
        const next = content(title);
        document = { ...document, revision: document.revision + 1, draft: next, history: nextWebsiteHistory(document, "draft", next, at) };
    };
    save("First idea", now);
    const first = document.history[0];
    assert.deepEqual(first.content, empty);
    save("Second idea", now + 30_000);
    assert.deepEqual(document.history, [first], "Autosave must keep the pre-edit checkpoint instead of replacing it");
    save("Third idea", now + 61_000);
    assert.equal(document.history.length, 2);
    assert.equal(document.history[0].content.pages.home[0].fields.title, "Second idea");
    assert.deepEqual(nextWebsiteHistory(document, "draft", document.draft, now + 90_000), document.history, "Unchanged saves must not duplicate history");
    assert.ok(document.history.some(version => version.id === first.id), "The original publication remains recoverable");

    const versions = Array.from({ length: 40 }, (_, index) => ({ id: `version-${index}`, revision: index, createdAt: new Date(now + index * 61_000).toISOString(), label: index ? "draft" : "publish", content: content(`Version ${index}`) })).reverse();
    const capped = readWebsiteHistory({ revision: 40, draft: content("Current"), published: content("Version 0"), history: versions });
    assert.equal(capped.length, WEBSITE_HISTORY_LIMIT);
    assert.equal(capped[0].id, "version-39");
    assert.ok(capped.some(version => version.id === "version-0"), "The latest publication survives draft checkpoint trimming");

    const large = Array.from({ length: 30 }, (_, index) => ({ ...versions[0], id: `large-${index}`, revision: index, content: normalizeWebsiteContent({ pages: { home: [{ id: "custom-large", kind: "text", fields: { title: String(index), ...Object.fromEntries(Array.from({ length: 20 }, (_, field) => [`field-${field}`, "λ".repeat(12000)])) } }] } }) })).reverse();
    const bounded = readWebsiteHistory({ revision: 40, draft: content("Current"), published: large[large.length - 1].content, history: large });
    assert.ok(bounded.length < large.length, "The byte budget must trim history before its count limit");
    assert.ok(Buffer.byteLength(JSON.stringify(bounded, null, 2)) <= WEBSITE_HISTORY_BYTES);
    assert.equal(bounded[0].id, "large-29");
    assert.ok(bounded.some(version => version.id === "large-0"));
}
try {
    verifyHistoryCheckpoints();
    const review = websiteChanges({ pages: { home: [{ id: "original-0", fields: { title: "New title", "0.image": "/assets/editorial/nikki.webp" }, links: { "0.link": { href: "/Contact" } }, layoutSettings: { paddingTop: 40 } }, { id: "custom-new", kind: "text", fields: { title: "New section" } }] } }, { pages: { home: [{ id: "custom-removed", kind: "text", fields: { title: "Removed section" } }] } });
    assert.equal(review.length, 1);
    assert.equal(review[0].page, "home");
    assert.equal(review[0].reordered, false, "Adding or removing a section does not imply that unchanged sections were moved");
    assert.equal(review[0].sections.length, 3, "Implicit original sections must not be counted as new sections");
    assert.deepEqual(review[0].sections.find(section => section.id === "original-0"), { id: "original-0", name: "Introduction", added: false, removed: false, text: 1, photos: 1, links: 1, design: true, renamed: false, moved: false });
    assert.equal(review[0].sections.find(section => section.id === "custom-new").added, true);
    assert.equal(review[0].sections.find(section => section.id === "custom-removed").removed, true);
    assert.deepEqual(websiteChanges({ pages: {} }, { pages: {} }), []);
    await start();
    assert.equal((await (await request("/api/health")).json()).storage, "local");
    const login = await request("/api/auth/login", "POST", { username: "storage-check", password: "storage-check" });
    cookie = login.headers.get("set-cookie").split(";")[0];
    // Drafts, optimistic revision checks, publishing and rollback use one atomic document.
    assert.equal((await fetch(`${base}/api/admin/website`)).status, 401);
    const originalWebsite = await (await request("/api/admin/website")).json();
    assert.equal(originalWebsite.revision, 0);
    assert.deepEqual(originalWebsite.history, []);
    await assert.rejects(stat(join(root, "app-data/website.json")), { code: "ENOENT" });
    const websiteStyles = {
        title: { size: "display", color: "#6b4d63", align: "center", weight: "bold" },
        photo: { fit: "cover", position: "top", ratio: "portrait", focalX: 12.35, focalY: 0 },
    };
    const websiteLinks = { primary: { href: "/Contact" }, fragment: { href: "#inquiry" }, external: { href: "https://example.com/portfolio", newTab: true }, email: { href: "mailto:studio@example.com" }, phone: { href: "tel:+13035550100" } };
    const websiteContent = { pages: { home: [{ id: "custom-storage-check", name: "Verification", kind: "split", fields: { title: "Draft-only heading", body: "Isolated verification", photo: "/assets/editorial/nikki.webp" }, fieldStyles: { ...websiteStyles, photo: { ...websiteStyles.photo, focalX: 12.345 }, body: {} }, links: websiteLinks }] } };
    const savedWebsite = await (await request("/api/admin/website", "PUT", { revision: 0, action: "draft", content: websiteContent })).json();
    assert.equal(savedWebsite.revision, 1);
    assert.equal(savedWebsite.history.length, 1);
    assert.deepEqual(savedWebsite.history[0].content.pages, {});
    const baselineVersionId = savedWebsite.history[0].id;
    assert.deepEqual(savedWebsite.draft.pages.home[0].fieldStyles, websiteStyles);
    assert.deepEqual(savedWebsite.draft.pages.home[0].links, websiteLinks);
    assert.deepEqual((await (await request("/api/public/website")).json()).pages, {});
    const conflict = await fetch(`${base}/api/admin/website`, { method: "PUT", headers: { cookie, "Content-Type": "application/json" }, body: JSON.stringify({ revision: 0, action: "draft", content: websiteContent }) });
    assert.equal(conflict.status, 409);
    await request("/api/admin/website", "PUT", { revision: 1, action: "publish", content: websiteContent });
    const publishedWebsite = await (await request("/api/public/website")).json();
    assert.equal(publishedWebsite.pages.home[0].fields.title, "Draft-only heading");
    assert.deepEqual(publishedWebsite.pages.home[0].fieldStyles, websiteStyles);
    assert.deepEqual(publishedWebsite.pages.home[0].links, websiteLinks);
    const racingSaves = await Promise.all([0, 1].map(() => fetch(`${base}/api/admin/website`, { method: "PUT", headers: { cookie, "Content-Type": "application/json" }, body: JSON.stringify({ revision: 2, action: "draft", content: websiteContent }) })));
    assert.deepEqual(racingSaves.map(response => response.status).sort(), [200, 409]);
    await request("/api/admin/website", "PUT", { revision: 3, action: "restore" });
    assert.deepEqual((await (await request("/api/public/website")).json()).pages, {});
    const unsafe = await fetch(`${base}/api/admin/website`, { method: "PUT", headers: { cookie, "Content-Type": "application/json" }, body: JSON.stringify({ revision: 4, action: "draft", content: { pages: { home: [{ id: "custom-unsafe", kind: "photo", fields: { photo: "javascript:alert(1)" } }] } } }) });
    assert.equal(unsafe.status, 400);
    // Styling remains a bounded set of choices, including across save and publish.
    const beforeInvalidStyles = await readFile(join(root, "app-data/website.json"));
    const invalidStyles = [
        null, [], { title: [] }, { title: null }, { "invalid_field": { size: "small" } },
        { ["x".repeat(161)]: { size: "small" } }, { title: { size: "huge" } },
        { title: { color: "red" } }, { title: { color: "#fff" } }, { title: { align: "justify" } },
        { title: { weight: 900 } }, { photo: { fit: "stretch" } },
        { photo: { position: "100% 0%" } }, { photo: { ratio: "10000 / 1" } },
        { title: { fontSize: "500px" } }, { photo: { backgroundImage: "url(https://example.invalid)" } },
        { photo: { focalX: -1 } }, { photo: { focalY: 100.01 } }, { photo: { focalX: "50" } }, { photo: { focalY: null } }, { photo: { focalX: Infinity } },
        Object.fromEntries(Array.from({ length: 1001 }, (_, index) => [`field-${index}`, { size: "small" }])),
    ];
    for (const fieldStyles of invalidStyles) {
        const response = await fetch(`${base}/api/admin/website`, { method: "PUT", headers: { cookie, "Content-Type": "application/json" }, body: JSON.stringify({ revision: 4, action: "draft", content: { pages: { home: [{ ...websiteContent.pages.home[0], fieldStyles }] } } }) });
        assert.equal(response.status, 400, `Invalid field style accepted: ${JSON.stringify(fieldStyles).slice(0, 100)}`);
    }
    for (const links of [null, [], { primary: null }, { primary: [] }, { primary: { href: "/Contact", newTab: "yes" } }, { primary: { href: "/Contact", onclick: "alert(1)" } }, { "invalid_key": { href: "/Contact" } }, ...["javascript:alert(1)", "data:text/html,example", "//example.com", "/\\example.com", "https://user:password@example.com", "https://example.com/\n", "mailto:studio@example.com%0aBcc:other@example.com", "http://example.com", "tel:alert(1)"].map(href => ({ primary: { href } }))]) {
        const response = await fetch(`${base}/api/admin/website`, { method: "PUT", headers: { cookie, "Content-Type": "application/json" }, body: JSON.stringify({ revision: 4, action: "draft", content: { pages: { home: [{ ...websiteContent.pages.home[0], links }] } } }) });
        assert.equal(response.status, 400, `Invalid link accepted: ${JSON.stringify(links)}`);
    }
    assert.deepEqual(await readFile(join(root, "app-data/website.json")), beforeInvalidStyles, "Invalid links and focal values cannot modify the saved document");
    const afterRejectedStyles = await (await request("/api/admin/website")).json();
    assert.equal(afterRejectedStyles.revision, 4);
    assert.deepEqual(afterRejectedStyles.draft.pages, {});
    // Recovery changes private drafts, including page-only recovery and removal of absent overrides.
    const publishedVersion = afterRejectedStyles.history.find(version => version.label === "publish" && version.revision === 2);
    assert.ok(publishedVersion);
    let historyDocument = await (await request("/api/admin/website", "PUT", { revision: 4, action: "recover", versionId: publishedVersion.id })).json();
    assert.equal(historyDocument.draft.pages.home[0].fields.title, "Draft-only heading");
    assert.deepEqual(historyDocument.published, afterRejectedStyles.published);
    assert.deepEqual(historyDocument.previousPublished, afterRejectedStyles.previousPublished);
    assert.equal(historyDocument.publishedAt, afterRejectedStyles.publishedAt);
    const multiPage = { pages: { ...historyDocument.draft.pages, about: [{ id: "custom-about", kind: "text", fields: { title: "Keep this page" } }] } };
    const unsavedMultiPage = { pages: { ...multiPage.pages, home: [{ ...multiPage.pages.home[0], fields: { ...multiPage.pages.home[0].fields, title: "Unsaved home edit" } }] } };
    historyDocument = await (await request("/api/admin/website", "PUT", { revision: historyDocument.revision, action: "recover", versionId: publishedVersion.id, page: "home", content: unsavedMultiPage })).json();
    assert.equal(historyDocument.draft.pages.about[0].fields.title, "Keep this page");
    assert.equal(historyDocument.draft.pages.home[0].fields.title, "Draft-only heading");
    assert.ok(historyDocument.history.some(version => JSON.stringify(version.content) === JSON.stringify(normalizeWebsiteContent(unsavedMultiPage))), "Recovery atomically checkpoints unsaved changes without a separate draft save");
    const beforeRecovery = historyDocument.draft;
    historyDocument = await (await request("/api/admin/website", "PUT", { revision: historyDocument.revision, action: "recover", versionId: baselineVersionId, page: "about" })).json();
    assert.equal(historyDocument.draft.pages.about, undefined);
    assert.equal(historyDocument.draft.pages.home[0].fields.title, "Draft-only heading");
    assert.ok(historyDocument.history.some(version => JSON.stringify(version.content) === JSON.stringify(beforeRecovery)), "Recovery must preserve the draft it replaces");
    assert.deepEqual((await (await request("/api/public/website")).json()).pages, {});
    const beforeNoOp = historyDocument.history;
    historyDocument = await (await request("/api/admin/website", "PUT", { revision: historyDocument.revision, action: "draft", content: historyDocument.draft })).json();
    assert.deepEqual(historyDocument.history, beforeNoOp);
    const unchangedFile = await readFile(join(root, "app-data/website.json"));
    for (const [payload, status] of [[{ versionId: "not-a-version" }, 404], [{ versionId: publishedVersion.id, page: "not-a-page" }, 400], [{ versionId: publishedVersion.id, content: { pages: { home: [{ id: "custom-unsafe-recovery", kind: "photo", fields: { photo: "javascript:alert(1)" } }] } } }, 400]]) {
        const response = await fetch(`${base}/api/admin/website`, { method: "PUT", headers: { cookie, "Content-Type": "application/json" }, body: JSON.stringify({ revision: historyDocument.revision, action: "recover", ...payload }) });
        assert.equal(response.status, status);
        assert.deepEqual(await readFile(join(root, "app-data/website.json")), unchangedFile);
    }
    const racingRecoveries = await Promise.all([0, 1].map(() => fetch(`${base}/api/admin/website`, { method: "PUT", headers: { cookie, "Content-Type": "application/json" }, body: JSON.stringify({ revision: historyDocument.revision, action: "recover", versionId: baselineVersionId }) })));
    assert.deepEqual(racingRecoveries.map(response => response.status).sort(), [200, 409]);
    historyDocument = await (await request("/api/admin/website")).json();
    assert.deepEqual(historyDocument.draft.pages, {});
    assert.deepEqual(historyDocument.published.pages, {});

    // A ready page can go live without publishing another page's unfinished draft.
    const pageSection = (id, title) => ({ id, kind: "text", fields: { title } });
    const persistedContent = content => JSON.parse(JSON.stringify(normalizeWebsiteContent(content)));
    const livePages = { pages: { home: [pageSection("custom-ready-home", "Current home")], pricing: [pageSection("custom-pricing", "Current pricing")] } };
    historyDocument = await (await request("/api/admin/website", "PUT", { revision: historyDocument.revision, action: "publish", content: livePages })).json();
    const readyHomeDraft = { pages: { home: [pageSection("custom-ready-home", "Ready home")], pricing: [pageSection("custom-pricing", "Unfinished pricing")] } };
    const beforeSelectedPublish = historyDocument;
    const selectedPublish = { revision: historyDocument.revision, action: "publish", content: readyHomeDraft, pages: ["home"] };
    const beforeInvalidPublish = await readFile(join(root, "app-data/website.json"));
    for (const pages of [null, [], "home", ["home", "home"], ["unknown"], ["__proto__"], ["home", 1]]) {
        const response = await fetch(`${base}/api/admin/website`, { method: "PUT", headers: { cookie, "Content-Type": "application/json" }, body: JSON.stringify({ ...selectedPublish, pages }) });
        assert.equal(response.status, 400, `Invalid publish selection accepted: ${JSON.stringify(pages)}`);
        assert.deepEqual(await readFile(join(root, "app-data/website.json")), beforeInvalidPublish);
    }
    const publishRace = await Promise.all([0, 1].map(() => fetch(`${base}/api/admin/website`, { method: "PUT", headers: { cookie, "Content-Type": "application/json" }, body: JSON.stringify(selectedPublish) })));
    assert.deepEqual(publishRace.map(response => response.status).sort(), [200, 409]);
    historyDocument = await (await request("/api/admin/website")).json();
    assert.deepEqual(historyDocument.draft, persistedContent(readyHomeDraft));
    assert.equal(historyDocument.published.pages.home[0].fields.title, "Ready home");
    assert.equal(historyDocument.published.pages.pricing[0].fields.title, "Current pricing");
    assert.deepEqual(historyDocument.previousPublished, beforeSelectedPublish.published);
    assert.deepEqual(historyDocument.history[0].content, historyDocument.published, "A publication snapshot contains the live site, not unfinished private pages");
    assert.deepEqual(await (await request("/api/public/website")).json(), historyDocument.published);
    const selectedPublication = historyDocument.published;
    historyDocument = await (await request("/api/admin/website", "PUT", { revision: historyDocument.revision, action: "restore" })).json();
    assert.deepEqual(historyDocument.published, beforeSelectedPublish.published);
    assert.deepEqual(historyDocument.previousPublished, selectedPublication);
    assert.ok(historyDocument.history.some(version => JSON.stringify(version.content) === JSON.stringify(normalizeWebsiteContent(readyHomeDraft))), "Restoring a publication preserves the unfinished draft in history");
    historyDocument = await (await request("/api/admin/website", "PUT", { revision: historyDocument.revision, action: "publish", content: readyHomeDraft })).json();
    assert.deepEqual(historyDocument.published, persistedContent(readyHomeDraft), "Omitting pages still publishes the entire draft");
    const resetHomeDraft = { pages: { pricing: readyHomeDraft.pages.pricing } };
    historyDocument = await (await request("/api/admin/website", "PUT", { revision: historyDocument.revision, action: "publish", content: resetHomeDraft, pages: ["home"] })).json();
    assert.equal(historyDocument.published.pages.home, undefined, "Publishing an absent page override restores the original page");
    assert.deepEqual(historyDocument.published.pages.pricing, persistedContent(readyHomeDraft).pages.pricing);
    assert.deepEqual(historyDocument.draft, persistedContent(resetHomeDraft));

    // Section presets and bounded layout controls survive persistence and reject invalid values.
    const presetContent = { pages: { home: ["hero", "gallery", "faq", "packages"].map(kind => ({ id: `custom-${kind}`, kind, fields: { title: kind, "photo-1": "/assets/editorial/nikki.webp" }, layoutSettings: { paddingTop: 0, paddingBottom: 240, columnSplit: 75, gap: 96 } })) } };
    historyDocument = await (await request("/api/admin/website", "PUT", { revision: historyDocument.revision, action: "draft", content: presetContent })).json();
    assert.deepEqual(historyDocument.draft.pages.home.map(section => section.kind), ["hero", "gallery", "faq", "packages"]);
    assert.deepEqual(historyDocument.draft.pages.home[0].layoutSettings, presetContent.pages.home[0].layoutSettings);
    for (const layoutSettings of [null, [], { gap: -1 }, { paddingTop: 241 }, { columnSplit: 24 }, { gap: "12" }, { position: "absolute" }]) {
        const response = await fetch(`${base}/api/admin/website`, { method: "PUT", headers: { cookie, "Content-Type": "application/json" }, body: JSON.stringify({ revision: historyDocument.revision, action: "draft", content: { pages: { home: [{ ...presetContent.pages.home[0], layoutSettings }] } } }) });
        assert.equal(response.status, 400);
    }
    const unsafeGallery = await fetch(`${base}/api/admin/website`, { method: "PUT", headers: { cookie, "Content-Type": "application/json" }, body: JSON.stringify({ revision: historyDocument.revision, action: "draft", content: { pages: { home: [{ ...presetContent.pages.home[1], fields: { "photo-6": "https://example.invalid/private.jpg" } }] } } }) });
    assert.equal(unsafeGallery.status, 400);
    for (let index = 0; index < 32; index++) {
        const content = { pages: { home: [{ ...websiteContent.pages.home[0], fields: { ...websiteContent.pages.home[0].fields, title: `Publication ${index}` } }] } };
        historyDocument = await (await request("/api/admin/website", "PUT", { revision: historyDocument.revision, action: "publish", content })).json();
    }
    assert.equal(historyDocument.history.length, WEBSITE_HISTORY_LIMIT);
    assert.equal(historyDocument.history[0].label, "publish");
    assert.equal(historyDocument.history[0].revision, historyDocument.revision);
    // Recover the oldest retained version while atomically preserving unsaved edits. A separate
    // save here would evict that version before it could be recovered.
    const oldestVersion = historyDocument.history.at(-1);
    const unsavedAtLimit = { pages: { home: [{ ...websiteContent.pages.home[0], fields: { ...websiteContent.pages.home[0].fields, title: "Unsaved at the history limit" } }] } };
    const beforeAtomicRecovery = historyDocument;
    historyDocument = await (await request("/api/admin/website", "PUT", { revision: historyDocument.revision, action: "recover", versionId: oldestVersion.id, content: unsavedAtLimit })).json();
    assert.deepEqual(historyDocument.draft, oldestVersion.content);
    assert.deepEqual(historyDocument.published, beforeAtomicRecovery.published);
    assert.deepEqual(historyDocument.previousPublished, beforeAtomicRecovery.previousPublished);
    assert.equal(historyDocument.revision, beforeAtomicRecovery.revision + 1);
    assert.equal(historyDocument.history.length, WEBSITE_HISTORY_LIMIT);
    assert.ok(historyDocument.history.some(version => version.content.pages.home?.[0].fields.title === "Unsaved at the history limit"));
    const expectedWebsite = historyDocument;
    const settings = await (await request("/api/admin/settings")).json();
    const marker = `Storage check ${randomUUID()}`;
    await request("/api/admin/settings", "PUT", { ...settings, heroTitle: marker });
    await request("/api/public/inquiries", "POST", {
        name: "Storage verification", telephone: "0000000000", email: "storage-check@example.invalid", message: marker,
    });
    const calendar = await (await request("/api/admin/calendar", "POST", {
        title: marker, start: "2030-01-01T12:00:00Z", end: "2030-01-01T13:00:00Z", status: "tentative",
    })).json();
    const folder = `verification-${randomUUID()}`;
    const form = new FormData();
    const payload = Buffer.from("isolated website media verification");
    form.set("prefix", folder);
    form.set("file", new Blob([payload], { type: "text/plain" }), "check.txt");
    const uploaded = await fetch(`${base}/api/admin/media/upload`, { method: "POST", headers: { cookie }, body: form });
    assert.equal(uploaded.status, 201);
    const media = await uploaded.json();
    assert.deepEqual(Buffer.from(await (await fetch(base + media.publicUrl)).arrayBuffer()), payload);
    const moved = await (await request("/api/admin/media/move", "POST", { key: media.key, prefix: `${folder}/moved` })).json();
    assert.deepEqual(Buffer.from(await (await fetch(base + moved.publicUrl)).arrayBuffer()), payload);
    const bulkPayload = new Blob([Buffer.alloc(8 * 1024 * 1024, 0x5a)], { type: "application/octet-stream" });
    const bulkItems = await Promise.all(Array.from({ length: 4 }, async (_, index) => {
        const body = new FormData();
        body.set("file", bulkPayload, `parallel-${index}.bin`);
        body.set("prefix", `${folder}/bulk`);
        const response = await fetch(`${base}/api/admin/media/upload`, { method: "POST", headers: { cookie }, body });
        assert.equal(response.status, 201);
        return response.json();
    }));
    for (const item of bulkItems) {
        assert.equal((await stat(join(root, "media", item.key))).size, bulkPayload.size);
        await request(`/api/admin/media?key=${encodeURIComponent(item.key)}`, "DELETE");
    }
    for (const extraByte of [0, 1]) {
        const body = new FormData();
        body.set("file", new Blob([Buffer.alloc(25 * 1024 * 1024 + extraByte)]), "boundary.bin");
        body.set("prefix", `${folder}/boundary`);
        const response = await fetch(`${base}/api/admin/media/upload`, { method: "POST", headers: { cookie }, body });
        assert.equal(response.status, extraByte ? 400 : 201);
        if (!extraByte) {
            const item = await response.json();
            await request(`/api/admin/media?key=${encodeURIComponent(item.key)}`, "DELETE");
        }
    }
    assert.deepEqual(await readdir(join(root, "upload-staging")), []);
    await stop();
    await start();
    const restoredWebsite = await (await request("/api/admin/website")).json();
    assert.deepEqual(restoredWebsite, expectedWebsite);
    assert.deepEqual(restoredWebsite.previousPublished.pages.home[0].fieldStyles, websiteStyles);
    assert.deepEqual(restoredWebsite.previousPublished.pages.home[0].links, websiteLinks);
    assert.equal((await (await request("/api/public/settings")).json()).heroTitle, marker);
    assert.equal((await (await request("/api/admin/leads")).json()).length, 1);
    assert.equal(JSON.parse(await readFile(join(root, "app-data/settings.json"), "utf8")).heroTitle, marker);
    await request(`/api/admin/media?key=${encodeURIComponent(moved.key)}`, "DELETE");
    await request(`/api/admin/calendar/${calendar.id}`, "DELETE");
    assert.equal((await fetch(base + moved.publicUrl)).status, 404);
    await stop();
    await start(true);
    const blocked = await fetch(`${base}/api/public/inquiries`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    assert.equal(blocked.status, 503);
    assert.equal(blocked.headers.get("retry-after"), "60");
    assert.equal((await request("/api/public/settings")).status, 200);
    const blockedRecovery = await fetch(`${base}/api/admin/website`, { method: "PUT", headers: { cookie, "Content-Type": "application/json" }, body: JSON.stringify({ revision: expectedWebsite.revision, action: "recover", versionId: expectedWebsite.history[0].id }) });
    assert.equal(blockedRecovery.status, 503);
    console.log("Local storage verified: auth, CRM writes, selected-page/whole-site publishing, draft/rollback/conflict protection, private page/version recovery, coalesced bounded history, section presets/layout validation, bounded text/photo styles, restart persistence, media upload/move/delete, and maintenance write hold.");
} finally {
    await stop();
    await rm(root, { recursive: true, force: true });
}
