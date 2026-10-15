import { useState } from "react";
import type { WebsiteSection } from "../shared/website.js";
import { curatedStories, storyPhotoUrl } from "../data/curatedPortfolio";
import { portfolioPreview } from "../functions/portfolioPreview";
import "../styles/website-section-library.css";

type Kind = NonNullable<WebsiteSection["kind"]>;
type SectionTemplate = Omit<WebsiteSection, "id">;
type Category = "Photography" | "Story & details" | "Bookings";
export interface WebsiteSectionLibraryItem { kind: Kind; title: string; description: string; category: Category; detail: string; create: () => SectionTemplate }
function asset(storyIndex: number, photoIndex = 0) {
    const story = curatedStories[storyIndex] || curatedStories[0];
    const photo = story.photos[photoIndex] || story.photos[story.cover];
    return { url: storyPhotoUrl(story, photo), alt: photo.alt };
}
const portrait = asset(0), landscape = asset(1);
const gallery = Array.from({ length: 6 }, (_, index) => asset(0, index));
const blankHeading = () => ({ eyebrow: "", title: "", body: "" });
export const sectionLibraryItems: WebsiteSectionLibraryItem[] = [
    { kind: "hero", title: "Statement photograph", description: "A full photograph with words overlaid.", category: "Photography", detail: "Set the scene with a photograph, a headline, and an optional invitation to get in touch.", create: () => ({ kind: "hero", name: "Statement photograph", fields: { ...blankHeading(), button: "", photo: landscape.url, alt: landscape.alt } }) },
    { kind: "split", title: "Photo & story", description: "A photograph beside a personal story.", category: "Story & details", detail: "Pair your words with a photograph. Drag the divider on the page to find the right balance.", create: () => ({ kind: "split", name: "Photo & story", fields: { ...blankHeading(), photo: portrait.url, alt: portrait.alt } }) },
    { kind: "gallery", title: "Photo gallery", description: "Six moments, one cohesive collection.", category: "Photography", detail: "A responsive collection of up to six photographs. Choose each image and its crop directly on the page.", create: () => ({ kind: "gallery", name: "Photo gallery", fields: { ...blankHeading(), ...Object.fromEntries(gallery.flatMap((photo, index) => [[`photo-${index + 1}`, photo.url], [`photo-${index + 1}.alt`, photo.alt]])) } }) },
    { kind: "photo", title: "Full photograph", description: "Give one photograph room to breathe.", category: "Photography", detail: "Let a single photograph lead, with an optional caption below it.", create: () => ({ kind: "photo", name: "Full photograph", fields: { photo: landscape.url, alt: landscape.alt, caption: "" } }) },
    { kind: "text", title: "Editorial text", description: "A thoughtful space for your own words.", category: "Story & details", detail: "Introduce yourself, explain your approach, or tell the story behind your photographs.", create: () => ({ kind: "text", name: "Editorial text", fields: blankHeading() }) },
    { kind: "invitation", title: "Inquiry invitation", description: "Give visitors a clear next step.", category: "Bookings", detail: "A focused invitation that links to your inquiry page. Write the heading, supporting text, and link in your own voice.", create: () => ({ kind: "invitation", name: "Inquiry invitation", background: "#eee9e5", fields: { ...blankHeading(), button: "" } }) },
    { kind: "faq", title: "Questions & answers", description: "Help clients feel ready to reach out.", category: "Story & details", detail: "Add up to three questions and answers. Visitors can open each answer on your published website.", create: () => ({ kind: "faq", name: "Questions & answers", fields: { ...blankHeading(), ...Object.fromEntries(Array.from({ length: 3 }, (_, index) => [[`question-${index + 1}`, ""], [`answer-${index + 1}`, ""]]).flat()) } }) },
    { kind: "packages", title: "Session collections", description: "Present your offerings side by side.", category: "Bookings", detail: "Name up to three collections, describe what each includes, and add your own prices when you’re ready.", create: () => ({ kind: "packages", name: "Session collections", fields: { ...blankHeading(), ...Object.fromEntries(Array.from({ length: 3 }, (_, index) => ["title", "body", "price"].map(key => [`package-${key}-${index + 1}`, ""])).flat()) } }) },
];
function PreviewText({ centered = false, button = false, large = false }: { centered?: boolean; button?: boolean; large?: boolean }) {
    return <div className={`section-library-text${centered ? " is-centered" : ""}`} aria-hidden="true"><small>{large ? "YOUR WORDS, YOUR WAY" : ""}</small><strong>{large ? "A place for your story." : ""}</strong><i /><i /><i />{button && <span>{large ? "Your invitation" : ""}<b>↗</b></span>}</div>;
}
function SectionPreview({ kind, large = false }: { kind: Kind; large?: boolean }) {
    const picture = (photo: { url: string; alt: string }, className?: string) => <img src={portfolioPreview(photo.url)} alt={large ? photo.alt : ""} loading="lazy" className={className} />;
    return <div className={`section-library-visual is-${kind}${large ? " is-large" : ""}`}>
        {kind === "hero" && <>{picture(landscape)}<PreviewText large={large} button /></>}
        {kind === "split" && <>{picture(portrait)}<PreviewText large={large} /></>}
        {kind === "gallery" && <><div className="section-library-gallery-heading"><PreviewText centered large={large} /></div><div className="section-library-gallery-images">{gallery.slice(0, large ? 6 : 3).map((photo, index) => <div key={index}>{picture(photo)}</div>)}</div></>}
        {kind === "photo" && <>{picture(landscape)}<div className="section-library-caption">{large ? "Your photograph. Your optional caption." : <i />}</div></>}
        {kind === "text" && <PreviewText large={large} />}
        {kind === "invitation" && <PreviewText large={large} centered button />}
        {kind === "faq" && <><PreviewText large={large} /><div className="section-library-faq-lines">{[1, 2, 3].map(index => <div key={index}><span>{large ? `Your question ${index}` : <i />}</span><b>+</b></div>)}</div></>}
        {kind === "packages" && <><PreviewText large={large} centered /><div className="section-library-package-cards">{[1, 2, 3].map(index => <div key={index}><strong>{large ? `Collection ${index}` : <i />}</strong><i /><i /><span>{large ? "Your pricing" : <i />}</span></div>)}</div></>}
    </div>;
}
export default function WebsiteSectionLibrary({ onChoose }: { onChoose: (section: SectionTemplate) => void }) {
    const [category, setCategory] = useState<Category | "All sections">("All sections");
    const [selected, setSelected] = useState<Kind>("hero");
    const item = sectionLibraryItems.find(value => value.kind === selected)!;
    const matches = sectionLibraryItems.filter(value => category === "All sections" || value.category === category);
    const chooseCategory = (value: Category | "All sections") => { setCategory(value); if (value !== "All sections" && item.category !== value) setSelected(sectionLibraryItems.find(candidate => candidate.category === value)!.kind); };
    return <div className="website-section-library">
        <div className="section-library-categories" role="group" aria-label="Section categories">{(["All sections", "Photography", "Story & details", "Bookings"] as const).map(value => <button type="button" key={value} aria-pressed={category === value} onClick={() => chooseCategory(value)}>{value}</button>)}</div>
        <div className="section-library-workspace">
            <div className="section-library-list" aria-label="Section designs">{matches.map(value => <button className={`section-library-card${selected === value.kind ? " is-selected" : ""}`} type="button" key={value.kind} aria-pressed={selected === value.kind} onClick={() => setSelected(value.kind)}>
                <SectionPreview kind={value.kind} /><div className="section-library-card-caption"><strong>{value.title}</strong><span>{value.description}</span>{selected === value.kind && <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m5 10 3 3 7-7" /></svg>}</div>
            </button>)}</div>
            <aside className="section-library-detail" aria-label="Selected section preview"><div className="section-library-detail-heading"><span>{item.category}</span><h3>{item.title}</h3><p>{item.detail}</p></div><div className="section-library-full-preview"><SectionPreview kind={item.kind} large /></div><p className="section-library-note">{["hero", "photo", "split", "gallery"].includes(item.kind) ? "Starts with photographs from your portfolio. Choose any photo and make it yours." : "Start with a layout, then add your own words."} Text in this preview is a guide.</p></aside>
        </div>
        <div className="section-library-footer"><div><strong>{item.title}</strong><span>You can edit every photograph and word after adding it.</span></div><button type="button" className="section-library-add" onClick={() => onChoose(item.create())}><span aria-hidden="true">+</span>Add section</button></div>
    </div>;
}
