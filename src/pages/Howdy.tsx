import { Link } from "react-router-dom";
import { useSiteSettings } from "../site/SiteSettingsContext";
import "../styles/inner-pages.css";

export const HOWDY = "/howdy";

const approach = [
    { number: "01", title: "A little preparation.", text: "We’ll talk through your ideas, the location, and the moments that matter. You’ll know what to expect before the camera comes out." },
    { number: "02", title: "Room to be yourself.", text: "Gentle direction when you need it. Space to move, laugh, and settle in. The best photographs leave room for real life." },
    { number: "03", title: "Something to hold onto.", text: "Thoughtful editing, natural color, and a gallery you can return to. Photographs made for sharing, printing, and keeping." },
];

export default function Howdy() {
    const { siteSettings } = useSiteSettings();
    const useDefaultProfile = siteSettings.profilePhotoUrl === "/assets/images/profilePhoto.jpg";

    return (
        <div className="inner-page inner-about">
            <section className="inner-about-hero site-container" aria-labelledby="about-title">
                <figure className="inner-profile">
                    <img src={useDefaultProfile ? "/assets/editorial/nikki.webp" : siteSettings.profilePhotoUrl}
                        srcSet={useDefaultProfile ? "/assets/editorial/nikki-640.webp 640w, /assets/editorial/nikki.webp 1000w" : undefined}
                        sizes="(max-width: 700px) calc(100vw - 40px), 45vw" alt={siteSettings.profileName} width="1000" height="1000" fetchPriority="high" />
                    <figcaption>{siteSettings.profileName} <span>Behind the lens</span></figcaption>
                </figure>
                <div className="inner-about-copy">
                    <p className="eyebrow">A little introduction</p>
                    <h1 id="about-title">Hi, I’m Nikki.<br /><em>Glad you’re here.</em></h1>
                    <p className="inner-lead">Photographs with feeling. An experience that feels like you.</p>
                    <p>{siteSettings.aboutPageBody}</p>
                    <p className="inner-about-location">{siteSettings.profileRole}</p>
                    <Link className="text-link" to="/book">Let’s plan your session <span aria-hidden="true">↗</span></Link>
                </div>
            </section>
            <section className="inner-approach site-container" aria-labelledby="approach-title">
                <div className="inner-section-heading">
                    <p className="eyebrow">The way I work</p>
                    <h2 id="approach-title">Less posing.<br /><em>More being there.</em></h2>
                </div>
                <div className="inner-approach-grid">
                    {approach.map((step) => (
                        <div className="inner-approach-item" key={step.number}>
                            <span className="inner-index" aria-hidden="true">{step.number}</span>
                            <h3>{step.title}</h3>
                            <p>{step.text}</p>
                        </div>
                    ))}
                </div>
            </section>
            <section className="inner-about-statement">
                <div className="site-container">
                    <p className="eyebrow">Weddings · Portraits · Music · Sport</p>
                    <h2>A good photograph<br />brings you <em>right back.</em></h2>
                    <p>The energy of a room. The people beside you. The way it all felt.</p>
                    <Link className="text-link" to="/portfolio">Explore the work <span aria-hidden="true">↗</span></Link>
                </div>
            </section>
        </div>
    );
}
