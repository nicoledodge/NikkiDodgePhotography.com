import { Link } from "react-router-dom";
import type { CSSProperties } from "react";
import { safeWebsiteLink, type WebsiteField, type WebsiteSection } from "../shared/website.js";
import { websiteFieldStyle } from "./websiteFieldStyle";
import "../styles/website-sections.css";

const headingFields = ["eyebrow", "title", "body"];
const fieldLabels: Record<string, string> = { eyebrow: "Small introduction", title: "Heading", body: "Paragraph", caption: "Caption", button: "Link label", photo: "Photograph", alt: "Photo description" };
export function customSectionFields(section: WebsiteSection): WebsiteField[] {
    const ids = section.kind === "photo" ? ["caption"] : [...headingFields];
    if (section.kind === "invitation" || section.kind === "hero") ids.push("button");
    if (section.kind === "photo" || section.kind === "split" || section.kind === "hero") ids.push("photo", "alt");
    if (section.kind === "gallery") for (let index = 1; index <= 6; index++) ids.push(`photo-${index}`, `photo-${index}.alt`);
    if (section.kind === "faq") for (let index = 1; index <= 3; index++) ids.push(`question-${index}`, `answer-${index}`);
    if (section.kind === "packages") for (let index = 1; index <= 3; index++) ids.push(`package-title-${index}`, `package-body-${index}`, `package-price-${index}`);
    return ids.map(id => {
        const image = id === "photo" || /^photo-\d$/.test(id);
        const index = id.match(/\d+/)?.[0];
        const label = fieldLabels[id]
            || (id.startsWith("photo-") ? `Photograph ${index}${id.endsWith(".alt") ? " description" : ""}` : "")
            || (id.startsWith("question-") ? `Question ${index}` : id.startsWith("answer-") ? `Answer ${index}` : "")
            || (id.startsWith("package-title-") ? `Collection ${index} name` : id.startsWith("package-body-") ? `Collection ${index} details` : `Collection ${index} price`);
        return { id, kind: image ? "image" : "text", label, value: section.fields[id] || "", ...(id === "button" ? { link: { id: "button", href: "/Contact" } } : {}), ...(image ? { alt: section.fields[id === "photo" ? "alt" : `${id}.alt`] || "" } : {}) };
    });
}

