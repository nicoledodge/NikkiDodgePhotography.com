import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { safeWebsiteLink, websitePages, type WebsiteLink } from "../shared/website.js";
import "../styles/website-link-editor.css";

type Props = { value: WebsiteLink; original: WebsiteLink; customized: boolean; onChange: (next: WebsiteLink | undefined) => void };
type Destination = "page" | "web" | "email" | "phone";
const destinations: Array<{ value: Destination; label: string }> = [
    { value: "page", label: "Website page" }, { value: "web", label: "Web address" },
    { value: "email", label: "Email address" }, { value: "phone", label: "Phone number" },
];
const pages = Object.values(websitePages);
function destinationOf(href: string): Destination {
    return /^mailto:/i.test(href) ? "email" : /^tel:/i.test(href) ? "phone" : href.startsWith("/") || href.startsWith("#") ? "page" : "web";
}
function inputOf(href: string): string { return href.replace(/^(?:mailto:|tel:)/i, ""); }
function pageOf(href: string): string { return pages.find(page => page.path === href)?.path || "custom"; }
function describeLink(link: WebsiteLink): string {
    return pages.find(page => page.path === link.href)?.name || inputOf(link.href).replace(/^https:\/\//i, "");
}
function LinkIcon({ type }: { type: Destination }) {
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {type === "page" && <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h4" /></>}
        {type === "web" && <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c-5 5-5 13 0 18M12 3c5 5 5 13 0 18" /></>}
        {type === "email" && <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 6 9 7 9-7" /></>}
        {type === "phone" && <path d="m5 3 4 5-2 3a15 15 0 0 0 6 6l3-2 5 4-1 2C11 23 1 13 3 5Z" />}
    </svg>;
}
export default function WebsiteLinkEditor({ value, original, customized, onChange }: Props) {
    const id = useId();
    const input = useRef<HTMLInputElement>(null);
    const [destination, setDestination] = useState<Destination>(() => destinationOf(value.href));
    const [page, setPage] = useState(() => pageOf(value.href));
    const [address, setAddress] = useState(() => inputOf(value.href));
    const [newTab, setNewTab] = useState(value.newTab === true);
    const [error, setError] = useState("");
    useEffect(() => {
        setDestination(destinationOf(value.href)); setPage(pageOf(value.href));
        setAddress(inputOf(value.href)); setNewTab(value.newTab === true); setError("");
    }, [value.href, value.newTab, original.href, original.newTab]);
    const trimmed = address.trim();
    const href = destination === "page" ? page === "custom" ? trimmed : page
        : destination === "email" ? `mailto:${trimmed.replace(/^mailto:/i, "")}`
        : destination === "phone" ? `tel:${trimmed.replace(/^tel:/i, "").replace(/\s/g, "")}`
        : !trimmed || /^[a-z][a-z\d+.-]*:/i.test(trimmed) || trimmed.startsWith("//") ? trimmed : `https://${trimmed}`;
    const isWebAddress = /^https:\/\//i.test(href);
    const next: WebsiteLink = { href, ...(destination === "web" && isWebAddress && newTab ? { newTab: true } : {}) };
    const pending = next.href !== value.href || Boolean(next.newTab) !== Boolean(value.newTab);
    const changeDestination = (nextDestination: Destination) => {
        if (nextDestination === destination) return;
        setDestination(nextDestination); setError("");
        if (nextDestination === destinationOf(value.href)) { setAddress(inputOf(value.href)); setPage(pageOf(value.href)); setNewTab(value.newTab === true); }
        else { setAddress(""); setPage("/Contact"); setNewTab(false); }
    };
    const apply = () => {
        if (!pending) return;
        const correctType = destination === "page" ? /^\/(?!\/)|^#/.test(href) : destination === "web" ? isWebAddress : destination === "email" ? /^mailto:/i.test(href) : /^tel:/i.test(href);
        if (!correctType || !safeWebsiteLink(href)) {
            setError(destination === "page" ? "Choose a page, or enter a path beginning with / or a section beginning with #."
                : destination === "web" ? "Enter a complete web address, such as https://example.com."
                : destination === "email" ? "Enter a complete email address, such as name@example.com."
                : "Enter a phone number, including the country code when needed.");
            input.current?.focus(); return;
        }
        setError(""); onChange(next);
    };
    const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => { if (event.key === "Enter") { event.preventDefault(); apply(); } };
    const reset = () => {
        setDestination(destinationOf(original.href)); setPage(pageOf(original.href));
        setAddress(inputOf(original.href)); setNewTab(original.newTab === true); setError(""); onChange(undefined);
    };
    const label = destination === "page" ? "Page path or section" : destination === "web" ? "Web address" : destination === "email" ? "Email address" : "Phone number";
    const placeholder = destination === "page" ? "/page or #section" : destination === "web" ? "https://example.com" : destination === "email" ? "name@example.com" : "+1 303 555 0123";
    return <section className="website-link-editor" aria-label="Link destination">
        <div className="website-link-current"><span className="website-link-current-icon"><LinkIcon type={destinationOf(value.href)} /></span><div><span>THIS LINK OPENS</span><strong title={value.href}>{describeLink(value)}</strong></div>{value.newTab && /^https:\/\//i.test(value.href) && <span className="website-link-current-tab" title="Opens in a new tab" aria-label="Opens in a new tab">↗</span>}</div>
        <fieldset className="website-link-destinations"><legend>Link to</legend><div>{destinations.map(item => <button key={item.value} type="button" aria-pressed={destination === item.value} onClick={() => changeDestination(item.value)}><LinkIcon type={item.value} /><span>{item.label}</span></button>)}</div></fieldset>
        {destination === "page" && <label className="website-link-input" htmlFor={`${id}-page`}>Website page<select id={`${id}-page`} value={page} onChange={event => { setPage(event.target.value); setError(""); if (event.target.value === "custom" && !address.startsWith("/") && !address.startsWith("#")) setAddress(""); }}>{pages.map(item => <option value={item.path} key={item.path}>{item.name}</option>)}<option value="custom">Another page or section…</option></select></label>}
        {(destination !== "page" || page === "custom") && <label className="website-link-input" htmlFor={`${id}-address`}>{label}<input ref={input} id={`${id}-address`} type={destination === "phone" ? "tel" : "text"} inputMode={destination === "email" ? "email" : destination === "phone" ? "tel" : "url"} value={address} placeholder={placeholder} maxLength={2048} autoComplete="off" spellCheck={false} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : `${id}-hint`} onChange={event => { setAddress(event.target.value); setError(""); }} onKeyDown={onKeyDown} /></label>}
        {destination === "web" && <label className="website-link-new-tab"><input type="checkbox" checked={newTab} onChange={event => setNewTab(event.target.checked)} /><span>Open in a new tab</span></label>}
        {error ? <p id={`${id}-error`} className="website-link-error" role="alert">{error}</p> : <p id={`${id}-hint`} className="website-link-hint">{destination === "email" ? "Opens the visitor’s email app." : destination === "phone" ? "Starts a call on supported devices." : destination === "page" ? "Send visitors to a page on your website." : "A secure web address starts with https://."}</p>}
        <div className="website-link-actions"><button type="button" className="website-link-apply" disabled={!pending} onClick={apply}>Apply link<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M4 10h12m-5-5 5 5-5 5" /></svg></button>{customized && <button type="button" className="website-link-reset" onClick={reset}>Use original link</button>}</div>
        <p className="website-link-draft-note" role="status">{pending ? "Apply to update this link in your draft." : "Publish the page when you’re ready to share this link."}</p>
    </section>;
}
