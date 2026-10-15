import { useState } from "react";
import { websitePages, type WebsitePage, type WebsiteVersion } from "../shared/website.js";
import "../styles/website-history.css";

const date = (value: string) => new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
export default function WebsiteVersionHistory({ versions, page, busy, onRecover }: { versions: WebsiteVersion[]; page: WebsitePage; busy: boolean; onRecover: (id: string, page?: WebsitePage) => void }) {
    const [selectedId, setSelectedId] = useState<string>();
    const [scope, setScope] = useState<"page" | "website">("page");
    const selected = versions.find(version => version.id === selectedId);
    return <div className="studio-version-history">
        <p>Your draft saves automatically. Choose an earlier version to bring back into your private draft. Your live website changes only when you publish.</p>
        {!versions.length ? <div className="studio-version-empty"><strong>A fresh start.</strong><p>Your first edit will start the version history. We keep up to 30 recent versions.</p></div> : <div className="studio-version-workspace">
            <ol aria-label="Saved website versions">{versions.map(version => <li key={version.id}><button disabled={busy} aria-pressed={selectedId === version.id} onClick={() => setSelectedId(version.id)}><span className={`studio-version-dot is-${version.label}`} /><span><strong>{version.label === "publish" ? "Published website" : version.label === "restore" ? "Restored website" : "Saved draft"}</strong><time dateTime={version.createdAt}>{date(version.createdAt)}</time></span><small>v{version.revision}</small></button></li>)}</ol>
            <div className="studio-version-detail">{selected ? <><span className="studio-eyebrow">RESTORE TO DRAFT</span><h3>{date(selected.createdAt)}</h3><p>Choose how much to bring back. Your current draft is kept in history before restoring.</p><fieldset disabled={busy}><legend>Restore</legend><label><input type="radio" name="version-scope" checked={scope === "page"} onChange={() => setScope("page")} /><span><strong>{websitePages[page].name} only</strong><small>Keep your other pages as they are.</small></span></label><label><input type="radio" name="version-scope" checked={scope === "website"} onChange={() => setScope("website")} /><span><strong>Entire website</strong><small>Bring all five pages back to this version.</small></span></label></fieldset><p className="studio-version-note">A page with no saved edits returns to its original design.</p><button disabled={busy} className="studio-button studio-button-primary" onClick={() => onRecover(selected.id, scope === "page" ? page : undefined)}>{busy ? "Restoring…" : "Restore to private draft"}</button></> : <div className="studio-version-empty"><strong>Room to experiment.</strong><p>Select a version to choose what you’d like to restore.</p></div>}</div>
        </div>}
    </div>;
}
