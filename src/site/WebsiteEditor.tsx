import { useEffect, useRef, useState } from "react";
import { websitePages, type WebsiteContent, type WebsiteDocument, type WebsiteField, type WebsitePage, type WebsiteSection, type WebsiteSectionCatalog } from "../shared/website.js";
import type { MediaItem } from "../shared/crm.js";
import { customSectionFields } from "./PageComposer";
import "../styles/website-editor.css";
async function api<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(path, { credentials: "same-origin", ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to save website changes.");
    return data as T;
}
export default function WebsiteEditor({ onDirtyChange }: { onDirtyChange: (dirty: boolean) => void }) {
    const [document, setDocument] = useState<WebsiteDocument | null>(null);
    const [draft, setDraft] = useState<WebsiteContent>({ pages: {} });
    const [page, setPage] = useState<WebsitePage>("home");
    const [catalog, setCatalog] = useState<Partial<Record<WebsitePage, WebsiteSectionCatalog[]>>>({});
    const [selectedId, setSelectedId] = useState("original-0");
    const [focusedField, setFocusedField] = useState<string>();
    const [mobile, setMobile] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [confirmRestore, setConfirmRestore] = useState(false);
    const [notice, setNotice] = useState("");
    const [undo, setUndo] = useState<WebsiteContent[]>([]);
    const [redo, setRedo] = useState<WebsiteContent[]>([]);
    const photoDialog = useRef<HTMLElement>(null);
    const [photoField, setPhotoField] = useState<string>();
    const [assets, setAssets] = useState<MediaItem[] | null>(null);
    const [photoSearch, setPhotoSearch] = useState("");
    const [photoLimit, setPhotoLimit] = useState(40);
    const [photoError, setPhotoError] = useState("");
    const [previewWidth, setPreviewWidth] = useState(800);
    const frameContainer = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const observer = new ResizeObserver(entries => setPreviewWidth(entries[0].contentRect.width));
        if (frameContainer.current) observer.observe(frameContainer.current);
        return () => observer.disconnect();
    }, []);
    const frame = useRef<HTMLIFrameElement>(null);
    const dirty = document !== null && JSON.stringify(document.draft) !== JSON.stringify(draft);
    useEffect(() => { onDirtyChange(dirty); return () => onDirtyChange(false); }, [dirty, onDirtyChange]);
    const unpublished = document !== null && JSON.stringify(document.published) !== JSON.stringify(draft);
    const load = async () => {
        setError("");
        try { const value = await api<WebsiteDocument>("/api/admin/website"); setDocument(value); setDraft(value.draft); setUndo([]); setRedo([]); }
        catch (e) { setError(e instanceof Error ? e.message : "Unable to load your website."); }
    };
    useEffect(() => { void load(); }, []);
    useEffect(() => {
        const receive = (event: MessageEvent) => {
            if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow || event.data?.page !== page) return;
            if (event.data.type === "website-catalog") { setCatalog(current => ({ ...current, [page]: event.data.sections })); }
            if (event.data.type === "website-select") { setSelectedId(event.data.section); setFocusedField(event.data.field); }
        };
        window.addEventListener("message", receive);
        return () => window.removeEventListener("message", receive);
    }, [page]);
    const sendPreview = () => frame.current?.contentWindow?.postMessage({ type: "website-draft", content: draft }, window.location.origin);
    useEffect(() => { sendPreview(); }, [draft, page]);
    useEffect(() => {
        const warn = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [dirty]);
    useEffect(() => {
        if (!focusedField) return;
        const input = window.document.getElementById(`website-field-${focusedField}`);
        input?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        if (input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement) input.focus({ preventScroll: true });
    }, [focusedField, selectedId]);
    useEffect(() => {
        if (!photoField || assets) return;
        let active = true;
        setPhotoError("");
        void api<MediaItem[]>("/api/admin/media").then(items => { if (active) setAssets(items.filter(item => /\.(jpe?g|png|webp|avif|gif)$/i.test(item.key))); }).catch(e => { if (active) setPhotoError(e instanceof Error ? e.message : "Unable to load photos."); });
        return () => { active = false; };
    }, [photoField, assets]);
    useEffect(() => {
        if (!photoField) return;
        const previouslyFocused = window.document.activeElement;
        const close = (event: KeyboardEvent) => {
            if (event.key === "Escape") setPhotoField(undefined);
            if (event.key === "Tab") {
                const controls = photoDialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input,a[href],select,textarea');
                if (!controls?.length) return;
                const first = controls[0], last = controls[controls.length - 1];
                if (event.shiftKey && window.document.activeElement === first) { event.preventDefault(); last.focus(); }
                else if (!event.shiftKey && window.document.activeElement === last) { event.preventDefault(); first.focus(); }
            }
        };
        window.addEventListener("keydown", close);
        return () => { window.removeEventListener("keydown", close); if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus(); };
    }, [photoField]);
    const defaults = websitePages[page].sections.map((name, index) => ({ id: `original-${index}`, name, fields: {} }));
    const configured = draft.pages[page] || [];
    const sections: WebsiteSection[] = [...configured, ...defaults.filter(section => !configured.some(s => s.id === section.id))];
    const selected = sections.find(section => section.id === selectedId) || sections[0];
    const selectedCatalog = catalog[page]?.find(section => section.id === selected?.id);
    const fields = selected?.kind ? customSectionFields(selected) : selectedCatalog?.fields || [];
    const change = (content: WebsiteContent) => { setUndo(current => [...current.slice(-29), draft]); setRedo([]); setDraft(content); setNotice(""); };
    const setSections = (next: WebsiteSection[]) => change({ ...draft, pages: { ...draft.pages, [page]: next } });
    const updateSection = (patch: Partial<WebsiteSection>) => { if (selected) setSections(sections.map(section => section.id === selected.id ? { ...section, ...patch } : section)); };
    const setField = (field: string, value: string) => { if (selected) updateSection({ fields: { ...selected.fields, [field]: value } }); };
    const move = (index: number, direction: number) => {
        const next = [...sections]; const other = index + direction;
        if (other < 0 || other >= next.length) return;
        [next[index], next[other]] = [next[other], next[index]]; setSections(next);
    };
    const addSection = (kind: NonNullable<WebsiteSection["kind"]>) => {
        const id = `custom-${crypto.randomUUID()}`;
        const section: WebsiteSection = { id, kind, name: kind === "split" ? "Photo & text" : kind === "invitation" ? "Inquiry invitation" : kind === "photo" ? "Photograph" : "Text section", fields: { title: "", body: "" } };
        const index = sections.findIndex(s => s.id === selected?.id);
        const next = [...sections]; next.splice(index + 1, 0, section); setSections(next); setSelectedId(id);
    };
    const save = async (action: "draft" | "publish" | "restore") => {
        if (!document) return;

        setBusy(true); setError(""); setNotice("");
        try {
            const next = await api<WebsiteDocument>("/api/admin/website", { method: "PUT", body: JSON.stringify({ revision: document.revision, action, content: draft }) });
            setDocument(next); setDraft(next.draft);
            setNotice(action === "draft" ? "Draft saved. Your live website is unchanged." : action === "publish" ? "Your website changes are published." : "The previous website is restored.");
        } catch (e) { setError(e instanceof Error ? e.message : "Unable to save website changes."); }
        finally { setBusy(false); }
    };
    const photoMatches = (assets || []).filter(asset => asset.relativeKey.toLowerCase().includes(photoSearch.toLowerCase()));
    return <section className="website-editor" aria-label="Website editor">
        <header className="website-editor-toolbar">
            <div><h2>Your website</h2><p>{dirty ? "Unsaved draft" : unpublished ? "Draft saved · unpublished changes" : "Published website"}{document?.publishedAt ? ` · Last published ${new Date(document.publishedAt).toLocaleString()}` : ""}</p></div>
            <div className="website-toolbar-actions">
                <button type="button" className="admin-secondary-button" disabled={!undo.length || busy} onClick={() => { setRedo(current => [...current, draft]); setDraft(undo[undo.length - 1]); setUndo(current => current.slice(0, -1)); }}>Undo</button>
                <button type="button" className="admin-secondary-button" disabled={!redo.length || busy} onClick={() => { setUndo(current => [...current, draft]); setDraft(redo[redo.length - 1]); setRedo(current => current.slice(0, -1)); }}>Redo</button>
                <button type="button" className="admin-secondary-button" disabled={!document || busy || !dirty} onClick={() => void save("draft")}>Save draft</button>
                <button type="button" className="admin-primary-button" disabled={!document || busy || !unpublished} onClick={() => void save("publish")}>{busy ? "Saving…" : "Publish changes"}</button>
            </div>
        </header>
        {error && <div className="admin-alert admin-alert-error" role="alert">{error} <button type="button" onClick={() => { if (!dirty || window.confirm("Discard your unsaved changes and reload the saved draft?")) void load(); }}>Reload saved draft</button></div>}
        {notice && <p className="admin-alert admin-alert-success" role="status">{notice}</p>}
        {confirmRestore && <div className="website-restore-confirm" role="alertdialog" aria-label="Restore previous website"><p>Restore the previous published website? This replaces your current draft and published version.</p><button type="button" className="admin-secondary-button" onClick={() => setConfirmRestore(false)}>Keep editing</button><button type="button" className="admin-primary-button" disabled={busy} onClick={() => { setConfirmRestore(false); void save("restore"); }}>Restore now</button></div>}
        <div className="website-editor-workspace">
            <aside className="website-editor-pages" aria-label="Pages and sections">
                <label>Page<select value={page} onChange={event => { setPage(event.target.value as WebsitePage); setSelectedId("original-0"); setFocusedField(undefined); }}>{Object.entries(websitePages).map(([key, value]) => <option key={key} value={key}>{value.name}</option>)}</select></label>
                <h3>Sections</h3><p>Choose a section, or click it in the preview.</p>
                <ol className="website-section-list">{sections.map((section, index) => <li key={section.id} className={section.id === selected?.id ? "is-selected" : ""}>
                    <button type="button" className="website-section-select" aria-pressed={section.id === selected?.id} onClick={() => { setSelectedId(section.id); setFocusedField(undefined); frame.current?.contentWindow?.postMessage({ type: "website-highlight", section: section.id }, window.location.origin); }}>{section.name || catalog[page]?.find(s => s.id === section.id)?.name || "Section"}{section.hidden ? " (hidden)" : ""}</button>
                    <div><button type="button" aria-label={`Move ${section.name || "section"} up`} disabled={index === 0} onClick={() => move(index, -1)}>↑</button><button type="button" aria-label={`Move ${section.name || "section"} down`} disabled={index === sections.length - 1} onClick={() => move(index, 1)}>↓</button><button type="button" aria-label={`${section.hidden ? "Show" : "Hide"} ${section.name || "section"}`} onClick={() => setSections(sections.map(s => s.id === section.id ? { ...s, hidden: !s.hidden } : s))}>{section.hidden ? "Show" : "Hide"}</button></div>
                </li>)}</ol>
                <h3>Add a section</h3><div className="website-add-sections">{(["text", "photo", "split", "invitation"] as const).map(kind => <button type="button" key={kind} disabled={sections.length >= 40} onClick={() => addSection(kind)}>{kind === "split" ? "Photo & text" : kind === "invitation" ? "Inquiry" : kind === "photo" ? "Photograph" : "Text"} +</button>)}</div>
                <p className="website-library-note">Your photo library lives in Mountain Turtle. This editor chooses the photos shown on your website.</p>
                {document?.previousPublished && <button type="button" className="website-restore-button" disabled={busy} onClick={() => setConfirmRestore(true)}>Restore previous published version</button>}
            </aside>
            <div className="website-editor-canvas"><div className="website-preview-toolbar"><strong>Live draft preview</strong><div><button type="button" aria-pressed={!mobile} onClick={() => setMobile(false)}>Desktop</button><button type="button" aria-pressed={mobile} onClick={() => setMobile(true)}>Phone</button><a href={websitePages[page].path} target="_blank" rel="noreferrer">View published ↗</a></div></div>
                <div ref={frameContainer} className={mobile ? "website-preview-frame is-phone" : "website-preview-frame"}><iframe ref={frame} src={`${websitePages[page].path}?websitePreview=1`} title={`${websitePages[page].name} draft preview`} style={{ width: mobile ? 390 : 1280, height: `${100 / Math.min(1, previewWidth / (mobile ? 390 : 1280))}%`, transform: `scale(${Math.min(1, previewWidth / (mobile ? 390 : 1280))})`, transformOrigin: "top left" }} onLoad={sendPreview} sandbox="allow-same-origin allow-scripts" /></div>
            </div>
            <aside className="website-editor-inspector" aria-label="Section settings">{selected && <>
                <h3>Edit section</h3><label>Section name<input value={selected.name || selectedCatalog?.name || ""} maxLength={100} onChange={event => updateSection({ name: event.target.value })} /></label>
                <label>Layout<select value={selected.layout || "original"} onChange={event => updateSection({ layout: event.target.value as WebsiteSection["layout"] })}><option value="original">Original design</option><option value="centered">Centered</option><option value="wide">Full width</option><option value="reversed">Swap columns</option></select></label>
                <label>Spacing<select value={selected.spacing || "original"} onChange={event => updateSection({ spacing: event.target.value as WebsiteSection["spacing"] })}><option value="original">Original spacing</option><option value="compact">Compact</option><option value="generous">Generous</option></select></label>
                <label>Background<input type="color" value={selected.background || "#ffffff"} onChange={event => updateSection({ background: event.target.value })} /></label>{selected.background && <button type="button" onClick={() => updateSection({ background: undefined })}>Use original background</button>}
                <div className="website-field-list">{fields.map((field: WebsiteField, index) => <div className="website-edit-field" key={field.id}>{field.kind === "image" ? <><span>{field.label}</span>{(selected.fields[field.id] || field.value) && <img src={selected.fields[field.id] || field.value} alt={selected.fields[`${field.id}.alt`] || field.alt || "Selected website photograph"} loading="lazy" />}<button id={`website-field-${field.id}`} type="button" onClick={() => { setPhotoField(field.id); setPhotoSearch(""); setPhotoLimit(40); }}>Choose website photo</button>{!selected.kind && <label>Photo description<input value={selected.fields[`${field.id}.alt`] ?? field.alt ?? ""} onChange={event => setField(`${field.id}.alt`, event.target.value)} /></label>}</> : <label>{field.label} {fields.filter(f => f.label === field.label).length > 1 ? index + 1 : ""}<textarea id={`website-field-${field.id}`} aria-label={`${field.label} ${index + 1}`} value={selected.fields[field.id] ?? field.value} maxLength={12000} rows={field.label === "Heading" || field.id === "title" ? 3 : 4} onChange={event => setField(field.id, event.target.value)} /></label>}</div>)}</div>
                {!fields.length && <p>Loading this section’s content…</p>}
                <button type="button" onClick={() => { if (window.confirm("Reset this section’s text, photos, and layout to its original design?")) updateSection({ fields: {}, layout: "original", spacing: "original", background: undefined }); }}>Reset section design</button>
                {selected.kind && <button type="button" className="admin-danger-button" onClick={() => { setSections(sections.filter(s => s.id !== selected.id)); setSelectedId("original-0"); }}>Remove section</button>}
            </>}</aside>
        </div>
        {photoField && <div className="website-photo-backdrop" onClick={() => setPhotoField(undefined)}><section ref={photoDialog} className="website-photo-dialog" role="dialog" aria-modal="true" aria-labelledby="website-photo-title" onClick={event => event.stopPropagation()}><header><div><h2 id="website-photo-title">Choose a website photo</h2><p>Published website assets. Originals are managed in Mountain Turtle.</p></div><button autoFocus type="button" onClick={() => setPhotoField(undefined)}>Close</button></header><label>Find a photo<input type="search" value={photoSearch} placeholder="Search by session or file name" onChange={event => { setPhotoSearch(event.target.value); setPhotoLimit(40); }} /></label>{photoError && <p role="alert">{photoError}</p>}{!assets && !photoError && <p>Loading photos…</p>}<div className="website-photo-grid">{photoMatches.slice(0, photoLimit).map(asset => <button type="button" key={asset.key} onClick={() => { setField(photoField, asset.publicUrl); setPhotoField(undefined); }}><img src={asset.publicUrl} alt={asset.relativeKey} loading="lazy" /><span>{asset.relativeKey}</span></button>)}</div>{assets && !photoMatches.length && <p>No matching website photos.</p>}{photoMatches.length > photoLimit && <button type="button" onClick={() => setPhotoLimit(current => current + 40)}>Show more photos</button>}</section></div>}
    </section>;
}
