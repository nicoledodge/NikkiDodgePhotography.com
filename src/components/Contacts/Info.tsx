import React from "react";
import { useSiteSettings } from "../../site/SiteSettingsContext";

const Info: React.FC = () => {
    const { siteSettings } = useSiteSettings();

    return (
        <div className="user-info">
            <div className="container">
                <div className="row">
                    <div className="col-lg-12">
                        <div className="avatar">
                            <img src={siteSettings.profilePhotoUrl} alt={`Portrait of ${siteSettings.profileName}`} />
                            <h4>{siteSettings.profileName}</h4>
                            <span>{siteSettings.profileRole}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Info;
