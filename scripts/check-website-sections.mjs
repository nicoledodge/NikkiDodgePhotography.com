import assert from "node:assert/strict";
import { normalizeWebsiteContent, websitePages } from "../dist-server/shared/website.js";
import { copyWebsiteSection, duplicateWebsiteSection, effectiveWebsiteSections, getChangedWebsitePages, insertWebsiteSection, removeWebsiteSection } from "../dist-server/shared/websiteSections.js";

function freeze(value) {
    if (value && typeof value === "object") { Object.freeze(value); for (const item of Object.values(value)) freeze(item); }
    return value;
}
const section = {
    id: "custom-story", name: "Mountain story", kind: "hero", hidden: true, layout: "reversed", spacing: "generous", background: "#e9e0d7",
    fields: { title: "A real story", body: "Keep the wording", photo: "/assets/editorial/nikki.webp", alt: "Photograph description", button: "Inquire" },
    fieldStyles: { title: { color: "#6b4d63", align: "center", weight: "bold", size: "large" }, photo: { fit: "cover", ratio: "portrait", focalX: 12.34, focalY: 78.91 } },
    layoutSettings: { paddingTop: 48, paddingBottom: 96, columnSplit: 62, gap: 24 },
    links: { button: { href: "https://example.com/inquiry", newTab: true } },
};
const content = freeze(normalizeWebsiteContent({ pages: { home: [section], pricing: [{ id: "original-0", fields: { title: "Existing pricing" } }] } }));
const original = JSON.stringify(content);
const home = effectiveWebsiteSections(content, "home");
assert.equal(home.length, websitePages.home.sections.length + 1);
assert.equal(home[0].id, section.id);
assert.deepEqual(home.slice(1).map(item => item.id), websitePages.home.sections.map((_, index) => `original-${index}`));
home[0].fields.title = "Detached read";
home[0].fieldStyles.photo.focalX = 0;
assert.equal(JSON.stringify(content), original, "Effective sections must not expose mutable input references");

const duplicate = duplicateWebsiteSection(content, "home", section.id, "custom-duplicate");
assert.equal(duplicate.pages.home[1].id, "custom-duplicate");
assert.equal(duplicate.pages.home[1].name, "Mountain story copy");
assert.deepEqual({ ...duplicate.pages.home[1], id: section.id, name: section.name }, content.pages.home[0]);
assert.deepEqual(getChangedWebsitePages(content, duplicate), ["home"]);
assert.deepEqual(duplicate.pages.pricing, content.pages.pricing);
assert.notEqual(duplicate.pages.pricing[0], content.pages.pricing[0], "Unchanged pages are detached too");
duplicate.pages.home[1].fields.title = "Independent copy";
duplicate.pages.home[1].fieldStyles.photo.focalX = 90;
duplicate.pages.home[1].layoutSettings.gap = 88;
duplicate.pages.home[1].links.button.href = "/Contact";
assert.deepEqual(duplicate.pages.home[0], content.pages.home[0], "Editing a duplicate cannot change its source inside the returned document");
assert.equal(JSON.stringify(content), original);

const copied = copyWebsiteSection(content, "home", section.id, "pricing", "custom-copied");
assert.deepEqual(copied.pages.home, content.pages.home);
assert.equal(copied.pages.pricing.at(-1).id, "custom-copied");
assert.deepEqual({ ...copied.pages.pricing.at(-1), id: section.id, name: section.name }, content.pages.home[0]);
assert.deepEqual(getChangedWebsitePages(content, copied), ["pricing"]);
const copiedAgain = copyWebsiteSection(copied, "pricing", "custom-copied", "about", "custom-copied-again");
assert.equal(copiedAgain.pages.about.at(-1).name, "Mountain story copy");
const numberedCopy = duplicateWebsiteSection(copiedAgain, "about", "custom-copied-again", "custom-numbered-copy");
assert.equal(numberedCopy.pages.about.at(-1).name, "Mountain story copy 2");
const thirdCopy = copyWebsiteSection(numberedCopy, "about", "custom-numbered-copy", "about", "custom-third-copy");
assert.equal(thirdCopy.pages.about.at(-1).name, "Mountain story copy 3");
const collidingCase = duplicateWebsiteSection({ pages: { home: [section, { ...section, id: "custom-uppercase", name: "MOUNTAIN STORY COPY" }] } }, "home", section.id, "custom-case-copy");
assert.equal(collidingCase.pages.home[1].name, "Mountain story copy 2");
const implicitAbout = effectiveWebsiteSections(content, "about");
const copiedAbout = effectiveWebsiteSections(copiedAgain, "about");
assert.deepEqual(copiedAbout.slice(0, -1), implicitAbout, "Materializing implicit originals must not create false changes during undo/redo selection");
assert.equal(copiedAbout.find(item => JSON.stringify(item) !== JSON.stringify(implicitAbout.find(before => before.id === item.id)))?.id, "custom-copied-again", "Redo selects the newly restored copy rather than an unchanged original");
assert.deepEqual(effectiveWebsiteSections({ pages: { about: [{ id: "original-0", fields: {} }] } }, "about"), implicitAbout, "Explicit originals without editor names match implicit originals");
copiedAgain.pages.about.at(-1).fields.body = "Independent across pages";
assert.equal(copiedAgain.pages.pricing.at(-1).fields.body, "Keep the wording");
assert.equal(copied.pages.pricing.at(-1).fields.body, "Keep the wording");

