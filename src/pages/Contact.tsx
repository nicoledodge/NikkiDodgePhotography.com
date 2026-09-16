import ContactForm from "../components/Contacts/Contact";
import { useSiteSettings } from "../site/SiteSettingsContext";
import "../styles/inner-pages.css";

export const CONTACT = "/Contact";

export default function Contact() {
    const { siteSettings } = useSiteSettings();

    return (
        <div className="inner-page inner-contact site-container">
            <header className="inner-intro">
                <p className="eyebrow">A good place to begin</p>
                <h1>Tell me what<br />you have in mind.</h1>
            </header>
            <div className="inner-contact-layout">
                <aside className="inner-contact-aside" aria-label="Contact details">
                    <p className="inner-lead">A day to remember. A new chapter. An idea you can’t stop thinking about. Let’s make photographs of it.</p>
                    <div className="inner-contact-info">
                        <a className="text-link" href={`mailto:${siteSettings.contactEmail}`}>{siteSettings.contactEmail}</a>
                        <a href={`tel:${siteSettings.contactPhone.replace(/[^+\d]/g, "")}`}>{siteSettings.contactPhone}</a>
                        <p>{siteSettings.serviceArea}</p>
                    </div>
                    <img className="inner-contact-photo" src="/assets/editorial/couple-river.webp" srcSet="/assets/editorial/couple-river-640.webp 640w, /assets/editorial/couple-river.webp 1200w" sizes="(max-width: 700px) calc(100vw - 40px), 40vw" alt="A surprise proposal overlooking the river" width="1200" height="800" />
                    <a className="inner-social-link" href={siteSettings.instagramUrl} target="_blank" rel="noreferrer">Follow along on Instagram <span aria-hidden="true">↗</span></a>
                </aside>
                <ContactForm />
            </div>
        </div>
    );
}
