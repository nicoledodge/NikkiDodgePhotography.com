import { Link } from "react-router-dom";
import { CONTACT } from "./Contact";
import "../styles/inner-pages.css";

export const BLOG = "/blog";

const notes = [
    {
        number: "01", category: "Wedding planning", title: "Make room for the moments.",
        image: "forest-wedding", width: 1800, alt: "An intimate wedding ceremony beneath towering forest trees",
        intro: "A little breathing room in the timeline goes a long way toward photographs that feel like your day.",
        tips: [
            { title: "Start with what matters.", text: "Tell your photographer which people and moments you most want to remember. A short list of essential family groupings makes those portraits easier to organize." },
            { title: "Leave some breathing room.", text: "Build in time between getting ready, portraits, the ceremony, and the reception. A flexible timeline lets you enjoy the day and gives spontaneous moments space to happen." },
            { title: "Think about the light.", text: "Talk through the venue and ceremony time before finalizing the schedule. Even a short window for portraits in softer light can give your gallery a different feeling." },
        ],
    },
    {
        number: "02", category: "Portrait sessions", title: "Show up as yourself.",
        image: "portraits", width: 1200, alt: "A graduate celebrating beneath an archway",
        intro: "What to wear, what to bring, and how to feel a little more comfortable in front of the camera.",
        tips: [
            { title: "Wear something you can move in.", text: "Choose outfits that fit comfortably and feel familiar. Try them on while sitting and walking, and consider how the colors will work with the location." },
            { title: "Bring the personal details.", text: "A cap and gown, an instrument, or something connected to a favorite sport can make the session your own. A small selection is plenty." },
            { title: "You don’t need to know how to pose.", text: "A portrait session is a collaboration. Share what you love and what makes you nervous, then leave room for direction, movement, and a few unplanned moments." },
        ],
    },
    {
        number: "03", category: "Family photography", title: "Let them be little.",
        image: "family", width: 1200, alt: "A family photographed together outdoors",
        intro: "The best family session doesn’t need perfect behavior. It needs a little patience and room to play.",
        tips: [
            { title: "Plan around your family.", text: "Share nap times, meal times, and anything that helps your children feel comfortable. We can talk about a location and pace that make sense for you." },
            { title: "Coordinate without matching.", text: "A few complementary colors and comfortable clothes help everyone feel like themselves. Think about layers and shoes that suit the setting." },
            { title: "Let the in-between happen.", text: "Walking, cuddling, exploring, and taking a break can all belong in the session. You don’t need everyone looking at the camera in every photograph." },
        ],
    },
    {
        number: "04", category: "Music & events", title: "Set the scene before the show.",
        image: "music", width: 1200, alt: "Live music captured on stage",
        intro: "A few practical details help your photographer arrive ready for the energy of a live event.",
        tips: [
            { title: "Share the running order.", text: "Send the schedule, key moments, venue details, and a contact for the day. Flag any performances or guests that need particular attention." },
            { title: "Talk through access.", text: "Confirm the venue’s photography rules, credentials, and any restrictions with your event team. Clear arrangements help coverage run smoothly." },
            { title: "Know where the images are going.", text: "A website, press feature, poster, and social feed can all call for different images. Share the intended use, image needs, and deadline when you inquire." },
        ],
    },
];

export default function Blog() {
    return (
        <div className="inner-page inner-journal site-container">
            <header className="inner-intro inner-intro-split">
                <div>
                    <p className="eyebrow">The journal</p>
                    <h1>A few notes<br /><em>before we begin.</em></h1>
                </div>
                <p className="inner-lead">A little preparation, a little perspective. Practical thoughts for a session or celebration that feels like you.</p>
            </header>
            <section className="inner-journal-grid" aria-label="Photography planning notes">
                {notes.map((note) => (
                    <article className="inner-note" key={note.number}>
                        <img src={`/assets/editorial/${note.image}.webp`}
                            srcSet={`/assets/editorial/${note.image}-640.webp 640w, /assets/editorial/${note.image}.webp ${note.width}w`}
                            sizes="(max-width: 700px) calc(100vw - 40px), 46vw" alt={note.alt} width="1000" height="700" loading="lazy" />
                        <div className="inner-note-meta"><span className="eyebrow">{note.category}</span><span>{note.number}</span></div>
                        <h2>{note.title}</h2>
                        <p>{note.intro}</p>
                        <details className="inner-note-details">
                            <summary>Read the notes <span aria-hidden="true">+</span></summary>
                            <div className="inner-note-body">
                                {note.tips.map((tip) => <div key={tip.title}><h3>{tip.title}</h3><p>{tip.text}</p></div>)}
                            </div>
                        </details>
                    </article>
                ))}
            </section>
            <section className="inner-cta">
                <p className="eyebrow">Your story comes next</p>
                <h2>Have something in mind?</h2>
                <p>You don’t need every detail figured out to start a conversation.</p>
                <Link className="text-link" to={CONTACT}>Let’s talk <span aria-hidden="true">↗</span></Link>
            </section>
        </div>
    );
}
