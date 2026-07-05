
import {Link} from "react-router-dom";
import {CONTACT} from "../../pages/Contact";
import { useSiteSettings } from "../../site/SiteSettingsContext";
import { renderInlineEmphasis } from "../../site/renderInlineEmphasis";

export default function About() {
    const { siteSettings } = useSiteSettings();

    return <section className="home-about" aria-labelledby="home-about-title">
        <div className="container">
            <div className="row">
                <div className="col-lg-10 offset-lg-1">
                    <div className="header-text">
                        <h2 id="home-about-title">
                            {renderInlineEmphasis(siteSettings.homeAboutTitle)}
                        </h2>
                        <p className="home-about__body">
                            {siteSettings.homeAboutBody}
                        </p>
                        <div className="main-button mt-4">
                            <Link to={CONTACT}>{siteSettings.homeAvailabilityCtaLabel}</Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

}
