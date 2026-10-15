import { normalizeWebsiteContent, websitePages, type WebsiteContent, type WebsitePage, type WebsiteSection } from "./website.js";

export interface WebsiteSectionChange {
    id: string;
    name: string;
    added: boolean;
    removed: boolean;
    text: number;
    photos: number;
    links: number;
    design: boolean;
    renamed: boolean;
    visibility?: "shown" | "hidden";
    moved: boolean;
}
export interface WebsitePageChange { page: WebsitePage; sections: WebsiteSectionChange[]; reordered: boolean }
function stable(value: unknown): string {
    if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
    if (value && typeof value === "object") return `{${Object.entries(value).filter(([, item]) => item !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
    return JSON.stringify(value);
}
function completeSections(content: WebsiteContent, page: WebsitePage): WebsiteSection[] {
    const configured = content.pages[page] || [];
    return [...configured, ...websitePages[page].sections.map((name, index) => ({ id: `original-${index}`, name, fields: {} })).filter(section => !configured.some(item => item.id === section.id))];
}
function sectionName(section: WebsiteSection, page: WebsitePage): string {
    const original = section.id.startsWith("original-") ? websitePages[page].sections[Number(section.id.slice(9))] : undefined;
    return section.name || original || ({ text: "Text section", photo: "Photograph", split: "Photo and story", invitation: "Invitation", hero: "Hero", gallery: "Photo gallery", faq: "Questions and answers", packages: "Collections" }[section.kind || "text"]);
}
function design(section: WebsiteSection) {
    return { kind: section.kind, layout: section.layout || "original", spacing: section.spacing || "original", background: section.background,
        fieldStyles: section.fieldStyles || {}, layoutSettings: section.layoutSettings || {} };
}

/** Summarize overrides without counting implicit original sections as newly added content. */
export function websiteChanges(draftInput: WebsiteContent, publishedInput: WebsiteContent): WebsitePageChange[] {
    const draft = normalizeWebsiteContent(draftInput), published = normalizeWebsiteContent(publishedInput);
    return (Object.keys(websitePages) as WebsitePage[]).flatMap(page => {
        if (stable(draft.pages[page]) === stable(published.pages[page])) return [];
        const before = completeSections(published, page), after = completeSections(draft, page);
        const beforeMap = new Map(before.map(section => [section.id, section])), afterMap = new Map(after.map(section => [section.id, section]));
        const beforeCommon = before.filter(section => afterMap.has(section.id)).map(section => section.id);
        const afterCommon = after.filter(section => beforeMap.has(section.id)).map(section => section.id);
        const reordered = stable(beforeCommon) !== stable(afterCommon);
        const sections = [...after, ...before.filter(section => !afterMap.has(section.id))].flatMap(section => {
            const previous = beforeMap.get(section.id), next = afterMap.get(section.id);
            const change: WebsiteSectionChange = { id: section.id, name: sectionName(section, page), added: !previous, removed: !next, text: 0, photos: 0, links: 0, design: false, renamed: false, moved: false };
            if (previous && next) {
                for (const field of new Set([...Object.keys(previous.fields), ...Object.keys(next.fields)])) {
                    if (previous.fields[field] === next.fields[field]) continue;
                    if (field.endsWith(".image") || /^photo(?:-[1-6])?$/.test(field)) change.photos++;
                    else change.text++;
                }
                for (const link of new Set([...Object.keys(previous.links || {}), ...Object.keys(next.links || {})])) {
                    if (stable(previous.links?.[link]) !== stable(next.links?.[link])) change.links++;
                }
                change.design = stable(design(previous)) !== stable(design(next));
                change.renamed = sectionName(previous, page) !== sectionName(next, page);
                if (!!previous.hidden !== !!next.hidden) change.visibility = next.hidden ? "hidden" : "shown";
                change.moved = reordered && beforeCommon.indexOf(section.id) !== afterCommon.indexOf(section.id);
            }
            return change.added || change.removed || change.text || change.photos || change.links || change.design || change.renamed || change.visibility || change.moved ? [change] : [];
        });
        return [{ page, sections, reordered }];
    });
}
