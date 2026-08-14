
import {Link} from "react-router-dom";
import {CONTACT} from "../../pages/Contact";
import {PORTFOLIO} from "../../pages/Portfolio";
import { useSiteSettings } from "../../site/SiteSettingsContext";
import { renderInlineEmphasis } from "../../site/renderInlineEmphasis";

const Banner = () => {
    const { siteSettings } = useSiteSettings();

    return (
        <section className="main-banner" aria-labelledby="home-hero-title">
            <div className="container main-banner__content">
                <div className="row">
                    <div className="col-lg-8 col-xl-7">
                        <p className="main-banner__eyebrow">{siteSettings.serviceArea}</p>
                        <h1 id="home-hero-title">
                            {renderInlineEmphasis(siteSettings.heroTitle)}
                        </h1>
                        <p className="main-banner__summary">
                            {siteSettings.heroBody}
                        </p>
                        <div className="main-banner__services" aria-label="Photography services">
                            <span>Weddings</span>
                            <span>Live Music</span>
                            <span>Sports</span>
                            <span>Families</span>
                            <span>Graduates</span>
                            <span>Lifestyle</span>
                        </div>
                        <div className="buttons">
                            <Link className="hero-button hero-button--primary" to={PORTFOLIO}>
                                {siteSettings.heroPrimaryCtaLabel}
                            </Link>
                            <Link className="hero-button hero-button--secondary" to={CONTACT}>
                                <i className="fa fa-envelope" aria-hidden="true"></i>
                                {siteSettings.heroSecondaryCtaLabel}
                            </Link>
                            <a
                                className="hero-button hero-button--social"
                                href={siteSettings.instagramUrl}
                                target="_blank"
                                rel="noreferrer"
                            >
                                <i className="fa-brands fa-instagram" aria-hidden="true"></i>
                                Recent Reels
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Banner;
