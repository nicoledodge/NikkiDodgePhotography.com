import { normalizeWebsiteContent, websitePages, type WebsiteContent, type WebsitePage, type WebsiteSection } from "./website.js";

export const WEBSITE_SECTION_LIMIT = 40;

function requirePage(page: WebsitePage): void {
    if (typeof page !== "string" || !Object.prototype.hasOwnProperty.call(websitePages, page)) throw new Error("Choose a valid website page.");
}
function effective(content: WebsiteContent, page: WebsitePage): WebsiteSection[] {
    const configured = content.pages[page] || [];
    // Match saved originals exactly, so materializing a page does not make undo/redo
    // mistake its unchanged first section for the section that was actually edited.
    const original = normalizeWebsiteContent({ pages: { [page]: websitePages[page].sections.map((name, index) => ({ id: `original-${index}`, name, fields: {} })) } }).pages[page]!;
    return [...configured.map(section => ({ ...section, name: section.name ?? original.find(item => item.id === section.id)?.name })), ...original.filter(section => !configured.some(item => item.id === section.id))];
}
function requireCustom(section: WebsiteSection | undefined): asserts section is WebsiteSection & { kind: NonNullable<WebsiteSection["kind"]> } {
    if (!section) throw new Error("This section is no longer on this page.");
    if (!section.id.startsWith("custom-") || !section.kind) throw new Error("Only added sections can be copied or removed. Original sections can be hidden.");
}
function requireFreshId(content: WebsiteContent, id: string): void {
    if (typeof id !== "string" || !/^custom-[a-zA-Z0-9-]+$/.test(id)) throw new Error("Choose a new custom section ID.");
    if (Object.values(content.pages).some(sections => sections?.some(section => section.id === id))) throw new Error("This section ID is already in use.");
}
function withSections(content: WebsiteContent, page: WebsitePage, sections: WebsiteSection[]): WebsiteContent {
    if (sections.length > WEBSITE_SECTION_LIMIT) throw new Error("This page already has 40 sections. Remove an added section before adding another.");
    return normalizeWebsiteContent({ pages: { ...content.pages, [page]: sections } });
}
function copiedSection(section: WebsiteSection, id: string, target: WebsiteSection[]): WebsiteSection {
    const base = (section.name?.trim() || "Section").replace(/(?: copy(?: \d+)?)+$/i, "").trim() || "Section";
    const names = new Set(target.map(item => item.name?.trim().toLocaleLowerCase()));
    for (let index = 1; ; index++) {
        const suffix = index === 1 ? " copy" : ` copy ${index}`;
        const name = `${base.slice(0, 100 - suffix.length).trimEnd()}${suffix}`;
        if (!names.has(name.toLocaleLowerCase())) return { ...section, id, name };
    }
}

/** Includes originals that have no saved override. Every returned object is detached. */
export function effectiveWebsiteSections(content: WebsiteContent, page: WebsitePage): WebsiteSection[] {
    requirePage(page);
    return effective(normalizeWebsiteContent(content), page);
}

/** Insert after an existing section, or at the top when after is null. */
export function insertWebsiteSection(content: WebsiteContent, page: WebsitePage, section: WebsiteSection, after: string | null): WebsiteContent {
    requirePage(page);
    const next = normalizeWebsiteContent(content);
    requireCustom(section);
    requireFreshId(next, section.id);
    const sections = effective(next, page);
    const index = after === null ? -1 : sections.findIndex(item => item.id === after);
    if (after !== null && index < 0) throw new Error("The section you wanted to insert after is no longer on this page.");
    sections.splice(index + 1, 0, section);
    return withSections(next, page, sections);
}

export function duplicateWebsiteSection(content: WebsiteContent, page: WebsitePage, id: string, newId: string): WebsiteContent {
    requirePage(page);
    const next = normalizeWebsiteContent(content);
    const target = effective(next, page), section = target.find(item => item.id === id);
    requireCustom(section);
    return insertWebsiteSection(next, page, copiedSection(section, newId, target), id);
}

/** Copy to the end of the destination page without changing the source page. */
export function copyWebsiteSection(content: WebsiteContent, sourcePage: WebsitePage, id: string, targetPage: WebsitePage, newId: string): WebsiteContent {
    requirePage(sourcePage); requirePage(targetPage);
    const next = normalizeWebsiteContent(content);
    const section = effective(next, sourcePage).find(item => item.id === id);
    requireCustom(section);
    const target = effective(next, targetPage);
    return insertWebsiteSection(next, targetPage, copiedSection(section, newId, target), target[target.length - 1]?.id ?? null);
}

export function removeWebsiteSection(content: WebsiteContent, page: WebsitePage, id: string): WebsiteContent {
    requirePage(page);
    const next = normalizeWebsiteContent(content);
    const sections = effective(next, page), section = sections.find(item => item.id === id);
    requireCustom(section);
    return withSections(next, page, sections.filter(item => item.id !== id));
}

/** Compare saved page state, including field styles and links, for undo/redo navigation. */
export function getChangedWebsitePages(before: WebsiteContent, after: WebsiteContent): WebsitePage[] {
    const previous = normalizeWebsiteContent(before), next = normalizeWebsiteContent(after);
    return (Object.keys(websitePages) as WebsitePage[]).filter(page => JSON.stringify(previous.pages[page]) !== JSON.stringify(next.pages[page]));
}
