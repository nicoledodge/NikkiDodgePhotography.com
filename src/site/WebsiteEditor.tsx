import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { websitePages, type WebsiteContent, type WebsiteDocument, type WebsitePage, type WebsiteSection, type WebsiteSectionCatalog } from "../shared/website.js";
import { customSectionFields } from "./PageComposer";
import WebsitePhotoPicker from "./WebsitePhotoPicker";
import Icon, { type IconName } from "./WebsiteIcon";
import "../styles/website-editor.css";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(path, { credentials: "same-origin", ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
    const data = await response.json();
    if (!response.ok) throw new Error(response.status === 409 ? "This website was updated in another window. Your edits are still here. Reload the saved draft to get the latest version." : data.error || "Unable to save website changes.");
    return data as T;
}
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const sectionTypes = [
    { kind: "text", title: "Story", description: "A heading and room for your words.", icon: "text" },
    { kind: "photo", title: "Photograph", description: "Let one image take the spotlight.", icon: "photo" },
    { kind: "split", title: "Photo & story", description: "An image beside a personal story.", icon: "split" },
    { kind: "invitation", title: "Invitation", description: "Guide visitors toward an inquiry.", icon: "invitation" },
] as const;
function Modal({ title, onClose, children, className = "" }: { title: string; onClose: () => void; children: ReactNode; className?: string }) {
    const element = useRef<HTMLDivElement>(null);
    const close = useRef(onClose); close.current = onClose;
    useEffect(() => {
        const previous = window.document.activeElement;
        element.current?.querySelector<HTMLElement>("button")?.focus();
        const key = (event: KeyboardEvent) => {
            if (event.key === "Escape") { event.preventDefault(); close.current(); }
            if (event.key !== "Tab") return;
            const items = Array.from(element.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input,select,textarea,a[href],[tabindex="0"]') || []);
            const first = items[0], last = items[items.length - 1];
            if (event.shiftKey && window.document.activeElement === first) { event.preventDefault(); last?.focus(); }
            if (!event.shiftKey && window.document.activeElement === last) { event.preventDefault(); first?.focus(); }
        };
        window.addEventListener("keydown", key);
        return () => { window.removeEventListener("keydown", key); if (previous instanceof HTMLElement) previous.focus(); };
    }, []);
    return <div className="studio-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><div ref={element} className={`studio-modal ${className}`} role="dialog" aria-modal="true" aria-labelledby="studio-modal-title"><header><div><span className="studio-eyebrow">WEBSITE STUDIO</span><h2 id="studio-modal-title">{title}</h2></div><button className="studio-icon-button" aria-label="Close dialog" onClick={onClose}><Icon name="close" /></button></header>{children}</div></div>;
}
export default function WebsiteEditor({ onDirtyChange }: { onDirtyChange: (dirty: boolean) => void }) {
    const [document, setDocument] = useState<WebsiteDocument | null>(null);
    const [draft, setDraft] = useState<WebsiteContent>({ pages: {} });
    const draftRef = useRef(draft);
    const flushRequests = useRef(new Map<string, () => void>());
    const inlineBase = useRef<{ draft: WebsiteContent; undo: WebsiteContent[]; redo: WebsiteContent[] } | null>(null);
    const [page, setPage] = useState<WebsitePage>("home");
    const [catalog, setCatalog] = useState<Partial<Record<WebsitePage, WebsiteSectionCatalog[]>>>({});
    const [selectedId, setSelectedId] = useState("original-0");
    const [focusedField, setFocusedField] = useState<string>();
    const [inspectorTab, setInspectorTab] = useState<"content" | "design">("content");
    const [mobile, setMobile] = useState(false);
    const [preview, setPreview] = useState(false);
    const [panel, setPanel] = useState<"pages" | "canvas" | "settings">("canvas");
    const [busy, setBusy] = useState<"draft" | "publish" | "restore" | "load" | null>("load");
    const busyRef = useRef(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [modal, setModal] = useState<"add" | "publish" | "restore" | "reset" | "reload" | null>(null);
    const [undo, setUndo] = useState<WebsiteContent[]>([]);
    const [redo, setRedo] = useState<WebsiteContent[]>([]);
    const editGroup = useRef({ key: "", time: 0 });
    const [photoField, setPhotoField] = useState<string>();
    const [dragged, setDragged] = useState<string>();
    const [dropTarget, setDropTarget] = useState<string>();
    const [previewWidth, setPreviewWidth] = useState(800);
    const [frameReady, setFrameReady] = useState(false);
    const frameContainer = useRef<HTMLDivElement>(null);
    const frame = useRef<HTMLIFrameElement>(null);
    const root = useRef<HTMLElement>(null);
    const inspector = useRef<HTMLElement>(null);
    const dirty = document !== null && !equal(document.draft, draft);
    const unpublished = document !== null && !equal(document.published, draft);
    useEffect(() => { onDirtyChange(dirty); return () => onDirtyChange(false); }, [dirty, onDirtyChange]);
    const load = useCallback(async (signal?: AbortSignal) => {
        setBusy("load"); setError("");
        try {
            const value = await api<WebsiteDocument>("/api/admin/website", { signal });
            if (signal?.aborted) return;
            setDocument(value); draftRef.current = value.draft; setDraft(value.draft); setUndo([]); setRedo([]); editGroup.current.key = "";
        } catch (e) { if (!signal?.aborted) setError(e instanceof Error ? e.message : "Unable to load your website."); }
        finally { if (!signal?.aborted) setBusy(null); }
    }, []);
    useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
    useEffect(() => {
        const observer = new ResizeObserver(entries => setPreviewWidth(entries[0].contentRect.width));
        if (frameContainer.current) observer.observe(frameContainer.current);
        return () => observer.disconnect();
    }, []);
    const send = (data: object) => frame.current?.contentWindow?.postMessage(data, window.location.origin);
    const flushCanvas = () => new Promise<void>(resolve => {
        if (!frameReady) { resolve(); return; }
        const requestId = crypto.randomUUID();
        const timeout = window.setTimeout(() => { flushRequests.current.delete(requestId); resolve(); }, 2000);
        flushRequests.current.set(requestId, () => { window.clearTimeout(timeout); resolve(); });
        send({ type: "website-flush", requestId });
    });
    const sendPreview = () => { send({ type: "website-draft", content: draftRef.current }); send({ type: "website-preview-mode", preview }); send({ type: "website-highlight", section: selectedId, scroll: false }); send({ type: "website-canvas-scale", scale: Math.min(1, previewWidth / (mobile ? 390 : 1280)) }); };
    useEffect(() => { sendPreview(); }, [draft, page, preview, frameReady, previewWidth, mobile, selectedId]);
    useEffect(() => {
        const warn = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [dirty]);
    useEffect(() => {
        if (preview) return;
        if (!focusedField) { inspector.current?.scrollTo({ top: 0 }); return; }
        const input = window.document.getElementById(`website-field-${focusedField}`);
        input?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        // Canvas selection should keep focus on the canvas. The inspector reveals the matching field.
    }, [focusedField, selectedId, inspectorTab, preview]);
    const defaults = websitePages[page].sections.map((name, index) => ({ id: `original-${index}`, name, fields: {} }));
    const configured = draft.pages[page] || [];
    const sections: WebsiteSection[] = [...configured, ...defaults.filter(section => !configured.some(s => s.id === section.id))];
    const selected = sections.find(section => section.id === selectedId) || sections[0];
    useEffect(() => { if (selected && selected.id !== selectedId) setSelectedId(selected.id); }, [selected?.id, selectedId]);
    const selectedCatalog = catalog[page]?.find(section => section.id === selected?.id);
    const fields = selected?.kind ? customSectionFields(selected) : selectedCatalog?.fields || [];
    const nameOf = (section: WebsiteSection) => section.name || catalog[page]?.find(s => s.id === section.id)?.name || "Section";
    const change = (content: WebsiteContent, group = "") => {
        if (busy || equal(content, draftRef.current)) return;
        const now = Date.now(), previous = draftRef.current;
        if (!group || editGroup.current.key !== group || now - editGroup.current.time > 1000) setUndo(current => [...current.slice(-49), previous]);
        editGroup.current = { key: group, time: now }; setRedo([]); draftRef.current = content; setDraft(content); setNotice("");
    };
    const setSections = (next: WebsiteSection[], group = "") => change({ ...draftRef.current, pages: { ...draftRef.current.pages, [page]: next } }, group);
    const updateSection = (patch: Partial<WebsiteSection>, group = "") => { if (selected) setSections(sections.map(section => section.id === selected.id ? { ...section, ...patch } : section), group); };
    const setField = (field: string, value: string, sectionId = selected?.id, reset = false) => {
        const configured = draftRef.current.pages[page] || [];
        const current = [...configured, ...defaults.filter(section => !configured.some(s => s.id === section.id))];
        setSections(current.map(section => {
            if (section.id !== sectionId) return section;
            const fields = { ...section.fields, [field]: value };
            if (reset) delete fields[field];
            return { ...section, fields };
        }), `${page}:${sectionId}:${field}`);
    };
    const selectSection = (id: string, scroll = true) => { setSelectedId(id); setFocusedField(undefined); send({ type: "website-highlight", section: id, scroll }); };
    const move = (id: string, direction: number) => {
        const next = [...sections], index = next.findIndex(s => s.id === id), other = index + direction;
        if (index < 0 || other < 0 || other >= next.length) return;
        [next[index], next[other]] = [next[other], next[index]]; setSections(next);
    };
    const toggle = (id: string) => setSections(sections.map(s => s.id === id ? { ...s, hidden: !s.hidden } : s));
    const addSection = (kind: NonNullable<WebsiteSection["kind"]>) => {
        const id = `custom-${crypto.randomUUID()}`;
        const section: WebsiteSection = { id, kind, name: sectionTypes.find(type => type.kind === kind)?.title, fields: { title: "", body: "" } };
        const next = [...sections]; next.splice(sections.findIndex(s => s.id === selected?.id) + 1, 0, section);
        setSections(next); setSelectedId(id); setInspectorTab("content"); setModal(null); setPanel("settings");
        setTimeout(() => send({ type: "website-highlight", section: id, scroll: true }), 100);
    };
    const history = (direction: "undo" | "redo") => {
        if (busy) return;
        const source = direction === "undo" ? undo : redo;
        if (!source.length) return;
        if (direction === "undo") { setRedo(current => [...current, draft]); setUndo(current => current.slice(0, -1)); }
        else { setUndo(current => [...current, draft]); setRedo(current => current.slice(0, -1)); }
        draftRef.current = source[source.length - 1]; setDraft(source[source.length - 1]); editGroup.current.key = ""; setNotice("");
    };
    const save = async (action: "draft" | "publish" | "restore") => {
        if (!document || busyRef.current || busy) return;
        busyRef.current = true; await flushCanvas(); setBusy(action); setError(""); setNotice(""); setModal(null);
        try {
            const next = await api<WebsiteDocument>("/api/admin/website", { method: "PUT", body: JSON.stringify({ revision: document.revision, action, content: draftRef.current }) });
            setDocument(next); draftRef.current = next.draft; setDraft(next.draft); editGroup.current.key = "";
            if (action === "restore") { setUndo([]); setRedo([]); }
            setNotice(action === "draft" ? "Draft saved. Ready whenever you are." : action === "publish" ? "Your website changes are live." : "Your previous published website is restored.");
        } catch (e) { setError(e instanceof Error ? e.message : "Unable to save website changes."); }
        finally { busyRef.current = false; setBusy(null); }
    };
    useEffect(() => {
        const receive = (event: MessageEvent) => {
            if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow || event.data?.page !== page) return;
            const data = event.data;
            if (data.type === "website-flushed") { const complete = flushRequests.current.get(data.requestId); flushRequests.current.delete(data.requestId); complete?.(); return; }
            if (data.type === "website-catalog") { setCatalog(current => ({ ...current, [page]: data.sections })); setFrameReady(true); }
            if (busy || preview) return;
            if (data.type === "website-shortcut") { if (data.shortcut === "save" && dirty) void save("draft"); else if (data.shortcut === "undo" || data.shortcut === "redo") history(data.shortcut); return; }
            if (!sections.some(s => s.id === data.section)) return;
            if (data.type === "website-select") {
                if (data.intent === "inline") inlineBase.current = { draft: draftRef.current, undo, redo };
                setSelectedId(data.section); setFocusedField(data.field); setInspectorTab("content");
                if (data.intent === "photo") setPhotoField(data.field);
                if (data.intent === "edit") { setPanel("settings"); setTimeout(() => window.document.getElementById(`website-field-${data.field}`)?.focus(), 50); }
            }
            if (data.type === "website-section-action") {
                setSelectedId(data.section);
                if (data.action === "up" || data.action === "down") move(data.section, data.action === "up" ? -1 : 1);
                if (data.action === "hide") toggle(data.section);
            }
            if (data.type === "website-field-change" && typeof data.field === "string" && typeof data.value === "string") {
                if (data.cancelled && inlineBase.current) {
                    const original = inlineBase.current;
                    draftRef.current = original.draft; setDraft(original.draft); setUndo(original.undo); setRedo(original.redo); editGroup.current.key = ""; inlineBase.current = null;
                } else setField(data.field, data.value.slice(0, 12000), data.section, data.reset === true);
            }
        };
        window.addEventListener("message", receive);
        return () => window.removeEventListener("message", receive);
    });
    useEffect(() => {
        const key = (event: KeyboardEvent) => {
            if (!root.current?.getClientRects().length || !(event.metaKey || event.ctrlKey) || modal || photoField || busy) return;
            if (event.key.toLowerCase() === "s") { event.preventDefault(); if (dirty) void save("draft"); }
            const editing = event.target instanceof HTMLElement && (event.target.matches("input,textarea") || event.target.isContentEditable);
            if (event.key.toLowerCase() === "z" && !editing) { event.preventDefault(); history(event.shiftKey ? "redo" : "undo"); }
        };
        window.addEventListener("keydown", key);
        return () => window.removeEventListener("keydown", key);
    });
    const changedPages = (Object.keys(websitePages) as WebsitePage[]).filter(key => !equal(document?.published.pages[key], draft.pages[key]));
    const canvasWidth = mobile ? 390 : 1280, scale = Math.min(1, previewWidth / canvasWidth);
    const status = busy === "load" ? "Opening your studio" : busy === "draft" ? "Saving draft…" : busy === "publish" ? "Publishing…" : busy === "restore" ? "Restoring…" : dirty ? "Unsaved changes" : unpublished ? "Draft saved" : "All changes published";
    return <section ref={root} className={`website-editor ${preview ? "is-previewing" : ""} studio-panel-${panel}`} aria-label="Website editor" aria-busy={!!busy}>
        <header className="website-editor-toolbar">
            <div className="studio-title"><span className="studio-mark"><Icon name="layers" /></span><div><h2>Website studio</h2><span>Make it feel like you.</span></div></div>
            <div className={`studio-save-state ${dirty ? "is-unsaved" : ""}`} role="status"><span />{status}</div>
            <div className="website-toolbar-actions">
                <div className="studio-history"><button className="studio-icon-button" title="Undo (⌘Z / Ctrl+Z)" aria-label="Undo" disabled={!undo.length || !!busy} onClick={() => history("undo")}><Icon name="undo" /></button><button className="studio-icon-button" title="Redo (⇧⌘Z / Ctrl+Shift+Z)" aria-label="Redo" disabled={!redo.length || !!busy} onClick={() => history("redo")}><Icon name="redo" /></button></div>
                <button className="studio-button studio-preview-toggle" aria-pressed={preview} disabled={!document || !!busy} onClick={async () => { await flushCanvas(); setPreview(!preview); }}><Icon name={preview ? "close" : "eye"} />{preview ? "Back to editing" : "Preview"}</button>
                <button className="studio-button studio-save-button" disabled={!document || !!busy || !dirty} onClick={() => void save("draft")}>Save draft</button>
                <button className="studio-button studio-button-primary" disabled={!document || !!busy || !unpublished} onClick={async () => { await flushCanvas(); setModal("publish"); }}>Publish<Icon name="arrow" /></button>
            </div>
        </header>
        {error && <div className="studio-banner is-error" role="alert"><span>{error}</span><button onClick={() => dirty ? setModal("reload") : void load()}>Reload saved draft</button><button className="studio-icon-button" aria-label="Dismiss error" onClick={() => setError("")}><Icon name="close" /></button></div>}
        {notice && <div className="studio-banner" role="status"><Icon name="check" /><span>{notice}</span><button className="studio-icon-button" aria-label="Dismiss notification" onClick={() => setNotice("")}><Icon name="close" /></button></div>}
        <nav className="studio-mobile-nav" aria-label="Editor panels">{([ ["pages", "layers", "Pages & sections"], ["canvas", "desktop", "Canvas"], ["settings", "settings", "Edit section"] ] as const).map(([value, icon, label]) => <button key={value} aria-pressed={panel === value} onClick={() => setPanel(value)}><Icon name={icon} />{label}</button>)}</nav>
        <div className="website-editor-workspace" inert={!!busy || !document || !!modal || !!photoField}>
            <aside className="website-editor-pages" aria-label="Pages and sections">
                <div className="studio-pages-block"><div className="studio-panel-heading"><span>Site pages</span><small>{Object.keys(websitePages).length}</small></div><nav className="studio-page-list" aria-label="Website pages">{(Object.entries(websitePages) as [WebsitePage, typeof websitePages[WebsitePage]][]).map(([key, value]) => <button key={key} aria-current={page === key ? "page" : undefined} onClick={async () => { if (key === page) return; await flushCanvas(); setPage(key); setSelectedId("original-0"); setFocusedField(undefined); setFrameReady(false); editGroup.current.key = ""; }}><Icon name="pages" /><span>{value.name}</span>{changedPages.includes(key) && <i title="Unpublished changes" aria-label="Unpublished changes" />}{page === key && <Icon name="arrow" />}</button>)}</nav></div>
                <div className="studio-sections-block"><div className="studio-panel-heading"><span>{websitePages[page].name} sections</span><small>{sections.length}</small></div><p className="studio-muted">Drag to reorder. Click to edit.</p>
                    <ol className="website-section-list">{sections.map((section, index) => <li key={section.id} className={`${section.id === selected?.id ? "is-selected" : ""} ${section.hidden ? "is-hidden" : ""} ${dropTarget === section.id ? "is-drop-target" : ""}`} onDragOver={event => { if (dragged && dragged !== section.id) { event.preventDefault(); setDropTarget(section.id); } }} onDrop={event => { event.preventDefault(); const source = sections.find(s => s.id === dragged); if (source && source.id !== section.id) { const next = sections.filter(s => s.id !== dragged); next.splice(next.findIndex(s => s.id === section.id), 0, source); setSections(next); } setDragged(undefined); setDropTarget(undefined); }}>
                        <div className="studio-section-row"><button className="studio-drag-handle" title={`Drag ${nameOf(section)} to reorder`} aria-label={`Drag ${nameOf(section)} to reorder`} draggable onDragStart={event => { setDragged(section.id); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", section.id); }} onDragEnd={() => { setDragged(undefined); setDropTarget(undefined); }}><Icon name="grip" /></button><button className="website-section-select" aria-pressed={section.id === selected?.id} onClick={() => selectSection(section.id)}><span>{nameOf(section)}</span>{section.hidden && <small>Hidden from visitors</small>}</button><button className="studio-section-visibility studio-icon-button" aria-label={`${section.hidden ? "Show" : "Hide"} ${nameOf(section)}`} onClick={() => toggle(section.id)}><Icon name={section.hidden ? "hide" : "eye"} /></button></div>
                        {section.id === selected?.id && <div className="studio-section-tools"><span>{String(index + 1).padStart(2, "0")} / {String(sections.length).padStart(2, "0")}</span><button aria-label={`Move ${nameOf(section)} up`} disabled={!index} onClick={() => move(section.id, -1)}><Icon name="up" /></button><button aria-label={`Move ${nameOf(section)} down`} disabled={index === sections.length - 1} onClick={() => move(section.id, 1)}><Icon name="down" /></button></div>}
                    </li>)}</ol>
                    <button className="studio-add-section" disabled={sections.length >= 40} onClick={() => setModal("add")}><Icon name="plus" />Add a section</button>
                </div>
                <div className="studio-library-note"><Icon name="photo" /><p>Originals live in Mountain Turtle.<br /><span>Choose their website photos here.</span></p></div>
                {document?.previousPublished && <button className="studio-history-link" onClick={() => setModal("restore")}>Restore previous publication</button>}
            </aside>
            <main className="website-editor-canvas" aria-label="Website canvas"><div className="website-preview-toolbar"><div className="studio-page-address"><span className="studio-address-dot" />{websitePages[page].path === "/" ? "Home page" : websitePages[page].path}<span className="studio-draft-tag">{preview ? "Preview" : "Draft"}</span></div><div className="studio-device-control" aria-label="Preview size"><button aria-label="Desktop preview" aria-pressed={!mobile} onClick={() => setMobile(false)}><Icon name="desktop" /></button><button aria-label="Phone preview" aria-pressed={mobile} onClick={() => setMobile(true)}><Icon name="phone" /></button></div><a href={websitePages[page].path} target="_blank" rel="noreferrer" title="Open published page" aria-label="Open published page"><Icon name="external" /></a></div>
                <div className="studio-canvas-surround"><div ref={frameContainer} className={`website-preview-frame ${mobile ? "is-phone" : ""}`}><iframe ref={frame} src={`${websitePages[page].path}?websitePreview=1`} title={`${websitePages[page].name} draft preview`} style={{ width: canvasWidth, height: `${100 / Math.max(scale, .1)}%`, transform: `scale(${scale})`, transformOrigin: "top left" }} onLoad={sendPreview} sandbox="allow-same-origin allow-scripts" />{!frameReady && <div className="studio-canvas-loading"><span className="studio-spinner" />Opening {websitePages[page].name.toLowerCase()}…</div>}</div></div>
                <footer className="studio-canvas-footer"><span>{preview ? "Preview your draft · links and forms are paused" : "Click to select · double-click text to write"}</span><span>{canvasWidth}px <b>·</b> {Math.round(scale * 100)}%</span></footer>
            </main>
            <aside ref={inspector} className="website-editor-inspector" aria-label="Section settings">{selected && <>
                <div className="studio-inspector-heading"><span className="studio-eyebrow">SELECTED SECTION</span><h3>{nameOf(selected)}</h3><span className="studio-section-kind">{selected.kind ? "Custom section" : "Original section"}{selected.hidden ? " · Hidden" : ""}</span></div>
                <div className="studio-inspector-tabs" role="tablist" aria-label="Section settings tabs"><button role="tab" aria-selected={inspectorTab === "content"} aria-controls="studio-content-panel" onClick={() => setInspectorTab("content")}>Content</button><button role="tab" aria-selected={inspectorTab === "design"} aria-controls="studio-design-panel" onClick={() => setInspectorTab("design")}>Design</button></div>
                {selected.hidden && <div className="studio-hidden-note"><Icon name="hide" /><p>This section is hidden.<button onClick={() => toggle(selected.id)}>Show on website</button></p></div>}
                {inspectorTab === "content" ? <div id="studio-content-panel" role="tabpanel" className="website-field-list">{fields.map((field, index) => <div className={`website-edit-field ${focusedField === field.id ? "is-focused" : ""}`} key={field.id}>{field.kind === "image" ? <>
                    <div className="studio-field-caption"><span>Photograph{fields.filter(f => f.kind === "image").length > 1 ? ` ${fields.slice(0, index + 1).filter(f => f.kind === "image").length}` : ""}</span></div>
                    <button className="studio-photo-card" id={`website-field-${field.id}`} onClick={() => setPhotoField(field.id)}>{(selected.fields[field.id] || field.value) ? <img src={selected.fields[field.id] || field.value} alt={selected.fields[`${field.id}.alt`] || field.alt || "Selected photograph"} loading="lazy" /> : <div className="studio-empty-photo"><Icon name="photo" /><span>Find the right photograph</span></div>}<span className="studio-photo-change"><Icon name="photo" />{selected.fields[field.id] || field.value ? "Replace photo" : "Choose photo"}</span></button>
                    {!selected.kind && <details className="studio-photo-description"><summary>Photo description</summary><label><span className="studio-sr-only">Photo description {index + 1}</span><textarea value={selected.fields[`${field.id}.alt`] ?? field.alt ?? ""} rows={2} placeholder="Describe this image for visitors who use a screen reader." onChange={event => setField(`${field.id}.alt`, event.target.value)} /></label></details>}
                </> : <label><span className="studio-field-caption">{field.label}{fields.filter(f => f.label === field.label).length > 1 ? ` ${fields.slice(0, index + 1).filter(f => f.label === field.label).length}` : ""}</span><textarea id={`website-field-${field.id}`} value={selected.fields[field.id] ?? field.value} maxLength={12000} rows={field.label === "Heading" || field.id === "title" ? 3 : Math.min(7, Math.max(2, Math.ceil((selected.fields[field.id] ?? field.value).length / 55)))} placeholder={field.id === "title" ? "A heading in your own words…" : field.id === "body" ? "Tell your story…" : field.id === "eyebrow" ? "Optional introduction" : "Write here…"} onFocus={() => setFocusedField(field.id)} onChange={event => setField(field.id, event.target.value)} onBlur={() => { editGroup.current.key = ""; }} /></label>}</div>)}{!fields.length && <p className="studio-muted">{frameReady ? "Select a section with text or photos to start editing." : "Finding this section’s content…"}</p>}<p className="studio-inspector-tip">Your words, your photographs.<br />Changes stay in your draft until you publish.</p></div> : <div id="studio-design-panel" role="tabpanel" className="studio-design-fields">
                    <label>Section name<input value={selected.name || selectedCatalog?.name || ""} maxLength={100} onChange={event => updateSection({ name: event.target.value }, `${page}:${selected.id}:name`)} /><small>Only shown in your editor.</small></label>
                    <fieldset><legend>Layout</legend><div className="studio-layout-options">{([["original", "Original", "layers"], ["centered", "Centered", "text"], ["wide", "Full width", "desktop"], ["reversed", "Swap sides", "split"]] as const).map(([value, label, icon]) => <button key={value} aria-pressed={(selected.layout || "original") === value} onClick={() => updateSection({ layout: value })}><span className={`studio-layout-diagram is-${value}`}><i /><i /><i /></span><span>{label}</span><Icon name={icon} /></button>)}</div></fieldset>
                    <fieldset><legend>Breathing room</legend><div className="studio-segment-control">{([["compact", "Close"], ["original", "Original"], ["generous", "Airy"]] as const).map(([value, label]) => <button key={value} aria-pressed={(selected.spacing || "original") === value} onClick={() => updateSection({ spacing: value })}>{label}</button>)}</div></fieldset>
                    <fieldset><legend>Background</legend><div className="studio-color-swatches">{["#ffffff", "#f5f1eb", "#e9e0d7", "#e7e9e2", "#ebe2e8"].map(color => <button key={color} aria-label={`Background ${color}`} aria-pressed={selected.background === color} style={{ background: color }} onClick={() => updateSection({ background: color })}>{selected.background === color && <Icon name="check" />}</button>)}<label className="studio-custom-color" title="Custom background color"><span className="studio-sr-only">Custom background color</span><input type="color" value={selected.background || "#ffffff"} onChange={event => updateSection({ background: event.target.value }, `${page}:${selected.id}:background`)} /><Icon name="plus" /></label></div>{selected.background && <button className="studio-text-button" onClick={() => updateSection({ background: undefined })}>Use original background</button>}</fieldset>
                    <div className="studio-section-maintenance"><button className="studio-button" onClick={() => setModal("reset")}>Reset section design</button>{selected.kind && <button className="studio-text-button is-danger" onClick={() => { setSections(sections.filter(s => s.id !== selected.id)); setSelectedId("original-0"); }}>Remove section</button>}</div>
                </div>}
            </>}</aside>
        </div>
        {busy === "load" && <div className="studio-initial-loading" role="status"><span className="studio-spinner" /><h3>Opening your studio</h3><p>A little space for your next idea.</p></div>}
        {photoField && <WebsitePhotoPicker currentUrl={selected?.fields[photoField] || fields.find(f => f.id === photoField)?.value} onChoose={url => { setField(photoField, url); setPhotoField(undefined); }} onClose={() => setPhotoField(undefined)} />}
        {modal === "add" && <Modal title="Make room for your next idea." onClose={() => setModal(null)} className="studio-add-dialog"><p>Add a section after <strong>{selected && nameOf(selected)}</strong>. Make it yours with text, photographs, and your own spacing.</p><div className="studio-section-templates">{sectionTypes.map(type => <button key={type.kind} onClick={() => addSection(type.kind)}><div className={`studio-template-preview is-${type.kind}`}>{(type.kind === "photo" || type.kind === "split") && <div className="studio-template-image"><Icon name="photo" /></div>}{type.kind !== "photo" && <div className="studio-template-lines"><i /><i /><i />{type.kind === "invitation" && <b />}</div>}</div><div><Icon name={type.icon as IconName} /><h3>{type.title}</h3><span>+</span></div><p>{type.description}</p></button>)}</div></Modal>}
        {modal === "publish" && <Modal title="Ready to share your changes?" onClose={() => setModal(null)}><p>Your draft will become the live website. Here are the pages with changes.</p><ul className="studio-publish-pages">{changedPages.map(key => <li key={key}><Icon name="pages" /><span>{websitePages[key].name}</span><span className="studio-draft-tag">Updated</span></li>)}</ul><div className="studio-publication-note"><Icon name="check" /><p>You can restore the previous publication from this editor.</p></div><footer><button className="studio-button" onClick={() => setModal(null)}>Keep editing</button><button className="studio-button studio-button-primary" onClick={() => void save("publish")}>Publish website<Icon name="arrow" /></button></footer></Modal>}
        {(modal === "restore" || modal === "reset" || modal === "reload") && <Modal title={modal === "restore" ? "Restore your previous publication?" : modal === "reset" ? "Return to the original design?" : "Reload the saved draft?"} onClose={() => setModal(null)}><p>{modal === "restore" ? "This replaces your current draft and live website with the previous published version." : modal === "reset" ? "This resets the selected section’s text, photos, spacing, and background. You can undo this while you’re editing." : "Your unsaved edits will be replaced with the latest saved draft."}</p><footer><button className="studio-button" onClick={() => setModal(null)}>Keep editing</button><button className="studio-button studio-button-primary" onClick={() => { const action = modal; setModal(null); if (action === "restore") void save("restore"); else if (action === "reload") void load(); else updateSection({ fields: {}, layout: "original", spacing: "original", background: undefined }); }}>{modal === "restore" ? "Restore publication" : modal === "reset" ? "Reset section" : "Reload draft"}</button></footer></Modal>}
    </section>;
}
