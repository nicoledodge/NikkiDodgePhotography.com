export const websitePages = {
    home: { name: "Home", path: "/", sections: ["Introduction", "Featured photography", "Photo caption", "Selected stories", "About Nikki", "The experience", "Closing photograph"] },
    about: { name: "About", path: "/howdy", sections: ["Introduction", "The approach", "Closing invitation"] },
    pricing: { name: "Pricing", path: "/pricing", sections: ["Introduction", "Wedding collection", "Other sessions", "Contact invitation"] },
    contact: { name: "Contact", path: "/Contact", sections: ["Introduction", "Contact details and inquiry form"] },
    portfolio: { name: "Portfolio", path: "/Portfolio", sections: ["Introduction", "Gallery filters", "Photo galleries"] },
} as const;
export type WebsitePage = keyof typeof websitePages;
export interface WebsiteFieldStyle {
    size?: "small" | "medium" | "large" | "display";
    color?: string;
    align?: "left" | "center" | "right";
    weight?: "normal" | "bold";
    fit?: "cover" | "contain";
    position?: "center" | "top" | "bottom" | "left" | "right";
    ratio?: "square" | "portrait" | "landscape";
}
export interface WebsiteSection {
    id: string;
    name?: string;
    kind?: "text" | "photo" | "split" | "invitation";
    hidden?: boolean;
    layout?: "original" | "centered" | "wide" | "reversed";
    spacing?: "original" | "compact" | "generous";
    background?: string;
    fields: Record<string, string>;
    fieldStyles?: Record<string, WebsiteFieldStyle>;
}
export interface WebsiteContent { pages: Partial<Record<WebsitePage, WebsiteSection[]>> }
export interface WebsiteDocument {
    revision: number;
    draft: WebsiteContent;
    published: WebsiteContent;
    previousPublished?: WebsiteContent;
    publishedAt?: string;
}
export interface WebsiteField { id: string; kind: "text" | "image"; label: string; value: string; alt?: string }
export interface WebsiteSectionCatalog { id: string; name: string; fields: WebsiteField[] }
export const emptyWebsiteDocument = (): WebsiteDocument => ({ revision: 0, draft: { pages: {} }, published: { pages: {} } });
export function safeWebsiteImage(value: string): boolean {
    if (value.includes("\\") || /(?:^|\/)\.\.(?:\/|$)/.test(value)) return false;
    if (/^\/(?:assets|uploads)\//.test(value)) return true;
    try { const url = new URL(value); return url.protocol === "https:" && !url.port && url.hostname === "images.nikkidodgephotography.com" && !url.username && !url.password; } catch { return false; }
}
const fieldStyleOptions = {
    size: ["small", "medium", "large", "display"],
    align: ["left", "center", "right"],
    weight: ["normal", "bold"],
    fit: ["cover", "contain"],
    position: ["center", "top", "bottom", "left", "right"],
    ratio: ["square", "portrait", "landscape"],
} as const;
function normalizeWebsiteFieldStyles(input: unknown): Record<string, WebsiteFieldStyle> | undefined {
    if (input === undefined) return undefined;
    if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).length > 1000) throw new Error("Invalid website field styles.");
    const styles: Record<string, WebsiteFieldStyle> = {};
    for (const [field, raw] of Object.entries(input)) {
        if (!/^[a-zA-Z0-9.-]{1,160}$/.test(field) || !raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Invalid website field style.");
        const style: WebsiteFieldStyle = {};
        for (const [key, value] of Object.entries(raw)) {
            if (key !== "color" && !Object.prototype.hasOwnProperty.call(fieldStyleOptions, key)) throw new Error("Choose a supported website style.");
            if (value === undefined) continue;
            if (key === "color") {
                if (typeof value !== "string" || !/^#[a-f\d]{6}$/i.test(value)) throw new Error("Choose a valid text color.");
                style.color = value;
            } else {
                const options: readonly string[] = fieldStyleOptions[key as keyof typeof fieldStyleOptions];
                if (typeof value !== "string" || !options.includes(value)) throw new Error("Choose a supported website style.");
                Object.assign(style, { [key]: value });
            }
        }
        if (Object.keys(style).length) styles[field] = style;
    }
    return Object.keys(styles).length ? styles : undefined;
}
export function normalizeWebsiteContent(input: unknown): WebsiteContent {
    if (!input || typeof input !== "object" || !("pages" in input) || !input.pages || typeof input.pages !== "object") throw new Error("Website pages are required.");
    const pages: WebsiteContent["pages"] = {};
    for (const page of Object.keys(websitePages) as WebsitePage[]) {
        const sections = (input.pages as Record<string, unknown>)[page];
        if (sections === undefined) continue;
        if (!Array.isArray(sections) || sections.length > 40) throw new Error("Each page supports up to 40 sections.");
        const seen = new Set<string>();
        pages[page] = sections.map((section: unknown) => {
            if (!section || typeof section !== "object") throw new Error("Invalid section.");
            const s = section as Record<string, unknown>;
            if (typeof s.id !== "string" || !/^(?:original-(?:0|[1-9]\d*)|custom-[a-zA-Z0-9-]+)$/.test(s.id) || seen.has(s.id)) throw new Error("Invalid or duplicate section ID.");
            seen.add(s.id);
            if (s.id.startsWith("original-") && Number(s.id.slice(9)) >= websitePages[page].sections.length) throw new Error("Unknown section.");
            const kind = ["text", "photo", "split", "invitation"].includes(String(s.kind)) ? s.kind as WebsiteSection["kind"] : undefined;
            if (s.id.startsWith("custom-") && !kind) throw new Error("Choose a section type.");
            const fields: Record<string, string> = {};
            if (!s.fields || typeof s.fields !== "object" || Object.keys(s.fields).length > 1000) throw new Error("Invalid section fields.");
            for (const [key, value] of Object.entries(s.fields)) {
                if (!/^[a-zA-Z0-9.-]{1,160}$/.test(key) || typeof value !== "string" || value.length > 12000) throw new Error("Invalid website field.");
                if ((key.endsWith(".image") || key === "photo") && value && !safeWebsiteImage(value)) throw new Error("Choose a photo from the published website assets.");
                fields[key] = value;
            }
            const fieldStyles = normalizeWebsiteFieldStyles(s.fieldStyles);
            const background = typeof s.background === "string" && /^#[a-f\d]{6}$/i.test(s.background) ? s.background : undefined;
            return { id: s.id, name: typeof s.name === "string" ? s.name.slice(0, 100) : undefined, kind, hidden: s.hidden === true,
                layout: ["original", "centered", "wide", "reversed"].includes(String(s.layout)) ? s.layout as WebsiteSection["layout"] : "original",
                spacing: ["original", "compact", "generous"].includes(String(s.spacing)) ? s.spacing as WebsiteSection["spacing"] : "original", background, fields, ...(fieldStyles ? { fieldStyles } : {}) };
        });
    }
    return { pages };
}
