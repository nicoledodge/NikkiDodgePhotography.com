import PageComposer from "../site/PageComposer";
import ContactForm from "../components/Contacts/Contact";
import { curatedStories, storyPhotoUrl } from "../data/curatedPortfolio";
import { portfolioPreview, portfolioSrcSet } from "../functions/portfolioPreview";
import { useSearchParams } from "react-router-dom";
import { useSiteSettings } from "../site/SiteSettingsContext";
import "../styles/inner-pages.css";

export const CONTACT = "/Contact";

const sessionIntros = {
    Weddings: "Tell me about your wedding: the date, the place, and what you want to remember. We’ll talk through coverage that fits your day.",
    Engagements: "A proposal, an engagement, or simply the two of you. Tell me what you have in mind and we’ll find a way to make it feel like you.",
    Family: "Tell me a little about your family and the season you’re in. We’ll plan photographs with room for everyone to be themselves.",
    Graduations: "You’ve reached a milestone worth remembering. Share your graduation plans, a favorite location, and what makes this chapter yours.",
    Headshots: "A new role, a fresh start, or a portrait that feels more like you. Tell me where your images will be used and the impression you want to make.",
    Lifestyles: "Tell me about the people, places, or everyday moments you want to document. We’ll shape a session around what matters to you.",
    Music: "From the stage to the crowd, tell me about your show or music project, your date, and the photographs you need.",
    Sports: "Tell me about your athlete, team, or event, and the action you want to remember. Share the date and location if you have them.",
    Representatives: "Tell me about your community event, the people involved, and the moments you want to document.",
    Homes: "Tell me about the property, its location, and how you plan to use the photographs. We’ll talk through the spaces and details you need to show.",
    Portraits: "A new chapter, a milestone, or just a moment worth keeping. Tell me who we’re photographing and what you have in mind.",
    Events: "Tell me about your event, when and where it’s happening, and the people and moments you want to remember.",
    Creative: "Have an idea you want to bring to life? Share your project, how you’ll use the images, and what you’re imagining.",
};

export default function Contact() {
    const { siteSettings } = useSiteSettings();
    const [searchParams] = useSearchParams();
    const wedding = curatedStories.find((story) => story.name === "FoothillsWedding2024");
    const photo = wedding?.photos[7];
    const image = wedding && photo ? storyPhotoUrl(wedding, photo) : "/assets/editorial/couple-river.webp";
    const requestedSession = searchParams.get("session");
    const session = requestedSession && Object.prototype.hasOwnProperty.call(sessionIntros, requestedSession)
        ? requestedSession as keyof typeof sessionIntros
        : undefined;

    return (
        <div className="inner-page inner-contact site-container">
<PageComposer page="contact">
            <header className="inner-intro">
                <p className="eyebrow">A good place to begin</p>
                <h1>Tell me what<br />you have in mind.</h1>
            </header>
            <div className="inner-contact-layout">
                <aside className="inner-contact-aside" aria-label="Contact details">
                    <p className="inner-lead">{session ? sessionIntros[session] : "A day to remember. A new chapter. An idea you can’t stop thinking about. Let’s make photographs of it."}</p>
                    <div className="inner-contact-info">
                        <a className="text-link" href={`mailto:${siteSettings.contactEmail}`}>{siteSettings.contactEmail}</a>
                        <a href={`tel:${siteSettings.contactPhone.replace(/[^+\d]/g, "")}`}>{siteSettings.contactPhone}</a>
                        <p>{siteSettings.serviceArea}</p>
                    </div>
                    <img className="inner-contact-photo" src={portfolioPreview(image)} srcSet={portfolioSrcSet(image)} sizes="(max-width: 420px) 88px, (max-width: 700px) 104px, 40vw" alt={photo?.alt || "A surprise proposal overlooking the river"} width={photo?.width || 1200} height={photo?.height || 800} loading="lazy" decoding="async" />
                    <a className="inner-social-link" href={siteSettings.instagramUrl} target="_blank" rel="noreferrer">Follow along on Instagram <span aria-hidden="true">↗</span></a>
                </aside>
                <ContactForm initialSubject={session} />
            </div>
        </PageComposer>
</div>
    );
}
