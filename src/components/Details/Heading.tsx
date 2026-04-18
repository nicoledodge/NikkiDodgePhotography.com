import React from "react";
import {Link} from "react-router-dom";
import {CONTACT} from "../../pages/Contact";
import { useSiteSettings } from "../../site/SiteSettingsContext";
import { renderInlineEmphasis } from "../../site/renderInlineEmphasis";

const Heading: React.FC = () => {
    const { siteSettings } = useSiteSettings();

    return (
        <div className="page-heading">
            <div className="container">
                <div className="row">
                    <div id="heading-box" className="col-lg-8 offset-lg-2 header-text mt-5">
                        <h2>{renderInlineEmphasis(siteSettings.pricingPageTitle)}</h2>
                        <p>
                            {siteSettings.pricingPageBody}
                        </p>
                        <div className="main-button mt-5">
                            <Link to={CONTACT}>{siteSettings.pricingPageCtaLabel}</Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Heading;