/** Blank prompts exist only in the editor; publishing never turns them into business copy. */
export function renderWebsiteSection(section: WebsiteSection, editing: boolean, selectedField: string | null = null) {
    const fields = section.fields;
    const textProps = (field: string, placeholder: string) => {
        const style = section.fieldStyles?.[field];
        return {
            "data-website-field": field, "data-website-kind": "text",
            "data-website-selected": field === selectedField ? "true" : undefined,
            "data-website-placeholder": editing && !fields[field] ? "true" : undefined,
            "data-website-style-weight": style?.weight ? "true" : undefined,
            "data-website-style-size": style?.size ? "true" : undefined,
            "data-website-style-color": style?.color ? "true" : undefined,
            style: websiteFieldStyle(style, "text"), children: fields[field] || (editing ? placeholder : ""),
        };
    };
    const photograph = (field = "photo", alt = "alt", extraStyle?: CSSProperties) => {
        const style = section.fieldStyles?.[field];
        const props = { "data-website-field": field, "data-website-kind": "image", "data-website-selected": field === selectedField ? "true" : undefined, style: { ...extraStyle, ...websiteFieldStyle(style, "image"), ...(style?.ratio ? { minHeight: 0, maxHeight: "none" } : {}) } };
        return fields[field] ? <img src={fields[field]} alt={fields[alt] || ""} loading="lazy" {...props} /> : editing ? <button className="website-canvas-photo-placeholder" type="button" {...props}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8" cy="8" r="1.5" /><path d="m21 16-6-6-12 10" /></svg><span>Choose a photograph</span><small>From your website collection</small></button> : null;
    };
    const heading = <>
        {(fields.eyebrow || editing) && <p className="eyebrow" {...textProps("eyebrow", "Add a small introduction")} />}
        {(fields.title || editing) && <h2 {...textProps("title", "Write your heading")} />}
        {(fields.body || editing) && <p {...textProps("body", "Tell your story. Double-click to start writing.")} />}
    </>;
    const inquiry = (legacyDefault = false) => {
        const label = fields.button ?? (legacyDefault ? "Start your inquiry" : "");
        if (!label && !editing) return null;
        const props = textProps("button", "Write your invitation");
        const override = section.links?.button;
        const link = override && safeWebsiteLink(override.href) ? override : { href: "/Contact" };
        const newTab = link.newTab === true && /^https:\/\//i.test(link.href);
        const linkProps = { className: "text-link website-section-inquiry", "data-website-link": "button", target: newTab ? "_blank" : undefined, rel: newTab ? "noopener noreferrer" : undefined };
        const content = <><span {...props} data-website-link="button" data-website-placeholder={editing && !label ? "true" : undefined}>{label || (editing ? "Write your invitation" : "")}</span><span aria-hidden="true">↗</span></>;
        return link.href.startsWith("/") || link.href.startsWith("#") ? <Link {...linkProps} to={link.href}>{content}</Link> : <a {...linkProps} href={link.href}>{content}</a>;
    };
    const className = `website-custom website-custom-${section.kind} site-container`;
    if (section.kind === "hero") {
        const photoStyle = section.fieldStyles?.photo;
        return <section className={className}><div className={`website-section-hero${fields.photo ? "" : " is-empty"}`} style={photoStyle?.ratio ? { aspectRatio: websiteFieldStyle(photoStyle, "image").aspectRatio, minHeight: 0 } : undefined}>
            <div className="website-section-hero-media">{photograph("photo", "alt", { height: "100%", objectFit: "cover" })}</div>
            <div className="website-section-hero-content">{heading}{inquiry()}</div>
        </div></section>;
    }
    if (section.kind === "gallery") return <section className={className}>
        <div className="website-section-intro">{heading}</div>
        <div className="website-section-gallery">{Array.from({ length: 6 }, (_, index) => index + 1).filter(index => editing || fields[`photo-${index}`]).map(index => <figure key={index}>{photograph(`photo-${index}`, `photo-${index}.alt`)}</figure>)}</div>
    </section>;
    if (section.kind === "faq") return <section className={className}>
        <div className="website-section-intro">{heading}</div>
        <div className="website-section-questions">{Array.from({ length: 3 }, (_, index) => index + 1).filter(index => editing || fields[`question-${index}`]).map(index => editing ? <div className="website-section-question" key={index}><h3 {...textProps(`question-${index}`, `Write question ${index}`)} /><p {...textProps(`answer-${index}`, "Add your answer")} /></div> : <details className="website-section-question" key={index}><summary {...textProps(`question-${index}`, "")} />{fields[`answer-${index}`] && <p {...textProps(`answer-${index}`, "")} />}</details>)}</div>
    </section>;
    if (section.kind === "packages") return <section className={className}>
        <div className="website-section-intro">{heading}</div>
        <div className="website-section-packages">{Array.from({ length: 3 }, (_, index) => index + 1).filter(index => editing || ["title", "body", "price"].some(key => fields[`package-${key}-${index}`])).map(index => <article className="website-section-package" key={index}>
            {(editing || fields[`package-title-${index}`]) && <h3 {...textProps(`package-title-${index}`, `Name collection ${index}`)} />}
            {(editing || fields[`package-body-${index}`]) && <p {...textProps(`package-body-${index}`, "Describe what is included")} />}
            {(editing || fields[`package-price-${index}`]) && <p className="website-section-package-price" {...textProps(`package-price-${index}`, "Add your price")} />}
        </article>)}</div>
    </section>;
    return <section className={className}>
        {(section.kind === "photo" || section.kind === "split") && (fields.photo ? <figure>{photograph()}</figure> : photograph())}
        {section.kind !== "photo" && <div>{heading}{section.kind === "invitation" && inquiry(true)}</div>}
        {section.kind === "photo" && (fields.caption || editing) && <p {...textProps("caption", "Add a caption (optional)")} />}
    </section>;
}