const blank = freeze({ pages: {} });
const insertedTop = insertWebsiteSection(blank, "contact", { ...section, id: "custom-first" }, null);
assert.equal(insertedTop.pages.contact[0].id, "custom-first");
assert.deepEqual(insertedTop.pages.contact.slice(1).map(item => item.id), ["original-0", "original-1"]);
const insertedAfter = insertWebsiteSection(blank, "contact", { ...section, id: "custom-after" }, "original-0");
assert.deepEqual(insertedAfter.pages.contact.map(item => item.id), ["original-0", "custom-after", "original-1"]);
const removed = removeWebsiteSection(copied, "pricing", "custom-copied");
assert.equal(removed.pages.pricing.some(item => item.id === "custom-copied"), false);
assert.equal(effectiveWebsiteSections(removed, "pricing").length, websitePages.pricing.sections.length);
assert.equal(removed.pages.pricing[0].fields.title, "Existing pricing");
assert.deepEqual(removed.pages.home, copied.pages.home);
const longName = duplicateWebsiteSection({ pages: { home: [{ ...section, name: "N".repeat(100) }] } }, "home", section.id, "custom-long-name");
assert.equal(longName.pages.home[1].name.length, 100);
assert.ok(longName.pages.home[1].name.endsWith(" copy"));
const longNameAgain = duplicateWebsiteSection(longName, "home", "custom-long-name", "custom-long-name-again");
assert.equal(longNameAgain.pages.home[2].name.length, 100);
assert.ok(longNameAgain.pages.home[2].name.endsWith(" copy 2"));

const custom = index => ({ id: `custom-limit-${index}`, kind: "text", fields: { title: `Section ${index}` } });
const almostFull = { pages: { contact: Array.from({ length: 37 }, (_, index) => custom(index)), home: [section] } };
assert.equal(effectiveWebsiteSections(almostFull, "contact").length, 39);
const full = copyWebsiteSection(almostFull, "home", section.id, "contact", "custom-last-space");
assert.equal(full.pages.contact.length, 40);
const fullJson = JSON.stringify(full);
assert.throws(() => copyWebsiteSection(full, "home", section.id, "contact", "custom-no-space"), /40 sections/);
assert.throws(() => duplicateWebsiteSection(full, "contact", "custom-last-space", "custom-no-space"), /40 sections/);
assert.throws(() => insertWebsiteSection(full, "contact", { ...section, id: "custom-no-space" }, null), /40 sections/);
assert.equal(JSON.stringify(full), fullJson, "Failed capacity checks cannot mutate a draft");
assert.equal(removeWebsiteSection(full, "contact", "custom-last-space").pages.contact.length, 39);

for (const page of ["missing", "__proto__", "", null, undefined]) {
    assert.throws(() => effectiveWebsiteSections(content, page), /valid website page/);
    assert.throws(() => copyWebsiteSection(content, "home", section.id, page, "custom-target"), /valid website page/);
    assert.throws(() => copyWebsiteSection(content, page, section.id, "about", "custom-target"), /valid website page/);
}
for (const id of ["original-0", section.id, "custom-", "invalid id", "custom_bad", null, undefined]) {
    assert.throws(() => duplicateWebsiteSection(content, "home", section.id, id));
}
assert.throws(() => copyWebsiteSection(content, "home", "missing", "about", "custom-target"), /no longer/);
assert.throws(() => duplicateWebsiteSection(content, "home", "missing", "custom-target"), /no longer/);
assert.throws(() => removeWebsiteSection(content, "home", "missing"), /no longer/);
assert.throws(() => insertWebsiteSection(content, "home", { ...section, id: "custom-target" }, "missing"), /no longer/);
assert.throws(() => insertWebsiteSection(content, "home", { ...section, id: "custom-target" }, undefined), /no longer/);
assert.throws(() => copyWebsiteSection(content, "home", "original-0", "about", "custom-target"), /Only added sections/);
assert.throws(() => duplicateWebsiteSection(content, "home", "original-0", "custom-target"), /Only added sections/);
assert.throws(() => removeWebsiteSection(content, "home", "original-0"), /Only added sections/);
assert.throws(() => insertWebsiteSection(content, "home", { id: "original-0", fields: {} }, null), /Only added sections/);
assert.throws(() => insertWebsiteSection(content, "about", { ...section }, null), /already in use/);
assert.throws(() => insertWebsiteSection(content, "about", { ...section, id: "custom-unsafe", links: { button: { href: "javascript:alert(1)" } } }, null), /valid website link/);

for (const output of [duplicate, copied, copiedAgain, numberedCopy, thirdCopy, collidingCase, insertedTop, insertedAfter, removed, longName, longNameAgain, full]) {
    assert.deepEqual(normalizeWebsiteContent(output), output, "Each helper produces content accepted unchanged by the server schema");
    assert.deepEqual(normalizeWebsiteContent(JSON.parse(JSON.stringify(output))), output, "Serialized copies preserve fields, links, framing, and layout");
}
assert.deepEqual(getChangedWebsitePages(content, normalizeWebsiteContent(content)), []);
assert.equal(JSON.stringify(content), original, "All operations leave the input deeply unchanged");
console.log("Website sections verified: independent copies, preserved content/styles/links/framing, page navigation changes, insertion order, original section protection, invalid IDs/pages, effective section limits, and serialization round trips.");
