
import {Link} from "react-router-dom";
import {CONTACT} from "../../pages/Contact";
import { useSiteSettings } from "../../site/SiteSettingsContext";
import { renderInlineEmphasis } from "../../site/renderInlineEmphasis";

export default function About() {
    const { siteSettings } = useSiteSettings();

    return <div className="container">
        <div className="row">
            <div className="col-lg-10 offset-lg-1">
                <div className="header-text mt-5">
                    <h1>
                        {renderInlineEmphasis(siteSettings.homeAboutTitle)}
                    </h1>
                    <br/>
                    <p className="h5">
                        {siteSettings.homeAboutBody}
                    </p>
                    <div className="main-button mt-4">
                        <Link to={CONTACT}>{siteSettings.homeAvailabilityCtaLabel}</Link>
                    </div>
                </div>
            </div>
        </div>
    </div>

}
