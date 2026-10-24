import PageComposer from "../site/PageComposer";
import { Link } from "react-router-dom";
import { CONTACT } from "./Contact";
import { curatedStories, storyPhotoUrl } from "../data/curatedPortfolio";
import PricingPhotoCard from "../components/Portfolio/PricingPhotoCard";
import pricingSessionPhotos from "../data/pricingSessionPhotos.json";
import type { Categories } from "../components/MediaLibrary/MediaTypes";
import "../styles/inner-pages.css";

function categoryPhotos(category: Categories, sessionNames: string[] = []) {
    // One photograph per session keeps each advance visually distinct.
    const curated = curatedStories.filter((story) => story.category === category).map((story) => {
        const photo = story.photos[story.cover];
        return { src: storyPhotoUrl(story, photo), alt: photo.alt, width: photo.width, height: photo.height };
    });
    const library = sessionNames.map((name) => pricingSessionPhotos.find((photo) => photo.category === category && photo.name === name)!);
    return [...curated, ...library];
}

const weddingPhotos = categoryPhotos("Weddings", ["Aspinwall", "Baylor", "Bierbauer", "Cynthia&Isaac", "John&Sandy", "Karissa&Lee", "Sandy&Ben"]);
const sportsPhotos = categoryPhotos("Sports", ["GeorgiaSouthern", "UTSA"]);
const portraitPhotos = [
    ...categoryPhotos("Lifestyles", ["MadiMiles", "CreepyCute", "Rainey"]),
    ...categoryPhotos("Family", ["Hackfield"]),
];

export const PRICING = "/pricing";

const otherSessions = [
    { number: "01", title: "Graduation sessions · $400", inquiry: "Graduations", photos: categoryPhotos("Graduations", ["Angel", "AshleyBrennan", "Bobby", "Julia", "Kristen", "Maddi", "Molly", "Olivia"]), description: "Celebrate your milestone with a graduation session that feels like you." },
    { number: "02", title: "Engagement sessions · $400", inquiry: "Engagements", photos: categoryPhotos("Engagements", ["Carmen&Blake", "Ivan&Mikayla", "Sam&Sky"]), description: "Photographs of the two of you, and the beginning of your next chapter." },
    { number: "03", title: "Portraits & milestones · $400", inquiry: "Portraits", photos: portraitPhotos, description: "Growing families, new headshots, and the people you want to remember just as they are." },
    { number: "04", title: "Music · $100 per set / $300 per show", inquiry: "Events", photos: categoryPhotos("Music", ["Asorted", "BeyondExistence", "BOTA"]), description: "The atmosphere, the crowd, and everything that happens between the big moments." },
    { number: "05", title: "Sports & creative work", inquiry: "Creative", photos: sportsPhotos, description: "Athletes in their element and imagery that gives your brand a point of view." },
];

const weddingCollections = [
    {
        number: "01", name: "The Essential Collection", price: "$3,500", hours: "6 hours", recommended: false,
        description: "For intimate celebrations and couples wanting the most meaningful moments captured.",
        features: ["6 hours of wedding day coverage", "400+ hand-edited, high-resolution images", "Personalized wedding photography timeline assistance", "Private online gallery with unlimited downloads", "Personal printing rights", "Discounted engagement session — $300", "Additional second photographer available"],
    },
    {
        number: "02", name: "The Signature Collection", price: "$4,000", hours: "8 hours", recommended: true,
        description: "For couples wanting a fuller story, from getting ready to the dance floor.",
        features: ["8 hours of wedding day coverage", "600+ hand-edited, high-resolution images", "Personalized wedding photography timeline assistance", "Private online gallery with unlimited downloads", "Personal printing rights", "Discounted engagement session — $300", "Sneak peek gallery within 72 hours", "Additional second photographer available"],
    },
    {
        number: "03", name: "The Heirloom Collection", price: "$4,800", hours: "10 hours · two photographers", recommended: false,
        description: "The complete wedding day experience, with two photographers capturing the story from more than one perspective.",
        features: ["10 hours of wedding day coverage", "Second professional photographer included for all 10 hours", "800+ hand-edited, high-resolution images", "Comprehensive wedding photography timeline assistance", "Private online gallery with unlimited downloads", "Personal printing rights", "Complimentary engagement session", "Sneak peek gallery within 72 hours"],
    },
];

const weddingAddOns = [
    { name: "Second photographer", price: "$125 / hour", note: "4-hour minimum" },
    { name: "Additional wedding coverage", price: "$400 / hour", note: "More time for your story" },
    { name: "Engagement session", price: "$400", note: "A session for the two of you" },
    { name: "Collection engagement session", price: "$300", note: "With Essential or Signature; included with Heirloom" },
    { name: "Rehearsal dinner coverage", price: "$650", note: "2 hours of coverage" },
];

