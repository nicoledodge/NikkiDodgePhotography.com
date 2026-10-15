import React, { Children, cloneElement, isValidElement, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { normalizeWebsiteContent, safeWebsiteLink, websitePages, type WebsiteContent, type WebsiteField, type WebsitePage, type WebsiteSection, type WebsiteSectionCatalog } from "../shared/website.js";
import { websiteFieldStyle } from "./websiteFieldStyle";
import { renderWebsiteSection, customSectionFields } from "./WebsiteSections";
export { customSectionFields } from "./WebsiteSections";
import "../styles/website-editor.css";
import "../styles/website-canvas.css";
import "../styles/website-layout.css";
import { isWebsiteColumnGrid, websiteLayoutProps } from "./websiteLayout";
import { useWebsiteLayoutControls, type WebsiteCanvasGesture } from "./useWebsiteLayoutControls";
import { useWebsitePhotoFraming } from "./useWebsitePhotoFraming";

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
function textFieldLabel(tag: string, className: string, contextClass: string): string {
    if (className.includes("category")) return "Category";
    if (className.split(/\s+/).includes("eyebrow")) return "Small introduction";
    if (["h1", "h2", "h3"].includes(tag)) return "Heading";
    if (tag === "a") return "Link label";
    if (tag === "figcaption" || /caption|photo-note/.test(`${className} ${contextClass}`)) return "Caption";
    if (tag === "p") return "Paragraph";
    if (tag === "li") return "List item";
    return "Short text";
}
const photoFrameClasses = new Set(["new-story-photo", "portfolio-card-image", "story-hero-main", "story-hero-side", "closing-image"]);
function transform(node: ReactNode, section: WebsiteSection, fields: WebsiteField[], path = "root", insideText = false, contextClass = "", selectedField: string | null = null, inheritedLink?: WebsiteField["link"]): ReactNode {
    return Children.map(node, (child, index) => {
        if (!isValidElement<ElementProps>(child)) return child;
        const id = `${path}.${child.key == null ? index : `k${elementKey(String(child.key))}`}`;
        const props: ElementProps = {};
        const className = child.props.className || "";
        const descendantContext = `${contextClass} ${className}`;
        const originalHref = child.type === "a" ? child.props.href : child.props.to;
        const ownLink = typeof originalHref === "string" && safeWebsiteLink(originalHref)
            ? { id: `${id}.link`, href: originalHref, ...(child.props.target === "_blank" ? { newTab: true } : {}) } : undefined;
        const link = ownLink || inheritedLink;
        if (ownLink) {
            props["data-website-link"] = ownLink.id;
            const replacement = section.links?.[ownLink.id];
            if (replacement && safeWebsiteLink(replacement.href)) {
                props[child.type === "a" ? "href" : "to"] = replacement.href;
                const newTab = replacement.newTab === true && /^https:\/\//i.test(replacement.href);
                props.target = newTab ? "_blank" : undefined;
                props.rel = newTab ? "noopener noreferrer" : undefined;
            }
        }
        if (isWebsiteColumnGrid(className)) props["data-website-layout-grid"] = "true";
        if (child.type === "img" && typeof child.props.src === "string") {
            const key = `${id}.image`;
            fields.push({ id: key, kind: "image", label: child.props.alt || "Photograph", value: child.props.src, alt: child.props.alt, ...(link ? { link } : {}) });
            props["data-website-field"] = key;
            props["data-website-kind"] = "image";
            props["data-website-selected"] = key === selectedField ? "true" : undefined;
            if (section.fieldStyles?.[key]) {
                const style = section.fieldStyles[key];
                props.style = { ...child.props.style, ...websiteFieldStyle(style, "image"), ...(style.ratio ? { minHeight: 0, maxHeight: "none" } : {}) };
            }
            if (section.fields[key]) { props.src = section.fields[key]; props.srcSet = undefined; props.sizes = undefined; }
            if (section.fields[`${key}.alt`] !== undefined) props.alt = section.fields[`${key}.alt`];
        }
        const tag = typeof child.type === "string" ? child.type : child.props.to ? "a" : "";
        const editable = !insideText && !child.props["aria-hidden"] && ["h1", "h2", "h3", "p", "li", "figcaption", "a", "span", "em", "strong"].includes(tag) && textOf(child.props.children).trim() && (tag !== "a" || !hasBlockOrImage(child.props.children));
        if (editable) {
            const key = `${id}.text`;
            const text = textOf(child.props.children);
            fields.push({ id: key, kind: "text", label: textFieldLabel(tag, className, contextClass), value: text, ...(link ? { link } : {}) });
            props["data-website-field"] = key;
            props["data-website-kind"] = "text";
            props["data-website-selected"] = key === selectedField ? "true" : undefined;
            if (section.fieldStyles?.[key]) {
                const style = section.fieldStyles[key];
                props.style = { ...child.props.style, ...websiteFieldStyle(style, "text") };
                props["data-website-style-weight"] = style.weight ? "true" : undefined;
                props["data-website-style-size"] = style.size ? "true" : undefined;
                props["data-website-style-color"] = style.color ? "true" : undefined;
            }
            props.children = section.fields[key] !== undefined ? section.fields[key] : transform(child.props.children, section, fields, id, true, descendantContext, selectedField, link);
        } else if (child.props.children) props.children = transform(child.props.children, section, fields, id, insideText, descendantContext, selectedField, link);
        const transformedChildren = Children.toArray(props.children ?? child.props.children).filter(isValidElement<ElementProps>);
        if (className.split(/\s+/).some(name => photoFrameClasses.has(name))) {
            // These wrappers crop one direct image. Change both boundaries together only
            // when the editor explicitly chooses a shape; source layouts otherwise inherit.
            const images = transformedChildren.filter(element => element.type === "img");
            const field = images.length === 1 ? images[0].props["data-website-field"] : undefined;
            const photoStyle = typeof field === "string" ? section.fieldStyles?.[field] : undefined;
            if (photoStyle?.ratio) {
                props.style = { ...child.props.style, ...props.style, aspectRatio: websiteFieldStyle(photoStyle, "image").aspectRatio, height: "auto", minHeight: 0, maxHeight: "none", alignSelf: "start" };
                props["data-website-photo-frame"] = "custom";
            }
        }
        if (className.split(/\s+/).includes("story-hero") && transformedChildren.some(element => element.props["data-website-photo-frame"] === "custom")) {
            // A portrait selection can be taller than the original desktop hero cap.
            props.style = { ...child.props.style, ...props.style, maxHeight: "none" };
        }
        return cloneElement(child, props);
    });
}
function CanvasIcon({ name }: { name: "up" | "down" | "hide" | "edit" | "photo" | "design" | "add" | "grip" | "frame" | "link" }) {
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {name === "up" && <path d="m6 14 6-6 6 6" />}{name === "down" && <path d="m6 10 6 6 6-6" />}
        {name === "hide" && <><path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.4 5.3A12 12 0 0 1 12 5c6 0 10 7 10 7a20 20 0 0 1-3.1 3.6M6.1 6.1A21 21 0 0 0 2 12s4 7 10 7a12 12 0 0 0 5.1-1.2" /></>}
        {name === "edit" && <><path d="m15 5 4 4M4 20l4-1 12-12a2.8 2.8 0 0 0-4-4L4 15z" /><path d="M12 20h8" /></>}
        {name === "grip" && <><circle cx="8" cy="5" r="1" /><circle cx="16" cy="5" r="1" /><circle cx="8" cy="12" r="1" /><circle cx="16" cy="12" r="1" /><circle cx="8" cy="19" r="1" /><circle cx="16" cy="19" r="1" /></>}
        {name === "add" && <path d="M12 5v14M5 12h14" />}
        {name === "design" && <><path d="M4 7h16M4 17h16" /><circle cx="9" cy="7" r="3" fill="currentColor" stroke="none" /><circle cx="15" cy="17" r="3" fill="currentColor" stroke="none" /></>}
        {name === "photo" && <><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8" cy="8" r="1.5" /><path d="m21 16-6-6-12 10" /></>}
        {name === "frame" && <><path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5M12 6v12M6 12h12m-8-4 2-2 2 2m-6 2-2 2 2 2m6 2-2 2-2-2m6-6 2 2-2 2" /></>}
        {name === "link" && <><path d="m10 13 4-4M8 15l-1 1a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m0 4 1-1a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0" /></>}
    </svg>;
}
type CanvasBox = { top: number; left: number; width: number; height: number };
type InlineEdit = { element: HTMLElement; nodes: ChildNode[]; original: string; section: string; field: string; label: string | null; role: string | null; tabIndex: string | null; end: (commit: boolean) => void };
export default function PageComposer({ page, children, enabled = true }: { page: WebsitePage; children: ReactNode; enabled?: boolean }) {
    const preview = new URLSearchParams(window.location.search).get("websitePreview") === "1" && window.parent !== window;
    const [content, setContent] = useState<WebsiteContent>({ pages: {} });
    const [previewMode, setPreviewMode] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const selectedIdRef = useRef<string | null>(null);
    const selectCanvasSection = useCallback((id: string | null) => { selectedIdRef.current = id; setSelectedId(id); }, []);
    const [selectedField, setSelectedField] = useState<string | null>(null);
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [selectedBox, setSelectedBox] = useState<CanvasBox | null>(null);
    const [hoverBox, setHoverBox] = useState<CanvasBox | null>(null);
    const [selectedFieldBox, setSelectedFieldBox] = useState<CanvasBox | null>(null);
    const [insertionPoints, setInsertionPoints] = useState<Array<{ after: string; top: number; left: number; width: number }>>([]);
    const toolbarRef = useRef<HTMLDivElement>(null);
    const [toolbarSize, setToolbarSize] = useState({ width: 480, height: 44 });
    const [canvasScale, setCanvasScale] = useState(1);
    const [editingText, setEditingText] = useState(false);
    const editRef = useRef<InlineEdit | null>(null);
    const gestureRef = useRef<WebsiteCanvasGesture | null>(null);
    const latestContentRef = useRef<WebsiteContent>({ pages: {} });
    const previewModeRef = useRef(false);
    const editing = preview && enabled && !previewMode;
    const send = useCallback((message: Record<string, unknown>) => window.parent.postMessage({ ...message, page }, window.location.origin), [page]);
    const sectionElement = useCallback((id: string | null) => id ? Array.from(document.querySelectorAll<HTMLElement>("[data-website-section]")).find(item => item.dataset.websiteSection === id) : undefined, []);
    const beginTextEdit = useCallback((element: HTMLElement) => {
        if (element.dataset.websiteKind !== "text" || editRef.current?.element === element) return;
        gestureRef.current?.finish(true);
        editRef.current?.end(true);
        const section = element.closest<HTMLElement>("[data-website-section]")?.dataset.websiteSection;
        const field = element.dataset.websiteField;
        if (!section || !field) return;
        const original = element.dataset.websitePlaceholder ? "" : element.innerText;
        const originalOverride = latestContentRef.current.pages[page]?.find(item => item.id === section)?.fields[field];
        let lastValue = original;
        let didNotify = false;
        const nodes = Array.from(element.childNodes);
        const label = element.getAttribute("aria-label"), role = element.getAttribute("role"), tabIndex = element.getAttribute("tabindex");
        const finish = (commit: boolean) => {
            if (editRef.current?.element !== element) return;
            const value = element.innerText.replace(/\r\n?/g, "\n").slice(0, 12000);
            element.removeEventListener("blur", blur);
            element.removeEventListener("keydown", keydown);
            element.removeEventListener("paste", paste);
            element.removeEventListener("input", input);
            element.removeAttribute("contenteditable");
            element.removeAttribute("data-website-editing");
            for (const [name, previous] of [["aria-label", label], ["role", role], ["tabindex", tabIndex]]) {
                if (previous === null) element.removeAttribute(name!); else element.setAttribute(name!, previous!);
            }
            element.replaceChildren(...nodes);
            editRef.current = null;
            setEditingText(false);
            const finalValue = commit ? value : original;
            if (!didNotify && finalValue === original) {
                setContent(latestContentRef.current);
                if (!commit) send({ type: "website-field-change", section, field, value: original, reset: originalOverride === undefined, cancelled: true });
                return;
            }
            const reset = finalValue === original && originalOverride === undefined;
            const incoming = latestContentRef.current;
            const existing = incoming.pages[page] || [];
            const updated = existing.some(item => item.id === section)
                ? existing.map(item => {
                    if (item.id !== section) return item;
                    const fields = { ...item.fields, [field]: finalValue };
                    if (reset) delete fields[field];
                    return { ...item, fields };
                })
                : [...existing, { id: section, fields: { [field]: finalValue } }];
            const next = { pages: { ...incoming.pages, [page]: updated } };
            latestContentRef.current = next; setContent(next);
            send({ type: "website-field-change", section, field, value: finalValue, reset, cancelled: !commit });
        };
        const input = () => {
            const value = element.innerText.replace(/\r\n?/g, "\n").slice(0, 12000);
            if (lastValue === value) return;
            lastValue = value; didNotify = true;
            send({ type: "website-field-change", section, field, value });
        };
        const blur = () => finish(true);
        const keydown = (event: KeyboardEvent) => {
            event.stopPropagation();
            if (event.key === "Escape") { event.preventDefault(); finish(false); element.blur(); }
            if (event.key === "Enter" && !event.shiftKey && !event.isComposing) { event.preventDefault(); finish(true); element.blur(); }
        };
        const paste = (event: ClipboardEvent) => {
            event.preventDefault();
            const selection = window.getSelection();
            if (!selection?.rangeCount) return;
            const range = selection.getRangeAt(0);
            range.deleteContents();
            const node = document.createTextNode((event.clipboardData?.getData("text/plain") || "").slice(0, 12000));
            range.insertNode(node); range.setStartAfter(node); range.collapse(true); selection.removeAllRanges(); selection.addRange(range); input();
        };
        editRef.current = { element, nodes, original, section, field, label, role, tabIndex, end: finish };
        element.replaceChildren(document.createTextNode(original));
        element.setAttribute("contenteditable", "plaintext-only");
        element.setAttribute("data-website-editing", "true");
        element.setAttribute("role", "textbox");
        element.setAttribute("aria-label", "Edit text. Enter to finish, Shift Enter for a new line, Escape to cancel.");
        element.setAttribute("tabindex", "0");
        element.addEventListener("blur", blur);
        element.addEventListener("keydown", keydown);
        element.addEventListener("paste", paste);
        element.addEventListener("input", input);
        selectCanvasSection(section); setSelectedField(field); setEditingText(true);
        send({ type: "website-select", section, field, intent: "inline" });
        element.focus();
        const range = document.createRange(); range.selectNodeContents(element);
        const selection = window.getSelection(); selection?.removeAllRanges(); selection?.addRange(range);
    }, [page, send, selectCanvasSection]);
    const finishInlineEdit = useCallback(() => { editRef.current?.end(true); }, []);
    const photoFraming = useWebsitePhotoFraming({ page, editing, canvasScale, latestContentRef, setContent, gestureRef, beforeStart: finishInlineEdit, sectionElement, send });
    const beginPhotoFraming = photoFraming.begin, finishPhotoSelection = photoFraming.finishSelection, reconcilePhotoDraft = photoFraming.reconcileDraft;
    const layoutControls = useWebsiteLayoutControls({ page, editing: editing && !editingText && !photoFraming.active, selectedId, canvasScale, content, latestContentRef, setContent, gestureRef, beforeStart: finishInlineEdit, sectionElement, send });
    useEffect(() => {
        let active = true;
        if (!preview) void fetch("/api/public/website").then(r => { if (!r.ok) throw Error(); return r.json(); }).then(value => { if (active) setContent(normalizeWebsiteContent(value)); }).catch(() => {});
        const receive = (event: MessageEvent) => {
            if (!preview || event.origin !== window.location.origin || event.source !== window.parent) return;
            if (event.data?.type === "website-highlight" && typeof event.data.section === "string") {
                finishPhotoSelection(event.data.section, Object.prototype.hasOwnProperty.call(event.data, "field") ? event.data.field : undefined);
                if (selectedIdRef.current !== event.data.section && !Object.prototype.hasOwnProperty.call(event.data, "field")) setSelectedField(null);
                selectCanvasSection(event.data.section);
                if (Object.prototype.hasOwnProperty.call(event.data, "field")) setSelectedField(typeof event.data.field === "string" ? event.data.field : null);
                if (event.data.scroll !== false) sectionElement(event.data.section)?.scrollIntoView({ block: "center", behavior: "smooth" });
                return;
            }
            if (event.data?.type === "website-photo-reposition" && typeof event.data.section === "string" && typeof event.data.field === "string") {
                selectCanvasSection(event.data.section); setSelectedField(event.data.field);
                beginPhotoFraming(event.data.section, event.data.field);
                return;
            }
            if (event.data?.type === "website-preview-mode") {
                const nextMode = event.data.preview === true;
                if (nextMode !== previewModeRef.current) { gestureRef.current?.finish(true); editRef.current?.end(true); previewModeRef.current = nextMode; setPreviewMode(nextMode); }
                return;
            }
            if (event.data?.type === "website-canvas-scale" && typeof event.data.scale === "number") { setCanvasScale(Math.max(.25, Math.min(1, event.data.scale))); return; }
            if (event.data?.type === "website-flush") {
                gestureRef.current?.finish(true);
                editRef.current?.end(true);
                send({ type: "website-flushed", requestId: event.data.requestId });
                return;
            }
            if (event.data?.type !== "website-draft") return;
            try {
                const normalized = normalizeWebsiteContent(event.data.content);
                latestContentRef.current = normalized;
                reconcilePhotoDraft();
                if (!editRef.current && !gestureRef.current) setContent(normalized);
            } catch { /* Ignore invalid preview messages. */ }
        };
        window.addEventListener("message", receive);
        return () => { active = false; gestureRef.current?.finish(false); editRef.current?.end(false); window.removeEventListener("message", receive); };
    }, [page, preview, sectionElement, send, selectCanvasSection, beginPhotoFraming, finishPhotoSelection, reconcilePhotoDraft]);
    useEffect(() => {
        if (!preview) return;
        const blockPreviewAction = (event: Event) => {
            if (event.type === "submit") { event.preventDefault(); event.stopPropagation(); return; }
            const target = event.target instanceof Element ? event.target : null;
            if (target?.closest("[data-website-overlay]")) return;
            if (target?.closest("[data-website-editing]")) return;
            const section = target?.closest<HTMLElement>("[data-website-section]");
            const field = target?.closest<HTMLElement>("[data-website-field]");
            if (editing && section) {
                const id = section.dataset.websiteSection!;
                selectCanvasSection(id); setSelectedField(field?.dataset.websiteField || null);
                send({ type: "website-select", section: id, field: field?.dataset.websiteField, intent: target?.closest(".website-canvas-photo-placeholder") ? "photo" : "select" });
            }
            if (target?.closest(editing ? "a,button,input,select,textarea" : "a,button[type=submit],form button:not([type])")) { event.preventDefault(); event.stopPropagation(); }
        };
        const doubleClick = (event: MouseEvent) => {
            if (!editing) return;
            const target = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-website-field]") : null;
            if (!target) return;
            event.preventDefault(); event.stopPropagation();
            if (target.dataset.websiteKind === "text") beginTextEdit(target);
            else if (target.dataset.websiteKind === "image") send({ type: "website-select", section: target.closest<HTMLElement>("[data-website-section]")?.dataset.websiteSection, field: target.dataset.websiteField, intent: "photo" });
        };
        const hover = (event: MouseEvent) => {
            if (event.target instanceof Element && !event.target.closest("[data-website-overlay]")) setHoveredId(event.target.closest<HTMLElement>("[data-website-section]")?.dataset.websiteSection || null);
        };
        const leave = () => setHoveredId(null);
        const shortcut = (event: KeyboardEvent) => {
            if (!editing || !(event.metaKey || event.ctrlKey) || event.altKey) return;
            const key = event.key.toLowerCase();
            if (key === "s") {
                event.preventDefault(); gestureRef.current?.finish(true); editRef.current?.end(true); send({ type: "website-shortcut", shortcut: "save" });
            } else if (!editRef.current && !gestureRef.current && (key === "z" || key === "y")) {
                event.preventDefault(); send({ type: "website-shortcut", shortcut: key === "y" || event.shiftKey ? "redo" : "undo" });
            }
        };
        document.addEventListener("click", blockPreviewAction, true);
        document.addEventListener("submit", blockPreviewAction, true);
        document.addEventListener("dblclick", doubleClick, true);
        document.addEventListener("keydown", shortcut, true);
        if (editing) { document.addEventListener("mouseover", hover); document.addEventListener("mouseleave", leave); }
        return () => { document.removeEventListener("click", blockPreviewAction, true); document.removeEventListener("submit", blockPreviewAction, true); document.removeEventListener("dblclick", doubleClick, true); document.removeEventListener("keydown", shortcut, true); document.removeEventListener("mouseover", hover); document.removeEventListener("mouseleave", leave); };
    }, [beginTextEdit, editing, preview, send, selectCanvasSection]);
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
        const fieldSelection = editing && selectedId === section.id ? selectedField : null;
        if (section.kind) { element = renderWebsiteSection(section, editing, fieldSelection); fields.push(...customSectionFields(section)); }
        else element = transform(originals[index], section, fields, "root", false, "", fieldSelection);
        const hasColumns = (node: ReactNode): boolean => Children.toArray(node).some(child => isValidElement<ElementProps>(child) && (isWebsiteColumnGrid(child.props.className || "") || hasColumns(child.props.children)));
        catalog.push({ id: section.id, name: section.name || (section.kind ? "New section" : websitePages[page].sections[index]) || "Section", fields, ...(hasColumns(element) ? { supportsColumns: true } : {}) });
        if (section.hidden || !element) return null;
        const root = Children.toArray(element)[0];
        if (!isValidElement<ElementProps>(root)) return root;
        const layout = websiteLayoutProps(section.layoutSettings);
        return cloneElement(root, { key: section.id, "data-website-section": section.id, ...layout, "data-website-layout-grid": isWebsiteColumnGrid(root.props.className || "") ? "true" : undefined,
            className: `${root.props.className || ""} website-section${editing ? " website-section-preview" : ""}${editing && selectedId === section.id ? " website-section-highlight" : ""} website-layout-${section.layout || "original"} website-spacing-${section.spacing || "original"}`,
            style: { ...root.props.style, ...layout.style, ...(section.background ? { backgroundColor: section.background } : {}) },
        });
    });
    const catalogJson = JSON.stringify(catalog);
    const stableCatalog = useMemo(() => JSON.parse(catalogJson) as WebsiteSectionCatalog[], [catalogJson]);
    const layoutDefaultsJson = JSON.stringify(layoutControls.layoutDefaults);
    useEffect(() => {
        if (preview) send({ type: "website-catalog", sections: stableCatalog.map(section => section.id === selectedId && layoutDefaultsJson ? { ...section, layoutDefaults: JSON.parse(layoutDefaultsJson) } : section) });
    }, [preview, send, stableCatalog, selectedId, layoutDefaultsJson]);
    useEffect(() => {
        if (!editing) return;
        let frame = 0;
        const measure = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
                const box = (id: string | null): CanvasBox | null => {
                    const rect = sectionElement(id)?.getBoundingClientRect();
                    return rect && rect.bottom > 0 && rect.top < window.innerHeight ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height } : null;
                };
                setSelectedBox(box(selectedId)); setHoverBox(box(hoveredId));
                const field = Array.from(sectionElement(selectedId)?.querySelectorAll<HTMLElement>("[data-website-field]") || []).find(element => element.dataset.websiteField === selectedField);
                const fieldRect = field?.getBoundingClientRect();
                setSelectedFieldBox(fieldRect && fieldRect.bottom > 0 && fieldRect.top < window.innerHeight ? { top: fieldRect.top, left: fieldRect.left, width: fieldRect.width, height: fieldRect.height } : null);
                setInsertionPoints(Array.from(document.querySelectorAll<HTMLElement>("[data-website-section]")).map(element => {
                    const rect = element.getBoundingClientRect();
                    return { after: element.dataset.websiteSection!, top: rect.bottom, left: rect.left, width: rect.width };
                }).filter(point => point.top > 20 / canvasScale && point.top < window.innerHeight - 20 / canvasScale));
            });
        };
        const observer = new ResizeObserver(measure); observer.observe(document.body);
        window.addEventListener("scroll", measure, true); window.addEventListener("resize", measure); document.addEventListener("load", measure, true); measure();
        return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener("scroll", measure, true); window.removeEventListener("resize", measure); document.removeEventListener("load", measure, true); };
    }, [content, editing, hoveredId, sectionElement, selectedId, selectedField, canvasScale]);
    useEffect(() => {
        const toolbar = toolbarRef.current;
        if (!editing || !toolbar) return;
        const measure = () => setToolbarSize({ width: toolbar.offsetWidth, height: toolbar.offsetHeight });
        const observer = new ResizeObserver(measure); observer.observe(toolbar); measure();
        return () => observer.disconnect();
    }, [editing, !!selectedBox, editingText, canvasScale, photoFraming.active]);
    const selectedCatalog = stableCatalog.find(section => section.id === selectedId);
    const activeField = selectedCatalog?.fields.find(field => field.id === selectedField) || selectedCatalog?.fields.find(field => field.kind === "text") || selectedCatalog?.fields[0];
    const selectedIndex = sections.findIndex(section => section.id === selectedId);
    const scale = 1 / canvasScale;
    const anchorBox = selectedFieldBox || selectedBox;
    const margin = 10 * scale;
    const toolbarHeight = toolbarSize.height * scale;
    const toolbarWidth = Math.min(toolbarSize.width * scale, window.innerWidth - margin * 2);
    const toolbarTop = anchorBox ? anchorBox.top > toolbarHeight + margin * 2
        ? anchorBox.top - toolbarHeight - margin
        : anchorBox.top + anchorBox.height + toolbarHeight + margin * 2 < window.innerHeight ? anchorBox.top + anchorBox.height + margin : margin : margin;
    const toolbarPosition = anchorBox ? {
        left: Math.max(margin, Math.min(anchorBox.left, window.innerWidth - toolbarWidth - margin)),
        top: Math.max(margin, Math.min(toolbarTop, window.innerHeight - toolbarHeight - margin)),
        transform: `scale(${scale})`, maxWidth: `calc(${window.innerWidth * canvasScale}px - 20px)`,
    } : undefined;
    const editSelectedField = () => {
        if (!activeField || !selectedId) return;
        if (activeField.kind === "image") send({ type: "website-select", section: selectedId, field: activeField.id, intent: "photo" });
        else {
            const element = Array.from(sectionElement(selectedId)?.querySelectorAll<HTMLElement>("[data-website-field]") || []).find(item => item.dataset.websiteField === activeField.id);
            if (element) beginTextEdit(element); else send({ type: "website-select", section: selectedId, field: activeField.id, intent: "edit" });
        }
    };
    return <>{enabled ? rendered : children}{layoutControls.overlays}{photoFraming.overlays}{editing && !photoFraming.active && <div className="website-canvas-overlays" data-website-overlay="true">
        {hoverBox && hoveredId !== selectedId && <div className="website-canvas-hover-label" style={{ left: Math.max(10 * scale, hoverBox.left + 10 * scale), top: Math.max(10 * scale, hoverBox.top + 10 * scale), transform: `scale(${scale})` }}>{stableCatalog.find(section => section.id === hoveredId)?.name}</div>}
        {!editingText && !layoutControls.active && insertionPoints.map(point => <div key={point.after} className={`website-canvas-insert ${point.after === selectedId ? "is-adjacent" : ""}`} style={{ top: point.top, left: point.left, width: point.width }}>
            <button type="button" aria-label="Add section here" title="Add section here" style={{ transform: `translate(-50%, -50%) scale(${scale})` }} onClick={() => send({ type: "website-insert", after: point.after })}><CanvasIcon name="add" /><span>Add section here</span></button>
        </div>)}
        {selectedBox && selectedCatalog && <div ref={toolbarRef} className={`website-canvas-toolbar${window.innerWidth * canvasScale < 680 ? " is-compact" : ""}`} role="toolbar" aria-label={`${selectedField && activeField ? activeField.label : selectedCatalog.name} controls`} style={toolbarPosition}>
            {!editingText && <button className="website-canvas-reorder-grip" type="button" aria-label="Move section" title="Drag to move this section. Arrow keys move up or down." {...layoutControls.gripProps}><CanvasIcon name="grip" /></button>}
            <span className="website-canvas-section-name" title={selectedCatalog.name}><small>{selectedCatalog.name}</small><strong>{selectedField && activeField ? activeField.label : "Section"}</strong></span>
            {!editingText && activeField && <button className="website-canvas-edit" type="button" onClick={editSelectedField}><CanvasIcon name={activeField.kind === "image" ? "photo" : "edit"} /><span>{activeField.kind === "image" ? "Change photo" : "Edit text"}</span></button>}
            {!editingText && <>
                {selectedId && activeField?.kind === "image" && photoFraming.canFrame(selectedId, activeField.id) && <button type="button" title="Reposition photo" aria-label="Reposition photo" onClick={() => beginPhotoFraming(selectedId, activeField.id)}><CanvasIcon name="frame" /><span>Reposition</span></button>}
                {activeField?.link && <button type="button" title="Edit link" aria-label="Edit link" onClick={() => send({ type: "website-select", section: selectedId, field: activeField.id, intent: "link" })}><CanvasIcon name="link" /><span>Link</span></button>}
                <button className="website-canvas-design" type="button" onClick={() => send({ type: "website-select", section: selectedId, field: selectedField || activeField?.id, intent: "design" })}><CanvasIcon name="design" /><span>Design</span></button>
                <button type="button" title="Add section below" aria-label="Add section below" onClick={() => send({ type: "website-insert", after: selectedId })}><CanvasIcon name="add" /></button>
            </>}
            {!editingText && <div className="website-canvas-arrange">
                <button type="button" title="Move section up" aria-label="Move section up" disabled={selectedIndex <= 0} onClick={() => send({ type: "website-section-action", section: selectedId, action: "up" })}><CanvasIcon name="up" /></button>
                <button type="button" title="Move section down" aria-label="Move section down" disabled={selectedIndex >= sections.length - 1} onClick={() => send({ type: "website-section-action", section: selectedId, action: "down" })}><CanvasIcon name="down" /></button>
                <button type="button" title="Hide section" aria-label="Hide section" onClick={() => send({ type: "website-section-action", section: selectedId, action: "hide" })}><CanvasIcon name="hide" /></button>
            </div>}
            {editingText && <span className="website-canvas-edit-hint">Enter to finish · Esc to cancel</span>}
        </div>}
    </div>}</>;
}
