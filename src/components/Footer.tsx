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
                        <div className="footer-social-links" aria-label="Social links">
                            <a href={siteSettings.instagramUrl} target="_blank" rel="noreferrer">
                                <i className="fa-brands fa-instagram" aria-hidden="true"></i>
                                Follow recent reels
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};
export default Footer
