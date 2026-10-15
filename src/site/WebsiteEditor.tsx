import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { normalizeWebsiteContent, safeWebsiteLink, websitePages, type WebsiteLink, type WebsiteLayoutSettings, type WebsiteFieldStyle, type WebsiteContent, type WebsiteDocument, type WebsitePage, type WebsiteSection, type WebsiteSectionCatalog } from "../shared/website.js";
import { customSectionFields } from "./WebsiteSections";
import WebsiteSectionLibrary from "./WebsiteSectionLibrary";
import WebsiteVersionHistory from "./WebsiteVersionHistory";
import WebsitePublishReview from "./WebsitePublishReview";
import WebsiteLinkEditor from "./WebsiteLinkEditor";
import WebsiteFieldDesign from "./WebsiteFieldDesign";
import WebsitePhotoPicker from "./WebsitePhotoPicker";
import WebsiteSectionOutline from "./WebsiteSectionOutline";
import type { WebsiteSectionAction } from "./WebsiteSectionActions";
import { copyWebsiteSection, duplicateWebsiteSection, effectiveWebsiteSections, getChangedWebsitePages, insertWebsiteSection, removeWebsiteSection } from "../shared/websiteSections.js";
import Icon from "./WebsiteIcon";
import "../styles/website-editor.css";
import "../styles/website-section-dialogs.css";

