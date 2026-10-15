import React, { Children, cloneElement, isValidElement, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { normalizeWebsiteContent, websitePages, type WebsiteContent, type WebsiteField, type WebsitePage, type WebsiteSection, type WebsiteSectionCatalog } from "../shared/website.js";
import "../styles/website-editor.css";

type ElementProps = { children?: ReactNode; src?: string; alt?: string; className?: string; style?: React.CSSProperties; to?: string; href?: string; [key: string]: unknown };
function textOf(node: ReactNode): string {
    return Children.toArray(node).map(child => typeof child === "string" || typeof child === "number" ? String(child) : isValidElement<ElementProps>(child) ? child.type === "br" ? "\n" : textOf(child.props.children) : "").join("");
}
function hasBlockOrImage(node: ReactNode): boolean {
    return Children.toArray(node).some(child => isValidElement<ElementProps>(child) && (["img", "div", "h1", "h2", "h3", "p", "figure"].includes(String(child.type)) || hasBlockOrImage(child.props.children)));
}
function elementKey(value: string): string {
    let hash = 0;
    for (const char of value) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
    return hash.toString(36);
}
function transform(node: ReactNode, section: WebsiteSection, fields: WebsiteField[], path = "root", insideText = false): ReactNode {
    return Children.map(node, (child, index) => {
        if (!isValidElement<ElementProps>(child)) return child;
        const id = `${path}.${child.key == null ? index : `k${elementKey(String(child.key))}`}`;
        const props: ElementProps = {};
        if (child.type === "img" && typeof child.props.src === "string") {
            const key = `${id}.image`;
            fields.push({ id: key, kind: "image", label: child.props.alt || "Photograph", value: child.props.src, alt: child.props.alt });
            props["data-website-field"] = key;
            if (section.fields[key]) { props.src = section.fields[key]; props.srcSet = undefined; props.sizes = undefined; }
            if (section.fields[`${key}.alt`] !== undefined) props.alt = section.fields[`${key}.alt`];
        }
        const tag = typeof child.type === "string" ? child.type : child.props.to ? "a" : "";
        const editable = !insideText && !child.props["aria-hidden"] && ["h1", "h2", "h3", "p", "li", "figcaption", "a", "span", "em", "strong"].includes(tag) && textOf(child.props.children).trim() && (tag !== "a" || !hasBlockOrImage(child.props.children));
        if (editable) {
            const key = `${id}.text`;
            const text = textOf(child.props.children);
            fields.push({ id: key, kind: "text", label: tag === "h1" || tag === "h2" || tag === "h3" ? "Heading" : tag === "a" ? "Link label" : "Text", value: text });
            props["data-website-field"] = key;
            props.children = section.fields[key] !== undefined ? section.fields[key] : transform(child.props.children, section, fields, id, true);
        } else if (child.props.children) props.children = transform(child.props.children, section, fields, id, insideText);
        return cloneElement(child, props);
    });
}
function customSection(section: WebsiteSection) {
    const f = section.fields;
    return <section className={`website-custom website-custom-${section.kind} site-container`}>
        {(section.kind === "photo" || section.kind === "split") && f.photo && <figure><img src={f.photo} alt={f.alt || ""} loading="lazy" data-website-field="photo" /></figure>}
        {section.kind !== "photo" && <div><p className="eyebrow" data-website-field="eyebrow">{f.eyebrow || ""}</p>
            <h2 data-website-field="title">{f.title || ""}</h2><p data-website-field="body">{f.body || ""}</p>
            {section.kind === "invitation" && <Link className="text-link" to="/Contact" data-website-field="button">{f.button || "Start your inquiry"} ↗</Link>}</div>}
        {section.kind === "photo" && f.caption && <p data-website-field="caption">{f.caption}</p>}
    </section>;
}
export function customSectionFields(section: WebsiteSection): WebsiteField[] {
    return [
        ...(section.kind !== "photo" ? ["eyebrow", "title", "body"] : ["caption"]),
        ...(section.kind === "invitation" ? ["button"] : []),
        ...(section.kind === "photo" || section.kind === "split" ? ["photo", "alt"] : []),
    ].map(id => ({ id, kind: id === "photo" ? "image" : "text", label: id === "alt" ? "Photo description" : id.charAt(0).toUpperCase() + id.slice(1), value: section.fields[id] || "" }));
}
export default function PageComposer({ page, children, enabled = true }: { page: WebsitePage; children: ReactNode; enabled?: boolean }) {
    const preview = new URLSearchParams(window.location.search).get("websitePreview") === "1" && window.parent !== window;
    const [content, setContent] = useState<WebsiteContent>({ pages: {} });
    useEffect(() => {
        let active = true;
        if (!preview) void fetch("/api/public/website").then(r => { if (!r.ok) throw Error(); return r.json(); }).then(value => { if (active) setContent(normalizeWebsiteContent(value)); }).catch(() => {});
        const receive = (event: MessageEvent) => {
            if (!preview || event.origin !== window.location.origin || event.source !== window.parent) return;
            if (event.data?.type === "website-highlight" && typeof event.data.section === "string") {
                document.querySelectorAll(".website-section-highlight").forEach(element => element.classList.remove("website-section-highlight"));
                const element = Array.from(document.querySelectorAll<HTMLElement>("[data-website-section]")).find(item => item.dataset.websiteSection === event.data.section);
                element?.classList.add("website-section-highlight"); element?.scrollIntoView({ block: "center", behavior: "smooth" }); return;
            }
            if (event.data?.type !== "website-draft") return;
            try { setContent(normalizeWebsiteContent(event.data.content)); } catch { /* Ignore invalid preview messages. */ }
        };
        window.addEventListener("message", receive);
        const blockPreviewAction = (event: Event) => {
            if (!preview) return;
            if (event.type === "submit") { event.preventDefault(); event.stopPropagation(); return; }
            const target = event.target instanceof Element ? event.target : null;
            const section = target?.closest<HTMLElement>("[data-website-section]");
            if (section) window.parent.postMessage({ type: "website-select", page, section: section.dataset.websiteSection, field: target?.closest<HTMLElement>("[data-website-field]")?.dataset.websiteField }, window.location.origin);
            if (target?.closest("a,button,input,select,textarea")) { event.preventDefault(); event.stopPropagation(); }
        };
        if (preview) { document.addEventListener("click", blockPreviewAction, true); document.addEventListener("submit", blockPreviewAction, true); }
        return () => { active = false; window.removeEventListener("message", receive); document.removeEventListener("click", blockPreviewAction, true); document.removeEventListener("submit", blockPreviewAction, true); };
    }, [page, preview]);
    const originals = Children.toArray(children);
    const configured = content.pages[page] || [];
    const byId = new Map(configured.map(section => [section.id, section]));
    // Missing built-in sections stay available after code updates. Hiding is explicit.
    const sections = [...configured, ...originals.map((_, i): WebsiteSection => ({ id: `original-${i}`, fields: {} })).filter(s => !byId.has(s.id))];
    const catalog: WebsiteSectionCatalog[] = [];
    const rendered = sections.map(section => {
        const fields: WebsiteField[] = [];
        const index = Number(section.id.slice(9));
        let element: ReactNode;
        if (section.kind) { element = customSection(section); fields.push(...customSectionFields(section)); }
        else element = transform(originals[index], section, fields);
        catalog.push({ id: section.id, name: section.name || (section.kind ? "New section" : websitePages[page].sections[index]) || "Section", fields });
        if (section.hidden || !element) return null;
        // transform returns an array; preserve the existing element and its layout classes.
        const root = Children.toArray(element)[0];
        if (!isValidElement<ElementProps>(root)) return root;
        return cloneElement(root, { key: section.id, "data-website-section": section.id,
            className: `${root.props.className || ""} website-section${preview ? " website-section-preview" : ""} website-layout-${section.layout || "original"} website-spacing-${section.spacing || "original"}`,
            style: { ...root.props.style, ...(section.background ? { backgroundColor: section.background } : {}) },
        });
    });
    const catalogJson = JSON.stringify(catalog);
    const stableCatalog = useMemo(() => JSON.parse(catalogJson) as WebsiteSectionCatalog[], [catalogJson]);
    useEffect(() => { if (preview) window.parent.postMessage({ type: "website-catalog", page, sections: stableCatalog }, window.location.origin); }, [preview, page, stableCatalog]);
    return <>{enabled ? rendered : children}</>;
}
