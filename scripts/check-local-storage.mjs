import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

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
try {
    await start();
    assert.equal((await (await request("/api/health")).json()).storage, "local");
    const login = await request("/api/auth/login", "POST", { username: "storage-check", password: "storage-check" });
    cookie = login.headers.get("set-cookie").split(";")[0];
    // Drafts, optimistic revision checks, publishing and rollback use one atomic document.
    assert.equal((await fetch(`${base}/api/admin/website`)).status, 401);
    const originalWebsite = await (await request("/api/admin/website")).json();
    assert.equal(originalWebsite.revision, 0);
    const websiteStyles = {
        title: { size: "display", color: "#6b4d63", align: "center", weight: "bold" },
        photo: { fit: "cover", position: "top", ratio: "portrait" },
    };
    const websiteContent = { pages: { home: [{ id: "custom-storage-check", name: "Verification", kind: "split", fields: { title: "Draft-only heading", body: "Isolated verification", photo: "/assets/editorial/nikki.webp" }, fieldStyles: { ...websiteStyles, body: {} } }] } };
    const savedWebsite = await (await request("/api/admin/website", "PUT", { revision: 0, action: "draft", content: websiteContent })).json();
    assert.equal(savedWebsite.revision, 1);
    assert.deepEqual(savedWebsite.draft.pages.home[0].fieldStyles, websiteStyles);
    assert.deepEqual((await (await request("/api/public/website")).json()).pages, {});
    const conflict = await fetch(`${base}/api/admin/website`, { method: "PUT", headers: { cookie, "Content-Type": "application/json" }, body: JSON.stringify({ revision: 0, action: "draft", content: websiteContent }) });
    assert.equal(conflict.status, 409);
    await request("/api/admin/website", "PUT", { revision: 1, action: "publish", content: websiteContent });
    const publishedWebsite = await (await request("/api/public/website")).json();
    assert.equal(publishedWebsite.pages.home[0].fields.title, "Draft-only heading");
    assert.deepEqual(publishedWebsite.pages.home[0].fieldStyles, websiteStyles);
    const racingSaves = await Promise.all([0, 1].map(() => fetch(`${base}/api/admin/website`, { method: "PUT", headers: { cookie, "Content-Type": "application/json" }, body: JSON.stringify({ revision: 2, action: "draft", content: websiteContent }) })));
    assert.deepEqual(racingSaves.map(response => response.status).sort(), [200, 409]);
    await request("/api/admin/website", "PUT", { revision: 3, action: "restore" });
    assert.deepEqual((await (await request("/api/public/website")).json()).pages, {});
    const unsafe = await fetch(`${base}/api/admin/website`, { method: "PUT", headers: { cookie, "Content-Type": "application/json" }, body: JSON.stringify({ revision: 4, action: "draft", content: { pages: { home: [{ id: "custom-unsafe", kind: "photo", fields: { photo: "javascript:alert(1)" } }] } } }) });
    assert.equal(unsafe.status, 400);
    // Styling remains a bounded set of choices, including across save and publish.
    const invalidStyles = [
        null, [], { title: [] }, { title: null }, { "invalid_field": { size: "small" } },
        { ["x".repeat(161)]: { size: "small" } }, { title: { size: "huge" } },
        { title: { color: "red" } }, { title: { color: "#fff" } }, { title: { align: "justify" } },
        { title: { weight: 900 } }, { photo: { fit: "stretch" } },
        { photo: { position: "100% 0%" } }, { photo: { ratio: "10000 / 1" } },
        { title: { fontSize: "500px" } }, { photo: { backgroundImage: "url(https://example.invalid)" } },
        Object.fromEntries(Array.from({ length: 1001 }, (_, index) => [`field-${index}`, { size: "small" }])),
    ];
    for (const fieldStyles of invalidStyles) {
        const response = await fetch(`${base}/api/admin/website`, { method: "PUT", headers: { cookie, "Content-Type": "application/json" }, body: JSON.stringify({ revision: 4, action: "draft", content: { pages: { home: [{ ...websiteContent.pages.home[0], fieldStyles }] } } }) });
        assert.equal(response.status, 400, `Invalid field style accepted: ${JSON.stringify(fieldStyles).slice(0, 100)}`);
    }
    const afterRejectedStyles = await (await request("/api/admin/website")).json();
    assert.equal(afterRejectedStyles.revision, 4);
    assert.deepEqual(afterRejectedStyles.draft.pages, {});
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
    assert.equal(restoredWebsite.revision, 4);
    assert.deepEqual(restoredWebsite.previousPublished.pages.home[0].fieldStyles, websiteStyles);
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
    console.log("Local storage verified: auth, CRM writes, website draft/publish/rollback/conflict protection, bounded text/photo styles, restart persistence, media upload/move/delete, and maintenance write hold.");
} finally {
    await stop();
    await rm(root, { recursive: true, force: true });
}
