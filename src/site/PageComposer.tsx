import React, { Children, cloneElement, isValidElement, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { normalizeWebsiteContent, websitePages, type WebsiteContent, type WebsiteField, type WebsitePage, type WebsiteSection, type WebsiteSectionCatalog } from "../shared/website.js";
import "../styles/website-editor.css";
import "../styles/website-canvas.css";

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
function transform(node: ReactNode, section: WebsiteSection, fields: WebsiteField[], path = "root", insideText = false, contextClass = ""): ReactNode {
    return Children.map(node, (child, index) => {
        if (!isValidElement<ElementProps>(child)) return child;
        const id = `${path}.${child.key == null ? index : `k${elementKey(String(child.key))}`}`;
        const props: ElementProps = {};
        const className = child.props.className || "";
        const descendantContext = `${contextClass} ${className}`;
        if (child.type === "img" && typeof child.props.src === "string") {
            const key = `${id}.image`;
            fields.push({ id: key, kind: "image", label: child.props.alt || "Photograph", value: child.props.src, alt: child.props.alt });
            props["data-website-field"] = key;
            props["data-website-kind"] = "image";
            if (section.fields[key]) { props.src = section.fields[key]; props.srcSet = undefined; props.sizes = undefined; }
            if (section.fields[`${key}.alt`] !== undefined) props.alt = section.fields[`${key}.alt`];
        }
        const tag = typeof child.type === "string" ? child.type : child.props.to ? "a" : "";
        const editable = !insideText && !child.props["aria-hidden"] && ["h1", "h2", "h3", "p", "li", "figcaption", "a", "span", "em", "strong"].includes(tag) && textOf(child.props.children).trim() && (tag !== "a" || !hasBlockOrImage(child.props.children));
        if (editable) {
            const key = `${id}.text`;
            const text = textOf(child.props.children);
            fields.push({ id: key, kind: "text", label: textFieldLabel(tag, className, contextClass), value: text });
            props["data-website-field"] = key;
            props["data-website-kind"] = "text";
            props.children = section.fields[key] !== undefined ? section.fields[key] : transform(child.props.children, section, fields, id, true, descendantContext);
        } else if (child.props.children) props.children = transform(child.props.children, section, fields, id, insideText, descendantContext);
        return cloneElement(child, props);
    });
}
function customSection(section: WebsiteSection, editing: boolean) {
    const f = section.fields;
    const text = (field: string, placeholder: string) => ({ "data-website-field": field, "data-website-kind": "text", "data-website-placeholder": editing && !f[field] ? "true" : undefined, children: f[field] || (editing ? placeholder : "") });
    return <section className={`website-custom website-custom-${section.kind} site-container`}>
        {(section.kind === "photo" || section.kind === "split") && (f.photo
            ? <figure><img src={f.photo} alt={f.alt || ""} loading="lazy" data-website-field="photo" data-website-kind="image" /></figure>
            : editing && <button className="website-canvas-photo-placeholder" type="button" data-website-field="photo" data-website-kind="image"><CanvasIcon name="photo" /><span>Choose a photograph</span><small>From your website collection</small></button>)}
        {section.kind !== "photo" && <div><p className="eyebrow" {...text("eyebrow", "Add a small introduction")} />
            <h2 {...text("title", "Write your heading")} /><p {...text("body", "Tell your story. Double-click to start writing.")} />
            {section.kind === "invitation" && <Link className="text-link" to="/Contact"><span data-website-field="button" data-website-kind="text">{f.button || "Start your inquiry"}</span> ↗</Link>}</div>}
        {section.kind === "photo" && (f.caption || editing) && <p {...text("caption", "Add a caption (optional)")} />}
    </section>;
}
export function customSectionFields(section: WebsiteSection): WebsiteField[] {
    const labels: Record<string, string> = { eyebrow: "Small introduction", title: "Heading", body: "Paragraph", caption: "Caption", button: "Link label", photo: "Photograph", alt: "Photo description" };
    return [
        ...(section.kind !== "photo" ? ["eyebrow", "title", "body"] : ["caption"]),
        ...(section.kind === "invitation" ? ["button"] : []),
        ...(section.kind === "photo" || section.kind === "split" ? ["photo", "alt"] : []),
    ].map(id => ({ id, kind: id === "photo" ? "image" : "text", label: labels[id] || id, value: section.fields[id] || "" }));
}
function CanvasIcon({ name }: { name: "up" | "down" | "hide" | "edit" | "photo" }) {
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {name === "up" && <path d="m6 14 6-6 6 6" />}{name === "down" && <path d="m6 10 6 6 6-6" />}
        {name === "hide" && <><path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.4 5.3A12 12 0 0 1 12 5c6 0 10 7 10 7a20 20 0 0 1-3.1 3.6M6.1 6.1A21 21 0 0 0 2 12s4 7 10 7a12 12 0 0 0 5.1-1.2" /></>}
        {name === "edit" && <><path d="m15 5 4 4M4 20l4-1 12-12a2.8 2.8 0 0 0-4-4L4 15z" /><path d="M12 20h8" /></>}
        {name === "photo" && <><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8" cy="8" r="1.5" /><path d="m21 16-6-6-12 10" /></>}
    </svg>;
}
type CanvasBox = { top: number; left: number; width: number; height: number };
type InlineEdit = { element: HTMLElement; nodes: ChildNode[]; original: string; section: string; field: string; label: string | null; role: string | null; tabIndex: string | null; end: (commit: boolean) => void };
export default function PageComposer({ page, children, enabled = true }: { page: WebsitePage; children: ReactNode; enabled?: boolean }) {
    const preview = new URLSearchParams(window.location.search).get("websitePreview") === "1" && window.parent !== window;
    const [content, setContent] = useState<WebsiteContent>({ pages: {} });
    const [previewMode, setPreviewMode] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedField, setSelectedField] = useState<string | null>(null);
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [selectedBox, setSelectedBox] = useState<CanvasBox | null>(null);
    const [hoverBox, setHoverBox] = useState<CanvasBox | null>(null);
    const [canvasScale, setCanvasScale] = useState(1);
    const [editingText, setEditingText] = useState(false);
    const editRef = useRef<InlineEdit | null>(null);
    const latestContentRef = useRef<WebsiteContent>({ pages: {} });
    const previewModeRef = useRef(false);
    const editing = preview && enabled && !previewMode;
    const send = useCallback((message: Record<string, unknown>) => window.parent.postMessage({ ...message, page }, window.location.origin), [page]);
    const sectionElement = useCallback((id: string | null) => id ? Array.from(document.querySelectorAll<HTMLElement>("[data-website-section]")).find(item => item.dataset.websiteSection === id) : undefined, []);
    const beginTextEdit = useCallback((element: HTMLElement) => {
        if (element.dataset.websiteKind !== "text" || editRef.current?.element === element) return;
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
        setSelectedId(section); setSelectedField(field); setEditingText(true);
        send({ type: "website-select", section, field, intent: "inline" });
        element.focus();
        const range = document.createRange(); range.selectNodeContents(element);
        const selection = window.getSelection(); selection?.removeAllRanges(); selection?.addRange(range);
    }, [page, send]);
    useEffect(() => {
        let active = true;
        if (!preview) void fetch("/api/public/website").then(r => { if (!r.ok) throw Error(); return r.json(); }).then(value => { if (active) setContent(normalizeWebsiteContent(value)); }).catch(() => {});
        const receive = (event: MessageEvent) => {
            if (!preview || event.origin !== window.location.origin || event.source !== window.parent) return;
            if (event.data?.type === "website-highlight" && typeof event.data.section === "string") {
                setSelectedId(event.data.section);
                if (event.data.scroll !== false) sectionElement(event.data.section)?.scrollIntoView({ block: "center", behavior: "smooth" });
                return;
            }
            if (event.data?.type === "website-preview-mode") {
                const nextMode = event.data.preview === true;
                if (nextMode !== previewModeRef.current) { editRef.current?.end(true); previewModeRef.current = nextMode; setPreviewMode(nextMode); }
                return;
            }
            if (event.data?.type === "website-canvas-scale" && typeof event.data.scale === "number") { setCanvasScale(Math.max(.25, Math.min(1, event.data.scale))); return; }
            if (event.data?.type === "website-flush") {
                editRef.current?.end(true);
                send({ type: "website-flushed", requestId: event.data.requestId });
                return;
            }
            if (event.data?.type !== "website-draft") return;
            try {
                const normalized = normalizeWebsiteContent(event.data.content);
                latestContentRef.current = normalized;
                if (!editRef.current) setContent(normalized);
            } catch { /* Ignore invalid preview messages. */ }
        };
        window.addEventListener("message", receive);
        return () => { active = false; editRef.current?.end(false); window.removeEventListener("message", receive); };
    }, [page, preview, sectionElement, send]);
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
                setSelectedId(id); setSelectedField(field?.dataset.websiteField || null);
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
                event.preventDefault(); editRef.current?.end(true); send({ type: "website-shortcut", shortcut: "save" });
            } else if (!editRef.current && (key === "z" || key === "y")) {
                event.preventDefault(); send({ type: "website-shortcut", shortcut: key === "y" || event.shiftKey ? "redo" : "undo" });
            }
        };
        document.addEventListener("click", blockPreviewAction, true);
        document.addEventListener("submit", blockPreviewAction, true);
        document.addEventListener("dblclick", doubleClick, true);
        document.addEventListener("keydown", shortcut, true);
        if (editing) { document.addEventListener("mouseover", hover); document.addEventListener("mouseleave", leave); }
        return () => { document.removeEventListener("click", blockPreviewAction, true); document.removeEventListener("submit", blockPreviewAction, true); document.removeEventListener("dblclick", doubleClick, true); document.removeEventListener("keydown", shortcut, true); document.removeEventListener("mouseover", hover); document.removeEventListener("mouseleave", leave); };
    }, [beginTextEdit, editing, preview, send]);
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
        if (section.kind) { element = customSection(section, editing); fields.push(...customSectionFields(section)); }
        else element = transform(originals[index], section, fields);
        catalog.push({ id: section.id, name: section.name || (section.kind ? "New section" : websitePages[page].sections[index]) || "Section", fields });
        if (section.hidden || !element) return null;
        const root = Children.toArray(element)[0];
        if (!isValidElement<ElementProps>(root)) return root;
        return cloneElement(root, { key: section.id, "data-website-section": section.id,
            className: `${root.props.className || ""} website-section${editing ? " website-section-preview" : ""}${editing && selectedId === section.id ? " website-section-highlight" : ""} website-layout-${section.layout || "original"} website-spacing-${section.spacing || "original"}`,
            style: { ...root.props.style, ...(section.background ? { backgroundColor: section.background } : {}) },
        });
    });
    const catalogJson = JSON.stringify(catalog);
    const stableCatalog = useMemo(() => JSON.parse(catalogJson) as WebsiteSectionCatalog[], [catalogJson]);
    useEffect(() => { if (preview) send({ type: "website-catalog", sections: stableCatalog }); }, [preview, send, stableCatalog]);
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
            });
        };
        const observer = new ResizeObserver(measure); observer.observe(document.body);
        window.addEventListener("scroll", measure, true); window.addEventListener("resize", measure); document.addEventListener("load", measure, true); measure();
        return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener("scroll", measure, true); window.removeEventListener("resize", measure); document.removeEventListener("load", measure, true); };
    }, [content, editing, hoveredId, sectionElement, selectedId]);
    const selectedCatalog = stableCatalog.find(section => section.id === selectedId);
    const activeField = selectedCatalog?.fields.find(field => field.id === selectedField) || selectedCatalog?.fields.find(field => field.kind === "text") || selectedCatalog?.fields[0];
    const selectedIndex = sections.findIndex(section => section.id === selectedId);
    const scale = 1 / canvasScale;
    const toolbarPosition = selectedBox ? { left: Math.max(10 * scale, Math.min(selectedBox.left + 10 * scale, window.innerWidth - Math.min(440 * scale, window.innerWidth - 20 * scale))), top: Math.max(10 * scale, selectedBox.top > 58 * scale ? selectedBox.top - 48 * scale : selectedBox.top + 10 * scale), transform: `scale(${scale})`, maxWidth: `calc(${window.innerWidth * canvasScale}px - 20px)` } : undefined;
    const editSelectedField = () => {
        if (!activeField || !selectedId) return;
        if (activeField.kind === "image") send({ type: "website-select", section: selectedId, field: activeField.id, intent: "photo" });
        else {
            const element = Array.from(sectionElement(selectedId)?.querySelectorAll<HTMLElement>("[data-website-field]") || []).find(item => item.dataset.websiteField === activeField.id);
            if (element) beginTextEdit(element); else send({ type: "website-select", section: selectedId, field: activeField.id, intent: "edit" });
        }
    };
    return <>{enabled ? rendered : children}{editing && <div className="website-canvas-overlays" data-website-overlay="true">
        {hoverBox && hoveredId !== selectedId && <div className="website-canvas-hover-label" style={{ left: Math.max(10 * scale, hoverBox.left + 10 * scale), top: Math.max(10 * scale, hoverBox.top + 10 * scale), transform: `scale(${scale})` }}>{stableCatalog.find(section => section.id === hoveredId)?.name}</div>}
        {selectedBox && selectedCatalog && <div className="website-canvas-toolbar" role="toolbar" aria-label={`${selectedCatalog.name} section controls`} style={toolbarPosition}>
            <span className="website-canvas-section-name">{selectedCatalog.name}</span>
            {!editingText && activeField && <button className="website-canvas-edit" type="button" onClick={editSelectedField}><CanvasIcon name={activeField.kind === "image" ? "photo" : "edit"} /><span>{activeField.kind === "image" ? "Change photo" : "Edit text"}</span></button>}
            {!editingText && <div className="website-canvas-arrange">
                <button type="button" title="Move section up" aria-label="Move section up" disabled={selectedIndex <= 0} onClick={() => send({ type: "website-section-action", section: selectedId, action: "up" })}><CanvasIcon name="up" /></button>
                <button type="button" title="Move section down" aria-label="Move section down" disabled={selectedIndex >= sections.length - 1} onClick={() => send({ type: "website-section-action", section: selectedId, action: "down" })}><CanvasIcon name="down" /></button>
                <button type="button" title="Hide section" aria-label="Hide section" onClick={() => send({ type: "website-section-action", section: selectedId, action: "hide" })}><CanvasIcon name="hide" /></button>
            </div>}
            {editingText && <span className="website-canvas-edit-hint">Enter to finish · Esc to cancel</span>}
        </div>}
    </div>}</>;
}
