import PageComposer from "../site/PageComposer";
import { Link } from "react-router-dom";
import { CONTACT } from "./Contact";
import { curatedStories, storyPhotoUrl } from "../data/curatedPortfolio";
import { portfolioPreview, portfolioSrcSet } from "../functions/portfolioPreview";
import "../styles/inner-pages.css";

export const PRICING = "/pricing";

const otherSessions = [
    { number: "01", title: "Graduation sessions · $400", inquiry: "Graduations", description: "Celebrate your milestone with a graduation session that feels like you." },
    { number: "02", title: "Engagement sessions · $400", inquiry: "Engagements", description: "Photographs of the two of you, and the beginning of your next chapter." },
    { number: "03", title: "Portraits & milestones · $400", inquiry: "Portraits", description: "Growing families, new headshots, and the people you want to remember just as they are." },
    { number: "04", title: "Music · $100 per set / $300 per show", inquiry: "Events", description: "The atmosphere, the crowd, and everything that happens between the big moments." },
    { number: "05", title: "Sports & creative work", inquiry: "Creative", description: "Athletes in their element and imagery that gives your brand a point of view." },
];

export default function Pricing() {
    const wedding = curatedStories.find((story) => story.name === "FoothillsWedding2024");
    const photo = wedding?.photos[3];
    const image = wedding && photo ? storyPhotoUrl(wedding, photo) : "/assets/editorial/wedding-details.webp";
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
                    <img src={portfolioPreview(image)} srcSet={portfolioSrcSet(image)} sizes="(max-width: 700px) calc(100vw - 40px), 48vw" alt={photo?.alt || "A lace wedding dress hanging against a sunlit redwood tree"} width={photo?.width || 1200} height={photo?.height || 1800} decoding="async" />
                    <figcaption>For the day, and everything it means.</figcaption>
                </figure>
                <div className="inner-wedding-copy">
                    <p className="eyebrow">Wedding photography</p>
                    <h2 id="wedding-collection-title">Your day.<br /><em>The whole feeling.</em></h2>
                    <p>From the quiet anticipation to the full dance floor. Coverage with space for the portraits you’ve imagined and the moments you couldn’t plan.</p>
                    <p className="inner-price"><span>Wedding collections</span>$3,500 <small>USD · 6 hours</small></p>
                    <p className="inner-price">$4,000 <small>USD · 8 hours</small></p>
                    <p className="inner-price">$4,800 <small>USD · 10 hours &amp; second shooter</small></p>
                    <ul className="inner-inclusions">
                        <li>Planning support before the day</li>
                        <li>A professionally edited final gallery</li>
                        <li>Online delivery with high-resolution downloads</li>
                    </ul>
                    <p className="inner-fine-print">Share your wedding plans to find the collection that fits your day.</p>
                    <Link className="button" to={`${CONTACT}?session=Weddings`}>Let’s talk about your day <span aria-hidden="true">↗</span></Link>
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
                        <div className="inner-service-row" key={session.number}>
                            <span className="inner-index" aria-hidden="true">{session.number}</span>
                            <h3>{session.title}</h3>
                            <p>{session.description}</p>
                            <Link className="text-link" to={`${CONTACT}?session=${session.inquiry}`} aria-label={`Inquire about ${session.title.toLowerCase()}`}>Inquire <span aria-hidden="true">↗</span></Link>
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
