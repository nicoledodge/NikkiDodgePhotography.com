import { useId, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import type { WebsiteSection, WebsiteSectionCatalog } from "../shared/website.js";
import { portfolioPreview } from "../functions/portfolioPreview";
import WebsiteIcon, { type IconName } from "./WebsiteIcon";
import WebsiteSectionActions, { type WebsiteSectionAction } from "./WebsiteSectionActions";
import { customSectionFields } from "./WebsiteSections";
import { websiteFieldStyle } from "./websiteFieldStyle";
import "../styles/website-section-outline.css";

type Props = {
    sections: WebsiteSection[];
    catalog: WebsiteSectionCatalog[];
    selectedId?: string;
    onSelect: (id: string) => void;
    onAction: (id: string, action: WebsiteSectionAction) => void;
    onReorder: (id: string, before: string | null) => Promise<boolean>;
};
const sectionKinds: Record<NonNullable<WebsiteSection["kind"]>, { label: string; icon: IconName }> = {
    text: { label: "Editorial text", icon: "text" }, photo: { label: "Photograph", icon: "photo" },
    split: { label: "Photo & story", icon: "split" }, invitation: { label: "Inquiry invitation", icon: "invitation" },
    hero: { label: "Statement photograph", icon: "photo" }, gallery: { label: "Photo gallery", icon: "photo" },
    faq: { label: "Questions & answers", icon: "text" }, packages: { label: "Session collections", icon: "layers" },
};
const plainText = (value: string) => value.replace(/\*([^*]+)\*/g, "$1").replace(/\s+/g, " ").trim();
function SectionPhoto({ url, position }: { url: string; position?: string | number }) {
    const [fallback, setFallback] = useState(false);
    const [failed, setFailed] = useState(false);
    const preview = portfolioPreview(url);
    return failed ? <WebsiteIcon name="photo" /> : <img src={fallback ? url : preview} alt="" loading="lazy" decoding="async" draggable={false} style={{ objectPosition: position }} onError={() => { if (!fallback && preview !== url) setFallback(true); else setFailed(true); }} />;
}

export default function WebsiteSectionOutline({ sections, catalog, selectedId, onSelect, onAction, onReorder }: Props) {
    const helpId = useId();
    const dragged = useRef<string | undefined>(undefined);
    const pending = useRef(false);
    const [draggedId, setDraggedId] = useState<string>();
    const [movingId, setMovingId] = useState<string>();
    const [dropBefore, setDropBefore] = useState<string | null>();
    const [announcement, setAnnouncement] = useState("");
    const nameOf = (section: WebsiteSection) => section.name || catalog.find(item => item.id === section.id)?.name || (section.kind ? sectionKinds[section.kind].label : "Section");
    const finishDrag = () => { dragged.current = undefined; setDraggedId(undefined); setDropBefore(undefined); };
    const moveSection = async (section: WebsiteSection, before: string | null, focus?: HTMLButtonElement) => {
        if (pending.current) return;
        pending.current = true; setMovingId(section.id);
        try {
            if (await onReorder(section.id, before)) {
                const remaining = sections.filter(item => item.id !== section.id);
                const position = before === null ? remaining.length + 1 : remaining.findIndex(item => item.id === before) + 1;
                setAnnouncement(`${nameOf(section)} moved to position ${position} of ${sections.length}.`);
                if (focus) requestAnimationFrame(() => { if (focus.isConnected && (document.activeElement === document.body || document.activeElement === focus)) focus.focus({ preventScroll: true }); });
            } else setAnnouncement(`${nameOf(section)} was not moved. Try again.`);
        } catch {
            setAnnouncement(`${nameOf(section)} was not moved. Try again.`);
        } finally { pending.current = false; setMovingId(undefined); }
    };
    const moveWithKeyboard = (event: KeyboardEvent<HTMLButtonElement>, section: WebsiteSection, index: number) => {
        if (!["ArrowUp", "ArrowDown"].includes(event.key) || event.altKey || event.ctrlKey || event.metaKey) return;
        event.preventDefault(); event.stopPropagation();
        if (pending.current || event.repeat) return;
        const up = event.key === "ArrowUp";
        if ((up && index === 0) || (!up && index === sections.length - 1)) {
            setAnnouncement(`${nameOf(section)} is already ${up ? "first" : "last"}.`); return;
        }
        void moveSection(section, up ? sections[index - 1].id : sections[index + 2]?.id || null, event.currentTarget);
    };
    const dragOver = (event: DragEvent, before: string | null) => {
        if (pending.current || !dragged.current || dragged.current === before || (before === null && sections[sections.length - 1]?.id === dragged.current)) return;
        event.preventDefault(); event.dataTransfer.dropEffect = "move"; setDropBefore(before);
    };
    const drop = (event: DragEvent, before: string | null) => {
        const source = sections.find(section => section.id === dragged.current);
        if (pending.current || !source || source.id === before || (before !== null && !sections.some(section => section.id === before))) return;
        event.preventDefault(); event.stopPropagation();
        finishDrag();
        void moveSection(source, before);
    };
    return <div className={`website-section-outline${draggedId ? " is-reordering" : ""}`}>
        <p className="section-outline-help" id={helpId}>Select to find it on your page. To reorder, drag the handle or focus it and press ↑ or ↓.</p>
        <ol className="section-outline-list" aria-label="Page sections in display order">
            {sections.map((section, index) => {
                const definition = catalog.find(item => item.id === section.id);
                const fields = (section.kind ? customSectionFields(section) : definition?.fields || []).map(field => ({ ...field, value: section.fields[field.id] ?? field.value }));
                const photos = fields.filter(field => field.kind === "image" && field.value);
                const text = fields.filter(field => field.kind === "text" && field.id !== "alt" && !field.id.endsWith(".alt") && field.id !== "button" && plainText(field.value));
                const summaryField = text.find(field => field.id === "title" || field.label === "Heading") || text[0];
                const summary = summaryField ? plainText(summaryField.value) : photos.length ? `${photos.length} ${photos.length === 1 ? "photograph" : "photographs"}` : section.kind ? sectionKinds[section.kind].label : "Original section";
                const name = nameOf(section);
                const selected = section.id === selectedId;
                const previewPhotos = section.kind === "gallery" ? photos.slice(0, 3) : photos.slice(0, 1);
                return <li key={section.id} aria-busy={movingId === section.id || undefined} className={`section-outline-card${selected ? " is-selected" : ""}${section.hidden ? " is-hidden" : ""}${draggedId === section.id ? " is-dragging" : ""}${dropBefore === section.id ? " is-drop-target" : ""}`} onDragOver={event => dragOver(event, section.id)} onDrop={event => drop(event, section.id)} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null) && dropBefore === section.id) setDropBefore(undefined); }}>
                    <div className="section-outline-row">
                        <button type="button" className="section-outline-drag" draggable={!movingId} title={`Move ${name}: drag or use Up and Down arrow keys`} aria-label={`Reorder ${name}`} aria-describedby={helpId} aria-keyshortcuts="ArrowUp ArrowDown" aria-disabled={!!movingId} onKeyDown={event => moveWithKeyboard(event, section, index)} onDragStart={event => { if (pending.current) { event.preventDefault(); return; } dragged.current = section.id; setDraggedId(section.id); setDropBefore(undefined); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", section.id); const card = event.currentTarget.closest("li"); if (card) event.dataTransfer.setDragImage(card, 35, 25); setAnnouncement(`Moving ${name}.`); }} onDragEnd={finishDrag}><WebsiteIcon name="grip" /><span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span></button>
                        <button type="button" className="section-outline-select" data-studio-section-select={section.id} aria-pressed={selected} aria-label={`Select ${name}${section.hidden ? ", hidden from visitors" : ""}`} onClick={() => onSelect(section.id)}>
                            <span className={`section-outline-preview${previewPhotos.length > 1 ? " is-collection" : ""}${!previewPhotos.length ? " is-text" : ""}`} aria-hidden="true">{previewPhotos.length ? previewPhotos.map(photo => <span key={`${photo.id}:${photo.value}`}><SectionPhoto url={photo.value} position={websiteFieldStyle(section.fieldStyles?.[photo.id], "image").objectPosition} /></span>) : <><WebsiteIcon name={section.kind ? sectionKinds[section.kind].icon : "text"} /><i /><i /></>}</span>
                            <span className="section-outline-copy"><strong title={name}>{name}</strong><span className="section-outline-summary" title={summary}>{summary}</span>{section.hidden && <span className="section-outline-hidden"><WebsiteIcon name="hide" />Hidden from visitors</span>}</span>
                        </button>
                        <div className="section-outline-actions"><WebsiteSectionActions name={name} hidden={section.hidden === true} portable={!!section.kind} first={index === 0} last={index === sections.length - 1} canAdd={sections.length < 40} onAction={action => onAction(section.id, action)} /></div>
                    </div>
                    {selected && <div className="section-outline-selected"><span><i />Selected</span><button type="button" onClick={() => onAction(section.id, "edit")} aria-label={`Edit ${name} content`}>Edit section<WebsiteIcon name="arrow" /></button></div>}
                </li>;
            })}
        </ol>
        {!!sections.length && <div className={`section-outline-end${dropBefore === null && draggedId ? " is-drop-target" : ""}`} onDragOver={event => dragOver(event, null)} onDrop={event => drop(event, null)} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null) && dropBefore === null) setDropBefore(undefined); }}><span>{draggedId ? "Drop here to move to the end" : "End of page"}</span></div>}
        <span className="section-outline-sr-only" role="status" aria-live="polite">{announcement}</span>
    </div>;
}