export default function Pricing() {
    return (
        <div className="inner-page inner-pricing">
<PageComposer page="pricing">
            <header className="inner-intro site-container inner-intro-split">
                <div>
                    <p className="eyebrow">The investment</p>
                    <h1>Made to matter.<br />Meant to last.</h1>
                </div>
                <p className="inner-lead">Thoughtful photography starts with understanding what matters to you. Here’s a starting point for making it happen.</p>
            </header>
            <section className="inner-wedding site-container" aria-labelledby="wedding-collection-title">
                <figure className="inner-wedding-photo">
                    <PricingPhotoCard photos={weddingPhotos} category="Wedding" className="pricing-wedding-card" sizes="(max-width: 700px) calc(100vw - 40px), 48vw" />
                    <figcaption>For the day, and everything it means.</figcaption>
                </figure>
                <div className="inner-wedding-copy">
                    <p className="eyebrow">Wedding photography</p>
                    <h2 id="wedding-collection-title">Your day.<br /><em>The whole feeling.</em></h2>
                    <p>From the quiet anticipation to the full dance floor. Coverage with space for the portraits you’ve imagined and the moments you couldn’t plan.</p>
                    <p className="inner-price"><span>Collections beginning at</span>$3,500 <small>USD</small></p>
                    <p className="inner-fine-print">Three collections, from six hours of meaningful moments to ten hours with two photographers. Find the fit for your day below.</p>
                    <a className="button" href="#wedding-collections">Explore the collections <span aria-hidden="true">↓</span></a>
                </div>
            </section>
            <section className="pricing-collections site-container" id="wedding-collections" aria-labelledby="collections-title">
                <div className="inner-section-heading">
                    <p className="eyebrow">A little time. A lasting story.</p>
                    <h2 id="collections-title">Your day, at your pace.</h2>
                    <p>Every collection includes personalized planning, professional image editing, and a beautiful online gallery to relive, download, and share your favorite memories.</p>
                </div>
                <div className="pricing-collection-grid">
                    {weddingCollections.map((collection, index) => (
                        <article className={`pricing-collection${collection.recommended ? " pricing-collection-recommended" : ""}`} key={collection.number} aria-labelledby={`collection-${collection.number}`}>
                            <div className="pricing-collection-topline">
                                <span className="eyebrow">Collection {collection.number}</span>
                                {collection.recommended && <span className="pricing-recommendation">Recommended</span>}
                            </div>
                            <PricingPhotoCard photos={[...weddingPhotos.slice(index), ...weddingPhotos.slice(0, index)]} category="Wedding" className="pricing-collection-photo" sizes="(max-width: 700px) calc(100vw - 80px), 30vw" />
                            <div className="pricing-collection-body">
                                <p className="pricing-collection-hours">{collection.hours}</p>
                                <h3 id={`collection-${collection.number}`}>{collection.name}</h3>
                                <p className="pricing-collection-description">{collection.description}</p>
                                <p className="pricing-collection-price">{collection.price}<small>USD</small></p>
                                <ul className="pricing-collection-inclusions">
                                    {collection.features.map((feature) => <li key={feature}>{feature}</li>)}
                                </ul>
                                <Link className="text-link" to={`${CONTACT}?session=Weddings`}>Ask about {collection.name.replace("The ", "").replace(" Collection", "")} <span aria-hidden="true">↗</span></Link>
                            </div>
                        </article>
                    ))}
                </div>
            </section>
            <section className="pricing-add-ons site-container" aria-labelledby="add-ons-title">
                <div className="pricing-add-ons-intro">
                    <p className="eyebrow">Make it yours</p>
                    <h2 id="add-ons-title">A little more<br /><em>of what matters.</em></h2>
                    <p>Add time, another perspective, or the celebration before the celebration.</p>
                </div>
                <div>
                    <dl className="pricing-add-on-list">
                        {weddingAddOns.map((addOn) => (
                            <div className="pricing-add-on" key={addOn.name}>
                                <dt>{addOn.name}<span>{addOn.note}</span></dt>
                                <dd>{addOn.price}</dd>
                            </div>
                        ))}
                    </dl>
                    <p className="pricing-add-on-note">Second photographers have a 4-hour minimum when added to Essential or Signature. Heirloom includes a second photographer for all 10 hours.</p>
                </div>
            </section>
            <section className="inner-other-work site-container" aria-labelledby="other-sessions-title">
                <div className="inner-section-heading">
                    <p className="eyebrow">Beyond the wedding day</p>
                    <h2 id="other-sessions-title">There’s more to your story.</h2>
                    <p>Graduation, engagement, and portrait sessions are $400 each. Music coverage is $100 per set or $300 per show. Other event coverage and creative projects are quoted individually to fit your plans.</p>
                </div>
                <div className="inner-service-list">
                    {otherSessions.map((session) => (
                        <div className="inner-service-row inner-service-with-photo" key={session.number}>
                            <span className="inner-index" aria-hidden="true">{session.number}</span>
                            <h3>{session.title}</h3>
                            <p>{session.description}</p>
                            <Link className="text-link" to={`${CONTACT}?session=${session.inquiry}`} aria-label={`Inquire about ${session.title.toLowerCase()}`}>Inquire <span aria-hidden="true">↗</span></Link>
                            <PricingPhotoCard photos={session.photos} category={session.inquiry === "Events" ? "Music" : session.inquiry === "Creative" ? "Sports" : session.inquiry} className="inner-service-photo" sizes="(max-width: 700px) calc(100vw - 40px), 30vw" />
                        </div>
                    ))}
                </div>
            </section>
            <section className="inner-cta site-container">
                <p className="eyebrow">Let’s make a plan</p>
                <h2>Start with a conversation.</h2>
                <p>Tell me the when, the where, and what you’re hoping to remember. We’ll take it from there.</p>
                <Link className="text-link" to={CONTACT}>Ask about availability <span aria-hidden="true">↗</span></Link>
            </section>
        </PageComposer>
</div>
    );
}
