import { useSiteSettings } from "../site/SiteSettingsContext";

const Footer = () => {
    const { siteSettings } = useSiteSettings();
    const currentYear = new Date().getFullYear();
    return (
        <footer>
            <div className="container">
                <div className="row">
                    <div className="col-lg-12">
                        <p>
                            Copyright © {currentYear} {siteSettings.businessName}. Serving {siteSettings.serviceArea}.
                            <br />
                            <a href={`mailto:${siteSettings.contactEmail}`}>{siteSettings.contactEmail}</a>
                            {" · "}
                            <a href={`tel:${siteSettings.contactPhone}`}>{siteSettings.contactPhone}</a>
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
};
export default Footer
