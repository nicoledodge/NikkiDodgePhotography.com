import React from "react";
import { useSiteSettings } from "../../site/SiteSettingsContext";
import { renderInlineEmphasis } from "../../site/renderInlineEmphasis";

const Heading: React.FC = () => {
    const { siteSettings } = useSiteSettings();

    return (
        <div className="page-heading">
            <div className="container mb-5">
                <div className="row">
                    <div id="heading-box" className="col-lg-8 offset-lg-2 header-text mt-5">
                        <h2>
                            {renderInlineEmphasis(siteSettings.aboutPageTitle)}
                        </h2>
                        <p>
                            {siteSettings.aboutPageBody}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Heading;
