import { useMemo, useState } from "react";
import { websitePages, type WebsiteContent, type WebsitePage } from "../shared/website.js";
import { websiteChanges, type WebsitePageChange, type WebsiteSectionChange } from "../shared/websiteChanges.js";
import Icon from "./WebsiteIcon";
import "../styles/website-publish.css";

const count = (amount: number, singular: string, plural = `${singular}s`) => `${amount} ${amount === 1 ? singular : plural}`;
function summary(change: WebsitePageChange): string {
    const { sections } = change;
    const totals = { added: sections.filter(section => section.added).length, removed: sections.filter(section => section.removed).length,
        text: sections.reduce((sum, section) => sum + section.text, 0), photos: sections.reduce((sum, section) => sum + section.photos, 0), links: sections.reduce((sum, section) => sum + section.links, 0), design: sections.filter(section => section.design).length,
        visibility: sections.filter(section => section.visibility).length };
    return [totals.added && count(totals.added, "section added", "sections added"), totals.removed && count(totals.removed, "section removed", "sections removed"),
        totals.text && count(totals.text, "text edit"), totals.photos && count(totals.photos, "photo change"), totals.links && count(totals.links, "link change"), totals.design && count(totals.design, "design change"),
        totals.visibility && count(totals.visibility, "visibility change"), change.reordered && "Order changed"].filter(Boolean).join(" · ") || "Page settings updated";
}
function sectionSummary(section: WebsiteSectionChange): string {
    if (section.added) return "New section";
    if (section.removed) return "Section removed";
    return [section.text && count(section.text, "text edit"), section.photos && count(section.photos, "photo change"), section.links && count(section.links, "link change"), section.design && "Layout or styling",
        section.visibility === "hidden" && "Hidden from visitors", section.visibility === "shown" && "Shown to visitors", section.moved && "Moved", section.renamed && "Section name"].filter(Boolean).join(" · ");
}
export default function WebsitePublishReview({ draft, published, onPublish, busy, onCancel }: {
    draft: WebsiteContent; published: WebsiteContent; onPublish: (pages: WebsitePage[]) => void; busy: boolean; onCancel: () => void;
}) {
    const changes = useMemo(() => websiteChanges(draft, published), [draft, published]);
    const [excluded, setExcluded] = useState<WebsitePage[]>([]);
    const selected = changes.filter(change => !excluded.includes(change.page)).map(change => change.page);
    const held = changes.filter(change => excluded.includes(change.page));
    return <div className="studio-publish-review">
        <p className="studio-publish-intro">Choose the pages that are ready. Everything else stays in your private draft.</p>
        {changes.length ? <fieldset className="studio-publish-selection" disabled={busy}>
            <legend>Pages with unpublished changes</legend>
            <div className="studio-publish-selection-tools"><span>{count(changes.length, "page")} updated</span><button type="button" className="studio-text-button" onClick={() => setExcluded(selected.length === changes.length ? changes.map(change => change.page) : [])}>{selected.length === changes.length ? "Clear selection" : "Select all"}</button></div>
            <ul className="studio-publish-review-list">{changes.map(change => {
                const checked = selected.includes(change.page);
                return <li key={change.page} className={checked ? "is-selected" : ""}>
                    <label className="studio-publish-page-choice"><input type="checkbox" checked={checked} aria-label={`Publish ${websitePages[change.page].name}`} onChange={() => setExcluded(current => checked ? [...current, change.page] : current.filter(page => page !== change.page))} />
                        <span className="studio-publish-page-icon"><Icon name="pages" /></span><span><strong>{websitePages[change.page].name}</strong><small>{summary(change)}</small></span><span className="studio-publish-page-state">{checked ? "Publish" : "Keep in draft"}</span>
                    </label>
                    <details className="studio-publish-section-review"><summary>Review {count(change.sections.length, "section")}</summary>
                        {change.sections.length ? <ul>{change.sections.map(section => <li key={section.id}><Icon name={section.added ? "plus" : section.removed ? "close" : section.photos ? "photo" : section.design ? "settings" : "text"} /><span><strong>{section.name}</strong><small>{sectionSummary(section)}</small></span></li>)}</ul> : <p>The saved page structure changed. Text, photographs, and design are unchanged.</p>}
                    </details>
                </li>;
            })}</ul>
        </fieldset> : <div className="studio-publish-empty"><Icon name="check" /><strong>Your pages are up to date.</strong><p>There are no unpublished changes to share.</p></div>}
        <div className="studio-publish-outcome" role="status"><Icon name={selected.length ? "check" : "pages"} /><p>{selected.length ? <><strong>{count(selected.length, "page")} will go live.</strong>{held.length > 0 && <span>{held.map(change => websitePages[change.page].name).join(", ")} {held.length === 1 ? "stays" : "stay"} in your private draft.</span>}</> : "Choose at least one page to publish."}</p></div>
        <p className="studio-publish-recovery-note">You can restore your previous publication from the editor.</p>
        <footer><button type="button" className="studio-button" disabled={busy} onClick={onCancel}>Keep editing</button><button type="button" className="studio-button studio-button-primary" disabled={busy || !selected.length} onClick={() => onPublish(selected)}>{busy ? "Publishing…" : `Publish ${count(selected.length, "page")}`}<Icon name="arrow" /></button></footer>
    </div>;
}