class WebsiteApiError extends Error { constructor(message: string, public status: number) { super(message); } }
async function api<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(path, { credentials: "same-origin", ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
    const data = await response.json();
    if (!response.ok) throw new WebsiteApiError(response.status === 409 ? "This website was updated in another window. Your edits are still here. Reload the saved draft to get the latest version." : data.error || "Unable to save website changes.", response.status);
    return data as T;
}
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
function Modal({ title, onClose, children, className = "" }: { title: string; onClose: () => void; children: ReactNode; className?: string }) {
    const element = useRef<HTMLDivElement>(null);
    const close = useRef(onClose); close.current = onClose;
    useEffect(() => {
        const previous = window.document.activeElement;
        (element.current?.querySelector<HTMLElement>("[data-autofocus]") || element.current?.querySelector<HTMLElement>("button"))?.focus();
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
    return createPortal(<div className="studio-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><div ref={element} className={`studio-modal ${className}`} role="dialog" aria-modal="true" aria-labelledby="studio-modal-title"><header><div><span className="studio-eyebrow">WEBSITE STUDIO</span><h2 id="studio-modal-title">{title}</h2></div><button className="studio-icon-button" aria-label="Close dialog" onClick={onClose}><Icon name="close" /></button></header>{children}</div></div>, window.document.body);
}
export default function WebsiteEditor({ onDirtyChange }: { onDirtyChange: (dirty: boolean) => void }) {
    const [document, setDocument] = useState<WebsiteDocument | null>(null);
    const documentRef = useRef<WebsiteDocument | null>(null);
    const draftSave = useRef<Promise<boolean> | null>(null);
    const [saving, setSaving] = useState(false);
    const [autosavePaused, setAutosavePaused] = useState(false);
    const [saveConflict, setSaveConflict] = useState(false);
    const [draft, setDraft] = useState<WebsiteContent>({ pages: {} });
    const draftRef = useRef(draft);
    const flushRequests = useRef(new Map<string, (success: boolean) => void>());
    const inlineBase = useRef<{ draft: WebsiteContent; undo: WebsiteContent[]; redo: WebsiteContent[] } | null>(null);
    const [page, setPage] = useState<WebsitePage>("home");
    const [catalog, setCatalog] = useState<Partial<Record<WebsitePage, WebsiteSectionCatalog[]>>>({});
    const [selectedId, setSelectedId] = useState("original-0");
    const [focusedField, setFocusedField] = useState<string>();
    const [inspectorTab, setInspectorTab] = useState<"content" | "design">("content");
    const [inspectorOpen, setInspectorOpen] = useState(false);
    const [leftPanel, setLeftPanel] = useState<"pages" | "sections" | null>(null);
    const [insertAfter, setInsertAfter] = useState<string | null>();
    const selections = useRef<Partial<Record<WebsitePage, { section: string; field?: string }>>>({});
    const revealOnReady = useRef<{ page: WebsitePage; section: string; field?: string } | null>(null);
    const focusOnReady = useRef<{ page: WebsitePage; section: string } | null>(null);
    const [sectionDialog, setSectionDialog] = useState<{ page: WebsitePage; id: string; name: string; target: WebsitePage } | null>(null);
    const [zoom, setZoom] = useState<"fit" | "actual">("fit");
    const [mobile, setMobile] = useState(false);
    const [preview, setPreview] = useState(false);
    const [panel, setPanel] = useState<"pages" | "canvas" | "settings">("canvas");
    const [busy, setBusy] = useState<"draft" | "publish" | "restore" | "recover" | "load" | null>("load");
    const busyRef = useRef(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [modal, setModal] = useState<"add" | "publish" | "restore" | "reset" | "reload" | "versions" | "rename" | "copy" | null>(null);
    const [undo, setUndo] = useState<WebsiteContent[]>([]);
    const [redo, setRedo] = useState<WebsiteContent[]>([]);
    const undoRef = useRef<WebsiteContent[]>([]), redoRef = useRef<WebsiteContent[]>([]);
    const writeUndo = (next: WebsiteContent[]) => { undoRef.current = next; setUndo(next); };
    const writeRedo = (next: WebsiteContent[]) => { redoRef.current = next; setRedo(next); };
    const editGroup = useRef({ key: "", time: 0 });
    const [photoField, setPhotoField] = useState<string>();
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
            documentRef.current = value; setDocument(value); setAutosavePaused(false); setSaveConflict(false); draftRef.current = value.draft; setDraft(value.draft); writeUndo([]); writeRedo([]); editGroup.current.key = "";
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
    const flushCanvas = () => new Promise<boolean>(resolve => {
        if (!frameReady) { resolve(true); return; }
        const requestId = crypto.randomUUID();
        const timeout = window.setTimeout(() => { flushRequests.current.delete(requestId); setError("The canvas is still updating. Please try again in a moment."); resolve(false); }, 3000);
        flushRequests.current.set(requestId, success => { window.clearTimeout(timeout); resolve(success); });
        send({ type: "website-flush", requestId });
    });
    const sendPreview = () => { send({ type: "website-draft", content: draftRef.current }); send({ type: "website-preview-mode", preview }); send({ type: "website-highlight", section: selectedId, field: focusedField ?? null, scroll: false }); send({ type: "website-canvas-scale", scale: zoom === "actual" ? 1 : Math.min(1, previewWidth / (mobile ? 390 : 1280)) }); };
    useEffect(() => { sendPreview(); }, [draft, page, preview, frameReady, previewWidth, mobile, selectedId, focusedField, zoom]);
    useEffect(() => {
        const pending = revealOnReady.current;
        if (!frameReady || !pending || pending.page !== page || !catalog[page]?.some(section => section.id === pending.section)) return;
        const request = window.requestAnimationFrame(() => {
            send({ type: "website-highlight", section: pending.section, field: pending.field ?? null, scroll: true });
            revealOnReady.current = null;
        });
        return () => window.cancelAnimationFrame(request);
    }, [frameReady, page, catalog]);
    useEffect(() => {
        const pending = focusOnReady.current;
        if (modal || !frameReady || !pending || pending.page !== page || pending.section !== selectedId) return;
        const request = window.requestAnimationFrame(() => {
            const button = root.current?.querySelector<HTMLButtonElement>(`[data-studio-section-select="${CSS.escape(pending.section)}"]`);
            if (button?.getClientRects().length) button.focus({ preventScroll: true });
            else frame.current?.focus({ preventScroll: true });
            focusOnReady.current = null;
        });
        return () => window.cancelAnimationFrame(request);
    }, [frameReady, page, selectedId, modal, catalog]);
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
    useEffect(() => { selections.current[page] = { section: selectedId, field: focusedField }; }, [page, selectedId, focusedField]);
    const selectedCatalog = catalog[page]?.find(section => section.id === selected?.id);
    const fields = selected?.kind ? customSectionFields(selected) : selectedCatalog?.fields || [];
    const activeField = fields.find(field => field.id === focusedField);
    const visibleFields = activeField ? [activeField] : fields;
    const nameOf = (section: WebsiteSection) => section.name || catalog[page]?.find(s => s.id === section.id)?.name || "Section";
    const change = (content: WebsiteContent, group = "") => {
        if (busy || equal(content, draftRef.current)) return;
        const now = Date.now(), previous = draftRef.current;
        if (!group || editGroup.current.key !== group || now - editGroup.current.time > 1000) writeUndo([...undoRef.current.slice(-49), previous]);
        editGroup.current = { key: group, time: now }; writeRedo([]); draftRef.current = content; setDraft(content); setNotice("");
    };
    const setSections = (next: WebsiteSection[], group = "") => change({ ...draftRef.current, pages: { ...draftRef.current.pages, [page]: next } }, group);
    const currentSections = (): WebsiteSection[] => { const configured = draftRef.current.pages[page] || []; return [...configured, ...defaults.filter(section => !configured.some(s => s.id === section.id))]; };
    const updateSection = (patch: Partial<WebsiteSection>, group = "") => { if (selected) setSections(currentSections().map(section => section.id === selected.id ? { ...section, ...patch } : section), group); };
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
    const selectSection = async (id: string) => {
        if (!await flushCanvas()) return;
        setSelectedId(id); setFocusedField(undefined); setInspectorOpen(false); setPanel("canvas");
        send({ type: "website-highlight", section: id, field: null, scroll: true });
    };
    const revealSection = (next: WebsitePage, id?: string, field?: string, focus = false) => {
        const available = effectiveWebsiteSections(draftRef.current, next);
        const remembered = selections.current[next];
        const preferred = id || remembered?.section;
        const section = available.find(item => item.id === preferred) || available[0];
        if (focus) focusOnReady.current = { page: next, section: section.id };
        const nextField = section.id === preferred ? field ?? (id ? undefined : remembered?.field) : undefined;
        if (next !== page) { revealOnReady.current = { page: next, section: section.id, field: nextField }; setPage(next); setFrameReady(false); }
        setSelectedId(section.id); setFocusedField(nextField);
        setInspectorOpen(false); setPanel("canvas"); editGroup.current.key = "";
        if (next === page) {
            revealOnReady.current = catalog[page]?.some(item => item.id === section.id) ? null : { page: next, section: section.id, field: nextField };
            send({ type: "website-highlight", section: section.id, field: nextField ?? null, scroll: true });
        }
    };
    const changePage = async (next: WebsitePage) => {
        if (next === page || !await flushCanvas()) return;
        revealSection(next);
    };
    const openAdd = async (after: string | null = selected?.id || null) => { if (!await flushCanvas()) return; setInsertAfter(after); setModal("add"); };
    const updateFieldStyle = (value: WebsiteFieldStyle) => {
        if (!selected || !activeField) return;
        const fieldStyles = { ...currentSections().find(section => section.id === selected.id)?.fieldStyles };
        if (Object.keys(value).length) fieldStyles[activeField.id] = value;
        else delete fieldStyles[activeField.id];
        updateSection({ fieldStyles: Object.keys(fieldStyles).length ? fieldStyles : undefined }, `${page}:${selected.id}:${activeField.id}:style`);
    };
    const updateLink = (id: string, value: WebsiteLink | undefined) => {
        if (!selected || (value && !safeWebsiteLink(value.href))) return;
        const links = { ...currentSections().find(section => section.id === selected.id)?.links };
        if (value) links[id] = value; else delete links[id];
        updateSection({ links: Object.keys(links).length ? links : undefined });
    };
    const repositionPhoto = async () => {
        if (!selected || activeField?.kind !== "image" || !await flushCanvas()) return;
        setInspectorOpen(false); setPanel("canvas");
        send({ type: "website-photo-reposition", section: selected.id, field: activeField.id });
    };
    const replacePhoto = (field: string, url: string, description: string) => {
        const current = currentSections().find(section => section.id === selected?.id);
        const currentUrl = current?.fields[field] || fields.find(item => item.id === field)?.value;
        if (url === currentUrl) { setPhotoField(undefined); return; }
        setSections(currentSections().map(section => {
            if (section.id !== selected?.id) return section;
            const fieldStyles = { ...section.fieldStyles }, style = { ...fieldStyles[field] };
            delete style.focalX; delete style.focalY; delete style.position;
            if (Object.keys(style).length) fieldStyles[field] = style; else delete fieldStyles[field];
            const altField = section.kind && field === "photo" ? "alt" : `${field}.alt`;
            return { ...section, fields: { ...section.fields, [field]: url, [altField]: description }, fieldStyles: Object.keys(fieldStyles).length ? fieldStyles : undefined };
        }));
        setPhotoField(undefined);
    };
    const move = (id: string, direction: number) => {
        const next = currentSections(), index = next.findIndex(s => s.id === id), other = index + direction;
        if (index < 0 || other < 0 || other >= next.length) return;
        [next[index], next[other]] = [next[other], next[index]]; setSections(next);
    };
    const toggle = (id: string) => setSections(currentSections().map(s => s.id === id ? { ...s, hidden: !s.hidden } : s));
    const addSection = (template: Omit<WebsiteSection, "id">) => {
        const id = `custom-${crypto.randomUUID()}`;
        const section: WebsiteSection = { ...template, id };
        try {
            change(insertWebsiteSection(draftRef.current, page, section, insertAfter === undefined ? selected?.id || null : insertAfter));
            revealOnReady.current = { page, section: id };
            focusOnReady.current = { page, section: id };
            setSelectedId(id); setInspectorTab("content"); setModal(null); setPanel("canvas"); setInspectorOpen(false); setFocusedField(undefined);
        } catch (error) { setError(error instanceof Error ? error.message : "Unable to add this section."); }
    };
    const setLayout = (id: string, settings: WebsiteLayoutSettings, group = "") => {
        const limits = { paddingTop: [0, 240], paddingBottom: [0, 240], columnSplit: [25, 75], gap: [0, 96] };
        const patch: WebsiteLayoutSettings = {};
        for (const [key, value] of Object.entries(settings)) {
            if (!Object.prototype.hasOwnProperty.call(limits, key) || typeof value !== "number" || !Number.isFinite(value)) return;
            const [min, max] = limits[key as keyof typeof limits];
            Object.assign(patch, { [key]: Math.round(Math.min(max, Math.max(min, value))) });
        }
        setSections(currentSections().map(section => section.id === id ? { ...section, layoutSettings: { ...section.layoutSettings, ...patch } } : section), group);
    };
    const reorder = (id: string, before: string | null) => {
        const current = currentSections(), item = current.find(section => section.id === id);
        if (!item || id === before || (before !== null && !current.some(section => section.id === before))) return;
        const next = current.filter(section => section.id !== id);
        next.splice(before === null ? next.length : next.findIndex(section => section.id === before), 0, item);
        setSections(next); setSelectedId(id);
    };
    const sectionAction = async (id: string, action: WebsiteSectionAction) => {
        if (busy || !await flushCanvas()) return;
        const current = currentSections(), section = current.find(item => item.id === id);
        if (!section) return;
        setSelectedId(id);
        try {
            if (action === "edit") {
                setFocusedField(undefined); setInspectorTab("content"); setInspectorOpen(true); setLeftPanel(null); setPanel("settings");
                send({ type: "website-highlight", section: id, field: null, scroll: true });
            } else if (action === "add-before" || action === "add-after") {
                if (current.length >= 40) throw new Error("This page already has 40 sections. Remove an added section before adding another.");
                setInsertAfter(action === "add-after" ? id : current[current.findIndex(item => item.id === id) - 1]?.id || null); setModal("add");
            } else if (action === "up" || action === "down") move(id, action === "up" ? -1 : 1);
            else if (action === "hide") toggle(id);
            else if (action === "rename" || action === "copy") {
                if (action === "copy" && !section.kind) return;
                const others = (Object.keys(websitePages) as WebsitePage[]).filter(key => key !== page);
                setSectionDialog({ page, id, name: nameOf(section), target: others.find(key => effectiveWebsiteSections(draftRef.current, key).length < 40) || others[0] });
                setModal(action);
            } else if (action === "duplicate") {
                const copyId = `custom-${crypto.randomUUID()}`;
                change(duplicateWebsiteSection(draftRef.current, page, id, copyId));
                revealSection(page, copyId, undefined, true); setNotice("Section duplicated. Make the new copy your own.");
            } else if (action === "remove") {
                const index = current.findIndex(item => item.id === id), neighbor = current[index + 1] || current[index - 1];
                change(removeWebsiteSection(draftRef.current, page, id));
                revealSection(page, neighbor?.id, undefined, true); setNotice("Section removed from your draft. Undo brings it back.");
            }
        } catch (error) { setError(error instanceof Error ? error.message : "Unable to update this section."); }
    };
    const applySectionDialog = () => {
        if (!sectionDialog) return;
        try {
            if (modal === "rename") {
                const name = sectionDialog.name.trim();
                if (!name) return;
                change({ ...draftRef.current, pages: { ...draftRef.current.pages, [sectionDialog.page]: effectiveWebsiteSections(draftRef.current, sectionDialog.page).map(section => section.id === sectionDialog.id ? { ...section, name } : section) } });
                setNotice("Section renamed in your editor.");
            } else if (modal === "copy") {
                const id = `custom-${crypto.randomUUID()}`;
                change(copyWebsiteSection(draftRef.current, sectionDialog.page, sectionDialog.id, sectionDialog.target, id));
                revealSection(sectionDialog.target, id, undefined, true); setLeftPanel("sections");
                setNotice(`Copied to ${websitePages[sectionDialog.target].name}. You can edit this copy independently.`);
            }
            setModal(null); setSectionDialog(null);
        } catch (error) { setError(error instanceof Error ? error.message : "Unable to update this section."); }
    };
    const history = async (direction: "undo" | "redo") => {
        if (busy || !await flushCanvas()) return;
        const source = direction === "undo" ? undoRef.current : redoRef.current;
        if (!source.length) return;
        if (direction === "undo") { writeRedo([...redoRef.current, draftRef.current]); writeUndo(source.slice(0, -1)); }
        else { writeUndo([...undoRef.current, draftRef.current]); writeRedo(source.slice(0, -1)); }
        const previous = draftRef.current, restored = source[source.length - 1];
        const affected = getChangedWebsitePages(previous, restored);
        draftRef.current = restored; setDraft(restored); editGroup.current.key = "";
        const target = affected.includes(page) ? page : affected[0];
        if (target) {
            const before = effectiveWebsiteSections(previous, target), after = effectiveWebsiteSections(restored, target);
            const changedSection = after.find(section => !equal(section, before.find(item => item.id === section.id)));
            revealSection(target, changedSection?.id || selections.current[target]?.section, undefined, true);
        }
        setNotice(target && target !== page ? `${direction === "undo" ? "Undid" : "Redid"} a change on ${websitePages[target].name}.` : "");
    };
    const persistDraft = (manual = false): Promise<boolean> => {
        if (draftSave.current) return draftSave.current;
        const current = documentRef.current, snapshot = draftRef.current;
        if (!current || equal(current.draft, snapshot)) return Promise.resolve(!!current);
        if (autosavePaused && !manual) return Promise.resolve(false);
        setSaving(true);
        const operation = (async () => {
            try {
                let next: WebsiteDocument;
                try {
                    next = await api<WebsiteDocument>("/api/admin/website", { method: "PUT", body: JSON.stringify({ revision: current.revision, action: "draft", content: snapshot }) });
                } catch (error) {
                    // A successful save with a lost response is safe to acknowledge on retry.
                    if (!(error instanceof WebsiteApiError) || error.status !== 409) throw error;
                    const latest = await api<WebsiteDocument>("/api/admin/website");
                    if (!equal(latest.draft, normalizeWebsiteContent(snapshot))) throw error;
                    next = latest;
                }
                documentRef.current = next; setDocument(next);
                // Keep edits made during the request. The next autosave will persist them.
                if (equal(draftRef.current, snapshot)) { draftRef.current = next.draft; setDraft(next.draft); }
                setAutosavePaused(false); setSaveConflict(false); setError("");
                return true;
            } catch (error) {
                setAutosavePaused(true); setSaveConflict(error instanceof WebsiteApiError && error.status === 409);
                setError(error instanceof WebsiteApiError && error.status === 409 ? error.message : "Autosave is paused. Your edits are still here. Check your connection and retry saving.");
                return false;
            } finally { draftSave.current = null; setSaving(false); }
        })();
        draftSave.current = operation;
        return operation;
    };
    const autosave = useRef(persistDraft); autosave.current = persistDraft;
    useEffect(() => {
        if (!document || !dirty || busy || saving || autosavePaused) return;
        const timer = window.setTimeout(() => { void autosave.current(); }, 1200);
        return () => window.clearTimeout(timer);
    }, [document, draft, dirty, busy, saving, autosavePaused]);
    const save = async (action: "draft" | "publish" | "restore" | "recover", options?: { versionId?: string; page?: WebsitePage; pages?: WebsitePage[] }) => {
        if (!documentRef.current || busyRef.current || busy) return;
        busyRef.current = true;
        try {
            if (!await flushCanvas()) return;
            if (action === "draft") {
                if (draftSave.current && !await draftSave.current) return;
                await persistDraft(true); return;
            }
            setBusy(action);
            if (draftSave.current && !await draftSave.current) return;
            // Recovery checkpoints this draft atomically before restoring the selected version.
            if (action !== "recover" && !await persistDraft(true)) return;
            const next = await api<WebsiteDocument>("/api/admin/website", { method: "PUT", body: JSON.stringify({ revision: documentRef.current.revision, action, content: draftRef.current, ...options }) });
            documentRef.current = next; setDocument(next); draftRef.current = next.draft; setDraft(next.draft); editGroup.current.key = "";
            if (action === "restore" || action === "recover") { writeUndo([]); writeRedo([]); setFocusedField(undefined); }
            setModal(null); setAutosavePaused(false); setSaveConflict(false); setError("");
            setNotice(action === "publish" ? "Your selected pages are live." : action === "recover" ? "Version restored to your private draft. Review it, then publish when you’re ready." : "Your previous published website is restored.");
        } catch (error) { setError(error instanceof Error ? error.message : "Unable to save website changes."); }
        finally { busyRef.current = false; setBusy(null); }
    };
    const downloadDraft = () => {
        const url = URL.createObjectURL(new Blob([JSON.stringify(draftRef.current, null, 2)], { type: "application/json" }));
        const link = window.document.createElement("a"); link.href = url; link.download = "nikki-website-unsaved-draft.json"; link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    const openVersions = async () => { if (await flushCanvas()) setModal("versions"); };
    useEffect(() => {
        const receive = (event: MessageEvent) => {
            if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow || event.data?.page !== page) return;
            const data = event.data;
            if (data.type === "website-flushed") { const complete = flushRequests.current.get(data.requestId); flushRequests.current.delete(data.requestId); complete?.(true); return; }
            if (data.type === "website-catalog") { setCatalog(current => ({ ...current, [page]: data.sections })); setFrameReady(true); }
            if (busy || preview) return;
            if (data.type === "website-shortcut") { if (data.shortcut === "save" && document && !equal(document.draft, draftRef.current)) void save("draft"); else if (data.shortcut === "undo" || data.shortcut === "redo") history(data.shortcut); return; }
            if (data.type === "website-insert" && (data.after === null || sections.some(s => s.id === data.after)) && sections.length < 40) { void openAdd(data.after); return; }
            if (!sections.some(s => s.id === data.section)) return;
            if (data.type === "website-select") {
                if (data.intent === "inline") inlineBase.current = { draft: draftRef.current, undo: undoRef.current, redo: redoRef.current };
                setSelectedId(data.section); setFocusedField(data.field);
                setInspectorTab(data.intent === "design" ? "design" : "content");
                if (data.intent === "inline") setInspectorOpen(false);
                else if (data.intent !== "photo") { setInspectorOpen(true); if (data.intent !== "select") setPanel("settings"); setLeftPanel(null); }
                if (data.intent === "photo") setPhotoField(data.field);
                if (data.intent === "edit") { setPanel("settings"); setTimeout(() => window.document.getElementById(`website-field-${data.field}`)?.focus(), 50); }
            }
            if (data.type === "website-layout-change" && data.settings && typeof data.settings === "object") setLayout(data.section, data.settings, String(data.gestureId || ""));
            if (data.type === "website-photo-frame" && typeof data.field === "string" && /^[a-zA-Z0-9.-]{1,160}$/.test(data.field)
                && [data.focalX, data.focalY].every(value => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100)) {
                setSections(currentSections().map(section => {
                    if (section.id !== data.section) return section;
                    const style = { ...section.fieldStyles?.[data.field], focalX: data.focalX, focalY: data.focalY };
                    delete style.position;
                    return { ...section, fieldStyles: { ...section.fieldStyles, [data.field]: style } };
                }));
            }
            if (data.type === "website-reorder" && (data.before === null || typeof data.before === "string")) reorder(data.section, data.before);
            if (data.type === "website-section-action") {
                void sectionAction(data.section, data.action);
            }
            if (data.type === "website-field-change" && typeof data.field === "string" && typeof data.value === "string") {
                if (data.cancelled && inlineBase.current) {
                    const original = inlineBase.current;
                    draftRef.current = original.draft; setDraft(original.draft); writeUndo(original.undo); writeRedo(original.redo); editGroup.current.key = ""; inlineBase.current = null;
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
    const canvasWidth = mobile ? 390 : 1280, scale = zoom === "actual" ? 1 : Math.min(1, previewWidth / canvasWidth);
    const status = busy === "load" ? "Opening your studio" : busy === "draft" ? "Saving draft…" : busy === "publish" ? "Publishing…" : busy === "restore" || busy === "recover" ? "Restoring…" : autosavePaused ? "Autosave paused" : saving ? "Saving draft…" : dirty ? "Changes waiting to save" : unpublished ? "Draft saved" : "All changes published";
    return <section ref={root} className={`website-editor ${preview ? "is-previewing" : ""} ${leftPanel ? "is-left-open" : ""} ${inspectorOpen ? "is-inspector-open" : ""} studio-panel-${panel}`} aria-label="Website editor" aria-busy={!!busy}>
        <header className="website-editor-toolbar">
            <div className="studio-title"><span className="studio-mark"><Icon name="layers" /></span><div><h2>Website studio</h2></div></div>
            <div className={`studio-save-state ${dirty ? "is-unsaved" : ""}`} role="status"><span />{status}</div>
            <div className="website-toolbar-actions">
                <button className="studio-icon-button" title="Version history" aria-label="Version history" disabled={!document || !!busy} onClick={() => void openVersions()}><Icon name="history" /></button><div className="studio-history"><button className="studio-icon-button" title="Undo (⌘Z / Ctrl+Z)" aria-label="Undo" disabled={!undo.length || !!busy} onClick={() => history("undo")}><Icon name="undo" /></button><button className="studio-icon-button" title="Redo (⇧⌘Z / Ctrl+Shift+Z)" aria-label="Redo" disabled={!redo.length || !!busy} onClick={() => history("redo")}><Icon name="redo" /></button></div>
                <button className="studio-button studio-preview-toggle" aria-pressed={preview} disabled={!document || !!busy} onClick={async () => { if (await flushCanvas()) setPreview(!preview); }}><Icon name={preview ? "close" : "eye"} />{preview ? "Back to editing" : "Preview"}</button>
                <button className="studio-button studio-save-button" disabled={!document || !!busy || saving || !dirty} onClick={() => void save("draft")}>Save now</button>
                <button className="studio-button studio-button-primary" disabled={!document || !!busy || !unpublished} onClick={async () => { if (await flushCanvas()) setModal("publish"); }}>Publish<Icon name="arrow" /></button>
            </div>
        </header>
        {error && <div className="studio-banner is-error" role="alert"><span>{error}</span>{autosavePaused && !saveConflict && <button disabled={saving} onClick={() => void save("draft")}>Retry saving</button>}{dirty && <button onClick={downloadDraft}>Download my draft</button>}<button disabled={saving || !!busy} onClick={() => dirty ? setModal("reload") : void load()}>Reload saved draft</button><button className="studio-icon-button" aria-label="Dismiss error" onClick={() => setError("")}><Icon name="close" /></button></div>}
        {notice && <div className="studio-banner" role="status"><Icon name="check" /><span>{notice}</span><button className="studio-icon-button" aria-label="Dismiss notification" onClick={() => setNotice("")}><Icon name="close" /></button></div>}
        <nav className="studio-mobile-nav" aria-label="Editor panels">{([ ["pages", "layers", "Pages & sections"], ["canvas", "desktop", "Canvas"], ["settings", "settings", "Edit section"] ] as const).map(([value, icon, label]) => <button key={value} aria-pressed={panel === value} onClick={() => { setPanel(value); if (value === "pages") setLeftPanel("pages"); if (value === "settings") setInspectorOpen(true); }}><Icon name={icon} />{label}</button>)}</nav>
        <div className="website-editor-workspace" inert={!!busy || !document || !!modal || !!photoField}>
            <nav className="studio-tool-rail" aria-label="Design tools">
                <button className={leftPanel === "pages" ? "is-active" : ""} aria-pressed={leftPanel === "pages"} onClick={() => { setLeftPanel(leftPanel === "pages" ? null : "pages"); setInspectorOpen(false); }}><Icon name="pages" /><span>Pages</span></button>
                <button className={leftPanel === "sections" ? "is-active" : ""} aria-pressed={leftPanel === "sections"} onClick={() => { setLeftPanel(leftPanel === "sections" ? null : "sections"); setInspectorOpen(false); }}><Icon name="layers" /><span>Sections</span></button>
                <button className="studio-rail-add" onClick={() => void openAdd()} disabled={sections.length >= 40}><Icon name="plus" /><span>Add</span></button>
                <span className="studio-rail-divider" />
                <button className={inspectorOpen ? "is-active" : ""} aria-pressed={inspectorOpen} onClick={() => { setInspectorOpen(!inspectorOpen || inspectorTab !== "design"); setInspectorTab("design"); setLeftPanel(null); }}><Icon name="settings" /><span>Design</span></button>
            </nav>
            <aside className="website-editor-pages" data-panel={leftPanel || "pages"} aria-label="Pages and sections">
                <header className="studio-drawer-heading"><h3>{leftPanel === "sections" ? "Page sections" : "Your pages"}</h3><button className="studio-icon-button" aria-label="Close pages and sections" onClick={() => { setLeftPanel(null); setPanel("canvas"); }}><Icon name="close" /></button></header>
                <div className="studio-pages-block"><div className="studio-panel-heading"><span>Site pages</span><small>{Object.keys(websitePages).length}</small></div><nav className="studio-page-list" aria-label="Website pages">{(Object.entries(websitePages) as [WebsitePage, typeof websitePages[WebsitePage]][]).map(([key, value]) => <button key={key} aria-current={page === key ? "page" : undefined} onClick={() => void changePage(key)}><Icon name="pages" /><span>{value.name}</span>{changedPages.includes(key) && <i title="Unpublished changes" aria-label="Unpublished changes" />}{page === key && <Icon name="arrow" />}</button>)}</nav></div>
                <div className="studio-sections-block"><div className="studio-panel-heading"><span>{websitePages[page].name} sections</span><small>{sections.length}</small></div>
                    <WebsiteSectionOutline sections={sections} catalog={catalog[page] || []} selectedId={selected?.id} onSelect={id => void selectSection(id)} onAction={(id, action) => void sectionAction(id, action)} onReorder={async (id, before) => { if (!await flushCanvas()) return false; reorder(id, before); return true; }} />
                    <button className="studio-add-section" disabled={sections.length >= 40} onClick={() => void openAdd()}><Icon name="plus" />Add a section</button>
                </div>
                <div className="studio-library-note"><Icon name="photo" /><p>Originals live in Mountain Turtle.<br /><span>Choose their website photos here.</span></p></div>
                <button className="studio-history-link" onClick={() => void openVersions()}>Version history</button>{document?.previousPublished && <button className="studio-history-link" onClick={() => setModal("restore")}>Restore previous publication</button>}
            </aside>
            <main className="website-editor-canvas" aria-label="Website canvas"><div className="website-preview-toolbar"><div className="studio-page-address"><Icon name="pages" /><label><span className="studio-sr-only">Editing page</span><select value={page} onChange={event => void changePage(event.target.value as WebsitePage)}>{Object.entries(websitePages).map(([key, value]) => <option key={key} value={key}>{value.name}</option>)}</select></label><span className="studio-draft-tag">{preview ? "Preview" : "Draft"}</span></div><div className="studio-device-control" aria-label="Preview size"><button aria-label="Desktop preview" aria-pressed={!mobile} onClick={() => setMobile(false)}><Icon name="desktop" /></button><button aria-label="Phone preview" aria-pressed={mobile} onClick={() => setMobile(true)}><Icon name="phone" /></button></div><a href={websitePages[page].path} target="_blank" rel="noreferrer" title="Open published page" aria-label="Open published page"><Icon name="external" /></a></div>
                <div className="studio-canvas-surround"><div ref={frameContainer} className={`website-preview-frame ${mobile ? "is-phone" : ""} ${zoom === "actual" ? "is-actual-size" : ""}`}><iframe ref={frame} src={`${websitePages[page].path}?websitePreview=1`} title={`${websitePages[page].name} draft preview`} style={{ width: canvasWidth, height: `${100 / Math.max(scale, .1)}%`, transform: `scale(${scale})`, transformOrigin: "top left" }} onLoad={sendPreview} sandbox="allow-same-origin allow-scripts" />{!frameReady && <div className="studio-canvas-loading"><span className="studio-spinner" />Opening {websitePages[page].name.toLowerCase()}…</div>}</div></div>
                <footer className="studio-canvas-footer"><span>{preview ? "Preview your draft · links and forms are paused" : "Click to select · double-click text to write"}</span><label className="studio-zoom-control"><span>{canvasWidth}px</span><select aria-label="Canvas zoom" value={zoom} onChange={event => setZoom(event.target.value as "fit" | "actual")}><option value="fit">Fit · {Math.round(Math.min(1, previewWidth / canvasWidth) * 100)}%</option><option value="actual">100%</option></select></label></footer>
            </main>
            <aside ref={inspector} className="website-editor-inspector" aria-label="Section settings">{selected && <>
                <div className="studio-inspector-heading"><button className="studio-icon-button studio-close-inspector" aria-label="Close editing controls" onClick={() => { setInspectorOpen(false); setPanel("canvas"); }}><Icon name="close" /></button><span className="studio-eyebrow">{activeField ? nameOf(selected) : "SELECTED SECTION"}</span><h3>{activeField ? activeField.kind === "image" ? "Photograph" : activeField.label : nameOf(selected)}</h3><span className="studio-section-kind">{activeField ? "Selected on your page" : selected.kind ? "Custom section" : "Original section"}{selected.hidden ? " · Hidden" : ""}</span>{activeField && <button className="studio-text-button studio-all-content" onClick={() => setFocusedField(undefined)}>View whole section</button>}</div>
                <div className="studio-inspector-tabs" role="tablist" aria-label="Section settings tabs"><button role="tab" aria-selected={inspectorTab === "content"} aria-controls="studio-content-panel" onClick={() => setInspectorTab("content")}>Content</button><button role="tab" aria-selected={inspectorTab === "design"} aria-controls="studio-design-panel" onClick={() => setInspectorTab("design")}>Design</button></div>
                {selected.hidden && <div className="studio-hidden-note"><Icon name="hide" /><p>This section is hidden.<button onClick={() => toggle(selected.id)}>Show on website</button></p></div>}
                {inspectorTab === "content" ? <div id="studio-content-panel" role="tabpanel" className="website-field-list">{visibleFields.map((field, index) => <div className={`website-edit-field ${focusedField === field.id ? "is-focused" : ""}`} key={field.id}>{field.kind === "image" ? <>
                    <div className="studio-field-caption"><span>Photograph{fields.filter(f => f.kind === "image").length > 1 ? ` ${(fields.filter(f => f.kind === "image").findIndex(f => f.id === field.id) + 1)}` : ""}</span></div>
                    <button className="studio-photo-card" id={`website-field-${field.id}`} onClick={() => setPhotoField(field.id)}>{(selected.fields[field.id] || field.value) ? <img src={selected.fields[field.id] || field.value} alt={selected.fields[`${field.id}.alt`] || field.alt || "Selected photograph"} loading="lazy" /> : <div className="studio-empty-photo"><Icon name="photo" /><span>Find the right photograph</span></div>}<span className="studio-photo-change"><Icon name="photo" />{selected.fields[field.id] || field.value ? "Replace photo" : "Choose photo"}</span></button>
                    {!selected.kind && <details className="studio-photo-description"><summary>Photo description</summary><label><span className="studio-sr-only">Photo description {index + 1}</span><textarea value={selected.fields[`${field.id}.alt`] ?? field.alt ?? ""} rows={2} placeholder="Describe this image for visitors who use a screen reader." onChange={event => setField(`${field.id}.alt`, event.target.value)} /></label></details>}
                </> : <label><span className="studio-field-caption">{field.label}{fields.filter(f => f.label === field.label).length > 1 ? ` ${fields.slice(0, index + 1).filter(f => f.label === field.label).length}` : ""}</span><textarea id={`website-field-${field.id}`} value={selected.fields[field.id] ?? field.value} maxLength={12000} rows={field.label === "Heading" || field.id === "title" ? 3 : Math.min(7, Math.max(2, Math.ceil((selected.fields[field.id] ?? field.value).length / 55)))} placeholder={field.id === "title" ? "A heading in your own words…" : field.id === "body" ? "Tell your story…" : field.id === "eyebrow" ? "Optional introduction" : "Write here…"} onFocus={() => send({ type: "website-highlight", section: selected.id, field: field.id, scroll: false })} onChange={event => setField(field.id, event.target.value)} onBlur={() => { editGroup.current.key = ""; }} /></label>}{field.link && (activeField || visibleFields.findIndex(item => item.link?.id === field.link?.id) === index) && <WebsiteLinkEditor key={`${selected.id}:${field.link.id}`} original={field.link} value={selected.links?.[field.link.id] || field.link} customized={!!selected.links?.[field.link.id]} onChange={value => updateLink(field.link!.id, value)} />}</div>)}{!fields.length && <p className="studio-muted">{frameReady ? "Select a section with text or photos to start editing." : "Finding this section’s content…"}</p>}<p className="studio-inspector-tip">Your words, your photographs.<br />Changes stay in your draft until you publish.</p></div> : <div id="studio-design-panel" role="tabpanel" className="studio-design-fields">
                    {activeField && <WebsiteFieldDesign field={activeField} value={selected.fieldStyles?.[activeField.id] || {}} onChange={updateFieldStyle} onReposition={() => void repositionPhoto()} />}
                    <details className="studio-section-design-group" open={!activeField}><summary>Section layout</summary><div>
                    <label>Section name<input value={selected.name || selectedCatalog?.name || ""} maxLength={100} onChange={event => updateSection({ name: event.target.value }, `${page}:${selected.id}:name`)} /><small>Only shown in your editor.</small></label>
                    <fieldset><legend>Layout</legend><div className="studio-layout-options">{([["original", "Original", "layers"], ["centered", "Centered", "text"], ["wide", "Full width", "desktop"], ["reversed", "Swap sides", "split"]] as const).map(([value, label, icon]) => <button key={value} aria-pressed={(selected.layout || "original") === value} onClick={() => updateSection({ layout: value })}><span className={`studio-layout-diagram is-${value}`}><i /><i /><i /></span><span>{label}</span><Icon name={icon} /></button>)}</div></fieldset>
                    <fieldset><legend>Breathing room</legend><div className="studio-segment-control">{([["compact", "Close"], ["original", "Original"], ["generous", "Airy"]] as const).map(([value, label]) => <button key={value} aria-pressed={(selected.spacing || "original") === value} onClick={() => { const settings = { ...selected.layoutSettings }; delete settings.paddingTop; delete settings.paddingBottom; updateSection({ spacing: value, layoutSettings: Object.keys(settings).length ? settings : undefined }); }}>{label}</button>)}</div></fieldset>
                    <fieldset className="studio-layout-sliders"><legend>Fine-tune your layout</legend><p>Drag the handles on your page, or use these controls.</p>{([ ["paddingTop", "Space above", 0, 240, 8, "px"], ["paddingBottom", "Space below", 0, 240, 8, "px"], ...(selectedCatalog?.supportsColumns || selected.kind === "split" ? [["columnSplit", "First column", 25, 75, 1, "%"], ["gap", "Space between", 0, 96, 8, "px"]] : []) ] as [keyof WebsiteLayoutSettings, string, number, number, number, string][]).map(([key,label,min,max,step,unit]) => <label key={key}><span>{label}<output>{selected.layoutSettings?.[key] ?? selectedCatalog?.layoutDefaults?.[key] ?? (key === "columnSplit" ? 50 : 0)}{unit}</output></span><input type="range" min={min} max={max} step={step} aria-label={label} value={selected.layoutSettings?.[key] ?? selectedCatalog?.layoutDefaults?.[key] ?? (key === "columnSplit" ? 50 : 0)} onChange={event => setLayout(selected.id, { [key]: Number(event.target.value) }, `${page}:${selected.id}:layout:${key}`)} /></label>)}{selected.layoutSettings && <button className="studio-text-button" onClick={() => updateSection({ layoutSettings: undefined })}>Use original spacing and proportions</button>}</fieldset>
                    <fieldset><legend>Background</legend><div className="studio-color-swatches">{["#ffffff", "#f5f1eb", "#e9e0d7", "#e7e9e2", "#ebe2e8"].map(color => <button key={color} aria-label={`Background ${color}`} aria-pressed={selected.background === color} style={{ background: color }} onClick={() => updateSection({ background: color })}>{selected.background === color && <Icon name="check" />}</button>)}<label className="studio-custom-color" title="Custom background color"><span className="studio-sr-only">Custom background color</span><input type="color" value={selected.background || "#ffffff"} onChange={event => updateSection({ background: event.target.value }, `${page}:${selected.id}:background`)} /><Icon name="plus" /></label></div>{selected.background && <button className="studio-text-button" onClick={() => updateSection({ background: undefined })}>Use original background</button>}</fieldset>
                    <div className="studio-section-maintenance">{selected.kind && <button className="studio-button" disabled={sections.length >= 40} onClick={() => void sectionAction(selected.id, "duplicate")}>Duplicate section</button>}{selected.kind && <button className="studio-button" onClick={() => void sectionAction(selected.id, "copy")}>Copy to another page</button>}<button className="studio-button" onClick={async () => { if (await flushCanvas()) setModal("reset"); }}>Reset section design</button>{selected.kind && <button className="studio-text-button is-danger" onClick={() => void sectionAction(selected.id, "remove")}>Remove section</button>}</div>
                    </div></details>
                </div>}
            </>}</aside>
        </div>
        {busy === "load" && <div className="studio-initial-loading" role="status"><span className="studio-spinner" /><h3>Opening your studio</h3><p>A little space for your next idea.</p></div>}
        {photoField && <WebsitePhotoPicker currentUrl={selected?.fields[photoField] || fields.find(f => f.id === photoField)?.value} onChoose={(url, description) => replacePhoto(photoField, url, description)} onClose={() => setPhotoField(undefined)} />}
        {modal === "rename" && sectionDialog && <Modal title="Give this section a name." onClose={() => setModal(null)} className="studio-section-dialog"><form onSubmit={event => { event.preventDefault(); applySectionDialog(); }}><p>A name that helps you find it. Only shown in your editor.</p><label className="studio-section-dialog-label">Section name<input data-autofocus value={sectionDialog.name} maxLength={100} required onChange={event => setSectionDialog({ ...sectionDialog, name: event.target.value })} /></label><footer><button type="button" className="studio-button" onClick={() => setModal(null)}>Cancel</button><button type="submit" className="studio-button studio-button-primary" disabled={!sectionDialog.name.trim()}>Save name<Icon name="check" /></button></footer></form></Modal>}
        {modal === "copy" && sectionDialog && <Modal title="Give it another home." onClose={() => setModal(null)} className="studio-section-dialog"><form onSubmit={event => { event.preventDefault(); applySectionDialog(); }}><p>Copy <strong>{sectionDialog.name}</strong> to another page with its photographs, words, links, and design.</p><fieldset className="studio-copy-pages"><legend>Choose a page</legend>{(Object.keys(websitePages) as WebsitePage[]).filter(key => key !== sectionDialog.page).map(key => {
            const count = effectiveWebsiteSections(draft, key).length, full = count >= 40;
            return <label key={key} className={`${sectionDialog.target === key ? "is-selected" : ""}${full ? " is-full" : ""}`}><input type="radio" name="copy-page" value={key} checked={sectionDialog.target === key} disabled={full} onChange={() => setSectionDialog({ ...sectionDialog, target: key })} /><Icon name="pages" /><span><strong>{websitePages[key].name}</strong><small>{full ? "This page has 40 sections" : `Add after its ${count} sections`}</small></span>{sectionDialog.target === key && <Icon name="check" />}</label>;
        })}</fieldset><p className="studio-copy-note">The original stays on {websitePages[sectionDialog.page].name}. You can edit each copy independently. Changes stay in your draft until you publish.</p><footer><button type="button" className="studio-button" onClick={() => setModal(null)}>Cancel</button><button type="submit" className="studio-button studio-button-primary" disabled={effectiveWebsiteSections(draft, sectionDialog.target).length >= 40}>Copy to {websitePages[sectionDialog.target].name}<Icon name="arrow" /></button></footer></form></Modal>}
        {modal === "add" && <Modal title="Make it your own." onClose={() => setModal(null)} className="studio-section-library-dialog"><p>{insertAfter === null ? <>Add at the top of <strong>{websitePages[page].name}</strong>.</> : <>Add after <strong>{nameOf(sections.find(section => section.id === insertAfter) || selected)}</strong>.</>} Start with a layout, then choose your photographs and words.</p><WebsiteSectionLibrary onChoose={addSection} /></Modal>}
        {modal === "versions" && <Modal title="Your website, over time." onClose={() => { if (!busy) setModal(null); }} className="studio-versions-dialog"><WebsiteVersionHistory versions={document?.history || []} page={page} busy={!!busy} onRecover={(versionId, restorePage) => void save("recover", { versionId, page: restorePage })} /></Modal>}
        {modal === "publish" && document && <Modal title="Choose what goes live." onClose={() => { if (!busy) setModal(null); }} className="studio-publish-dialog"><WebsitePublishReview draft={draft} published={document.published} busy={!!busy} onCancel={() => setModal(null)} onPublish={pages => void save("publish", { pages })} /></Modal>}
        {(modal === "restore" || modal === "reset" || modal === "reload") && <Modal title={modal === "restore" ? "Restore your previous publication?" : modal === "reset" ? "Return to the original design?" : "Reload the saved draft?"} onClose={() => setModal(null)}><p>{modal === "restore" ? "This replaces your current draft and live website with the previous published version." : modal === "reset" ? "This resets the selected section’s text, photos, links, spacing, and background. You can undo this while you’re editing." : "Your unsaved edits will be replaced with the latest saved draft."}</p><footer><button className="studio-button" onClick={() => setModal(null)}>Keep editing</button><button className="studio-button studio-button-primary" onClick={() => { const action = modal; setModal(null); if (action === "restore") void save("restore"); else if (action === "reload") void load(); else updateSection({ fields: {}, fieldStyles: undefined, layoutSettings: undefined, links: undefined, layout: "original", spacing: "original", background: undefined }); }}>{modal === "restore" ? "Restore publication" : modal === "reset" ? "Reset section" : "Reload draft"}</button></footer></Modal>}
    </section>;
}
