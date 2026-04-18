
import {Link} from "react-router-dom";
import {CONTACT} from "../../pages/Contact";
import {PORTFOLIO} from "../../pages/Portfolio";
import { useSiteSettings } from "../../site/SiteSettingsContext";
import { renderInlineEmphasis } from "../../site/renderInlineEmphasis";

const Banner = () => {
    const { siteSettings } = useSiteSettings();

    return (
        <section className="main-banner">
            <div className="container main-banner__content">
                <div className="row justify-content-center">
                    <div className="col-lg-10">
                        <h2>
                            {renderInlineEmphasis(siteSettings.heroTitle)}
                        </h2>
                        <p>
                            {siteSettings.heroBody}
                        </p>
                        <div className="buttons">
                            <div className="big-border-button">
                                <Link to={PORTFOLIO}>{siteSettings.heroPrimaryCtaLabel}</Link>
                            </div>
                            <div className="icon-button">
                                <Link to={CONTACT}>
                                    <i className="fa fa-envelope"></i>
                                    {siteSettings.heroSecondaryCtaLabel}
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Banner;
