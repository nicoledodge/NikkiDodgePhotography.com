import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { MediaItem } from "../shared/crm.js";
import { curatedStories, type CuratedPhoto } from "../data/curatedPortfolio";
import { portfolioDimensions, portfolioPreview } from "../functions/portfolioPreview";
import "../styles/website-photo-picker.css";

type PhotoPickerProps = { currentUrl?: string; onChoose: (url: string, description: string) => void; onClose: () => void };
type Photo = {
    id: string;
    item: MediaItem;
    thumbnail: string;
    preview: string;
    category: string;
    session: string;
    sessionLabel: string;
    title: string;
    description: string;
    curated: boolean;
    dimensions?: number[];
    members: MediaItem[];
    search: string;
};
type PhotoMetadata = { photo: CuratedPhoto; category: string; session: string; title: string; index: number };
const metadata = new Map<string, PhotoMetadata>();
curatedStories.forEach(story => story.photos.forEach((photo, index) => {
    const value = { photo, category: story.category, session: story.name, title: story.title, index };
    [photo.file, ...photo.variants.map(variant => variant.file)].forEach(file => metadata.set(`${story.category}/${story.name}/${file}`, value));
}));
const humanize = (value: string) => value.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/([a-zA-Z])(20\d\d)/g, "$1 $2").replace(/[_-]+/g, " ").replace(/\s*&\s*/g, " & ").trim();
const searchable = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
function photoPath(value: string): string {
    let path = value;
    try { path = decodeURIComponent(new URL(value, window.location.origin).pathname); } catch { /* Preserve the original path if it is not a URL. */ }
    return path.replace(/^.*?\/Portfolio\//i, "").replace(/^Portfolio\//i, "").replace(/^\/+/, "");
}
const sibling = (url: string, file: string) => url.slice(0, url.lastIndexOf("/") + 1) + encodeURIComponent(file);
function buildPhotos(items: MediaItem[]): Photo[] {
    const groups = new Map<string, MediaItem[]>();
    for (const item of items) {
        if (item.isFolderMarker || !/\.(jpe?g|png|webp|avif|gif)$/i.test(item.relativeKey || item.key)) continue;
        const path = photoPath(item.relativeKey || item.key);
        const known = metadata.get(path);
        const id = known ? `${known.category}/${known.session}/${known.photo.file}` : path.replace(/(web-[a-f\d]{8,})-\d+\.(webp|avif|jpe?g|png)$/i, "$1.$2");
        groups.set(id, [...(groups.get(id) || []), item]);
    }
    return [...groups.entries()].map(([id, members]) => {
        const known = metadata.get(photoPath(members[0].relativeKey || members[0].key));
        const resolution = (item: MediaItem) => Number((item.relativeKey || item.key).match(/web-[a-f\d]{8,}-(\d+)\./i)?.[1] || 0);
        const ordered = [...members].sort((a, b) => resolution(a) - resolution(b) || a.key.localeCompare(b.key));
        const item = ordered.find(candidate => known && photoPath(candidate.relativeKey || candidate.key).endsWith(`/${known.photo.file}`)) || ordered[ordered.length - 1];
        const path = photoPath(item.relativeKey || item.key);
        const parts = path.split("/");
        const category = known?.category || (parts.length > 1 ? parts[0] : "Website assets");
        const session = known?.session || (parts.length > 2 ? parts.slice(1, -1).join("/") : "");
        const sessionLabel = known?.title || humanize(session || category);
        const file = parts[parts.length - 1];
        const title = known ? `Photograph ${known.index + 1}` : humanize(file.replace(/\.[^.]+$/, ""));
        const existingVariant = (width: number) => known?.photo.variants.find(variant => variant.width >= width && members.some(member => photoPath(member.relativeKey || member.key).endsWith(`/${variant.file}`)))?.file;
        const thumbFile = existingVariant(640);
        const previewFile = existingVariant(960);
        return {
            id, item, members, category, session, sessionLabel, title,
            thumbnail: thumbFile ? sibling(item.publicUrl, thumbFile) : portfolioPreview(ordered[0].publicUrl),
            preview: previewFile ? sibling(item.publicUrl, previewFile) : portfolioPreview(item.publicUrl),
            description: known?.photo.alt || `${sessionLabel} · ${title}`,
            curated: Boolean(known),
            dimensions: known ? [known.photo.width, known.photo.height] : portfolioDimensions(item.publicUrl),
            search: searchable(`${path} ${sessionLabel} ${known?.photo.alt || ""}`),
        };
    }).sort((a, b) => Number(b.curated) - Number(a.curated) || a.category.localeCompare(b.category) || a.sessionLabel.localeCompare(b.sessionLabel) || a.title.localeCompare(b.title, undefined, { numeric: true }));
}
function Icon({ name }: { name: "search" | "close" | "check" | "photos" | "folder" | "arrow" }) {
    return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {name === "search" && <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></>}
        {name === "close" && <path d="m6 6 12 12M18 6 6 18" />}
        {name === "check" && <path d="m5 12 4 4L19 6" />}
        {name === "photos" && <><rect x="4" y="3" width="16" height="18" rx="2" /><circle cx="9" cy="8" r="1.5" /><path d="m4 17 5-5 4 4 3-3 4 4" /></>}
        {name === "folder" && <path d="M3 6a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v10H3Z" />}
        {name === "arrow" && <path d="M5 12h14m-5-5 5 5-5 5" />}
    </svg>;
}

export default function WebsitePhotoPicker({ currentUrl, onChoose, onClose }: PhotoPickerProps) {
    const [assets, setAssets] = useState<MediaItem[] | null>(null);
    const [error, setError] = useState("");
    const [attempt, setAttempt] = useState(0);
    const [query, setQuery] = useState("");
    const [category, setCategory] = useState("all");
    const [session, setSession] = useState("");
    const [selectedId, setSelectedId] = useState<string>();
    const [limit, setLimit] = useState(48);
    const [previewing, setPreviewing] = useState(false);
    const previewingRef = useRef(false);
    const previewClose = useRef<HTMLButtonElement>(null);
    previewingRef.current = previewing;
    const dialog = useRef<HTMLDialogElement>(null);
    const search = useRef<HTMLInputElement>(null);
    const scrollArea = useRef<HTMLDivElement>(null);
    const closeRef = useRef(onClose);
    closeRef.current = onClose;
    const photos = useMemo(() => buildPhotos(assets || []), [assets]);
    const current = useMemo(() => currentUrl ? photos.find(photo => photo.members.some(item => photoPath(item.publicUrl) === photoPath(currentUrl))) : undefined, [photos, currentUrl]);
    const selected = photos.find(photo => photo.id === (selectedId ?? current?.id));
    const selectedUrl = selected && selected.id === current?.id && currentUrl ? currentUrl : selected?.item.publicUrl;
    const categories = useMemo(() => [...new Set(photos.map(photo => photo.category))].sort((a, b) => a.localeCompare(b)), [photos]);
    const categoryPhotos = useMemo(() => photos.filter(photo => category === "all" || (category === "curated" ? photo.curated : photo.category === category)), [photos, category]);
    const sessions = useMemo(() => [...new Map(categoryPhotos.filter(photo => photo.session).map(photo => [`${photo.category}/${photo.session}`, { key: `${photo.category}/${photo.session}`, label: photo.sessionLabel }])).values()].sort((a, b) => a.label.localeCompare(b.label)), [categoryPhotos]);
    const tokens = searchable(query).trim().split(/\s+/).filter(Boolean);
    const matches = categoryPhotos.filter(photo => (!session || `${photo.category}/${photo.session}` === session) && tokens.every(token => photo.search.includes(token)));
    const chosenIsCurrent = Boolean(selected && selected.id === current?.id);

    useEffect(() => {
        const controller = new AbortController();
        setError("");
        setAssets(null);
        void fetch("/api/admin/media", { credentials: "same-origin", signal: controller.signal }).then(async response => {
            const body = await response.json();
            if (!response.ok) throw new Error(body.error || "Your website photos could not be loaded.");
            if (!Array.isArray(body)) throw new Error("Your website photos could not be loaded.");
            if (!controller.signal.aborted) setAssets(body as MediaItem[]);
        }).catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Your website photos could not be loaded."); });
        return () => controller.abort();
    }, [attempt]);

    useEffect(() => {
        const previousFocus = document.activeElement;
        const element = dialog.current;
        element?.showModal();
        search.current?.focus({ preventScroll: true });
        if (element) element.scrollTop = 0;
        const onCancel = (event: Event) => { event.preventDefault(); if (previewingRef.current) setPreviewing(false); else closeRef.current(); };
        element?.addEventListener("cancel", onCancel);
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            element?.removeEventListener("cancel", onCancel);
            element?.close();
            document.body.style.overflow = previousOverflow;
            if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
        };
    }, []);

    useEffect(() => {
        if (!previewing) return;
        const previousFocus = document.activeElement;
        previewClose.current?.focus({ preventScroll: true });
        return () => { if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true }); };
    }, [previewing]);

    useEffect(() => { setLimit(48); scrollArea.current?.scrollTo({ top: 0 }); }, [query, category, session]);
    const chooseCategory = (value: string) => { setCategory(value); setSession(""); };
    const usePhoto = () => { if (selectedUrl && selected) onChoose(selectedUrl, selected.description); };
    const countLabel = `${matches.length.toLocaleString()} ${matches.length === 1 ? "photo" : "photos"}`;

    return createPortal(<dialog ref={dialog} className="website-photo-picker" aria-labelledby="website-photo-picker-title" aria-describedby="website-photo-picker-description" onClick={event => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose(); } }}>
        <div className="photo-picker-shell" inert={previewing}>
            <header className="photo-picker-header">
                <div><span className="photo-picker-eyebrow">MAKE IT YOURS</span><h2 id="website-photo-picker-title">Choose a photograph</h2><p id="website-photo-picker-description">Find the moment that belongs on this page.</p></div>
                <button type="button" className="photo-picker-icon-button" aria-label="Close photo chooser" onClick={onClose}><Icon name="close" /></button>
            </header>
            <div className="photo-picker-body">
                <aside className="photo-picker-library" aria-label="Photo collections">
                    <span className="photo-picker-label">YOUR COLLECTIONS</span>
                    <button type="button" className={category === "all" ? "is-active" : ""} aria-pressed={category === "all"} onClick={() => chooseCategory("all")}><Icon name="photos" /><span>All photographs</span>{assets && <small>{photos.length}</small>}</button>
                    {photos.some(photo => photo.curated) && <button type="button" className={category === "curated" ? "is-active" : ""} aria-pressed={category === "curated"} onClick={() => chooseCategory("curated")}><span className="photo-picker-star" aria-hidden="true">✧</span><span>Featured stories</span></button>}
                    <div className="photo-picker-category-list">{categories.map(value => <button type="button" key={value} className={category === value ? "is-active" : ""} aria-pressed={category === value} onClick={() => chooseCategory(value)}><Icon name="folder" /><span>{humanize(value)}</span><small>{photos.filter(photo => photo.category === value).length}</small></button>)}</div>
                    <div className="photo-picker-source"><span className="photo-picker-source-dot" /><strong>Your website collection</strong><p>Manage your original photo library in Mountain Turtle.</p></div>
                </aside>
                <main className="photo-picker-browser">
                    <div className="photo-picker-filters">
                        <label className="photo-picker-search"><Icon name="search" /><span className="photo-picker-sr-only">Search photographs</span><input ref={search} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search a session, name, or moment" autoComplete="off" /></label>
                        <div className="photo-picker-filter-row"><label><span className="photo-picker-sr-only">Filter by session</span><select value={session} onChange={event => setSession(event.target.value)}><option value="">All sessions</option>{sessions.map(value => <option key={value.key} value={value.key}>{value.label}</option>)}</select></label><span role="status">{assets ? countLabel : ""}</span></div>
                    </div>
                    <div ref={scrollArea} className="photo-picker-results" aria-busy={!assets && !error}>
                        {error ? <div className="photo-picker-empty" role="alert"><Icon name="photos" /><h3>Let’s try that again</h3><p>{error}</p><button type="button" className="photo-picker-secondary" onClick={() => setAttempt(value => value + 1)}>Reload photographs</button></div> : !assets ? <><p className="photo-picker-sr-only" role="status">Loading your photographs…</p><div className="photo-picker-grid" aria-hidden="true">{Array.from({ length: 12 }, (_, index) => <div className="photo-picker-skeleton" key={index} />)}</div></> : !matches.length ? <div className="photo-picker-empty"><Icon name="search" /><h3>{photos.length ? "No photographs found" : "Your collection is ready for photos"}</h3><p>{photos.length ? "Try another name or choose a different collection." : "Photos made available for your website will appear here."}</p>{photos.length > 0 && <button type="button" className="photo-picker-secondary" onClick={() => { setQuery(""); chooseCategory("all"); }}>Show all photographs</button>}</div> : <>
                            <div className="photo-picker-grid">{matches.slice(0, limit).map(photo => <button type="button" key={photo.id} className={`photo-picker-photo${selected?.id === photo.id ? " is-selected" : ""}`} aria-label={`${photo.sessionLabel}, ${photo.description}`} aria-pressed={selected?.id === photo.id} onClick={() => setSelectedId(photo.id)}>
                                <span className="photo-picker-image"><img src={photo.thumbnail} alt="" loading="lazy" decoding="async" onError={event => { if (event.currentTarget.src !== new URL(photo.item.publicUrl, window.location.origin).href) event.currentTarget.src = photo.item.publicUrl; }} />{photo.id === current?.id && <span className="photo-picker-current">On this page</span>}<span className="photo-picker-check"><Icon name="check" /></span></span>
                                <span className="photo-picker-caption"><strong>{photo.sessionLabel}</strong><span>{photo.title}</span></span>
                            </button>)}</div>
                            {matches.length > limit && <div className="photo-picker-load-more"><p>{Math.min(limit, matches.length)} of {countLabel}</p><button type="button" className="photo-picker-secondary" onClick={() => setLimit(value => value + 48)}>Show more photographs</button></div>}
                        </>}
                    </div>
                </main>
                <aside className="photo-picker-selection" aria-label="Selected photograph">
                    {selected ? <>
                        <span className="photo-picker-label">{chosenIsCurrent ? "CURRENT PHOTOGRAPH" : "SELECTED PHOTOGRAPH"}</span>
                        <button type="button" className="photo-picker-preview photo-picker-enlarge" aria-label="View the full photograph" onClick={() => setPreviewing(true)}><img key={selected.id} src={selected.preview} alt={selected.description} onError={event => { if (event.currentTarget.src !== new URL(selected.item.publicUrl, window.location.origin).href) event.currentTarget.src = selected.item.publicUrl; }} /><span>View full photograph ↗</span></button>
                        <span className="photo-picker-selection-category">{humanize(selected.category)}</span><h3>{selected.sessionLabel}</h3><p>{selected.description}</p>
                        <dl><div><dt>Photo</dt><dd>{selected.title}</dd></div>{selected.dimensions && <div><dt>Dimensions</dt><dd>{selected.dimensions[0].toLocaleString()} × {selected.dimensions[1].toLocaleString()}</dd></div>}</dl>
                        <p className="photo-picker-publish-note">This changes your draft. Your website updates when you publish.</p>
                    </> : <div className="photo-picker-selection-empty">{currentUrl && <div className="photo-picker-preview"><img src={currentUrl} alt="Current website photograph" /></div>}<Icon name="photos" /><h3>{currentUrl ? "Find its next chapter" : "A photograph sets the feeling"}</h3><p>Select a photo to see it up close before adding it to your page.</p></div>}
                </aside>
            </div>
            <footer className="photo-picker-footer"><div>{selected ? <><strong>{chosenIsCurrent ? "Currently on your page" : "Ready for your page"}</strong><span>{selected.sessionLabel} · {selected.title}</span></> : <><strong>Your photos, thoughtfully placed.</strong><span>Select one photograph to continue.</span></>}</div><div className="photo-picker-footer-actions">{selected && <button type="button" className="photo-picker-mobile-zoom photo-picker-icon-button" aria-label="Preview selected photograph" onClick={() => setPreviewing(true)}><Icon name="photos" /></button>}<button type="button" className="photo-picker-secondary" onClick={onClose}>Cancel</button><button type="button" className="photo-picker-primary" disabled={!selectedUrl} onClick={usePhoto}>{chosenIsCurrent ? "Keep this photo" : "Use this photo"}<Icon name="arrow" /></button></div></footer>
        </div>
        {previewing && selected && <div className="photo-picker-lightbox" role="group" aria-label="Full photograph preview">
            <header><div><span className="photo-picker-eyebrow">YOUR SELECTED PHOTOGRAPH</span><h3>{selected.sessionLabel}</h3></div><button ref={previewClose} type="button" className="photo-picker-icon-button" aria-label="Return to photo collection" onClick={() => setPreviewing(false)}><Icon name="close" /></button></header>
            <div className="photo-picker-lightbox-image"><img src={selected.preview} alt={selected.description} onError={event => { if (event.currentTarget.src !== new URL(selected.item.publicUrl, window.location.origin).href) event.currentTarget.src = selected.item.publicUrl; }} /></div>
            <footer><p>{selected.description}</p><button type="button" className="photo-picker-primary" onClick={usePhoto}>{chosenIsCurrent ? "Keep this photo" : "Use this photo"}<Icon name="arrow" /></button></footer>
        </div>}
    </dialog>, document.body);
}
