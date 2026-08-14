import {FC} from "react";
import {Link} from "react-router-dom";
import {CONTACT} from "../../pages/Contact";
import type {Categories} from "../MediaLibrary/MediaTypes";
import {getCategoryVibe} from "../../data/categoryVibes";
import {useSiteSettings} from "../../site/SiteSettingsContext";

interface GalleryHeadingProps {
    title: string;
    category: Categories;
    summary: string;
    imageCount: number;
    relatedCount: number;
}

const GalleryHeading: FC<GalleryHeadingProps> = ({title, category, summary, imageCount, relatedCount}) => {
    const {siteSettings} = useSiteSettings();
    const vibe = getCategoryVibe(category);

    return (
        <div className={`page-heading page-heading--vibe page-heading--${vibe.key}`}>
            <div className="container">
                <div className="row">
                    <div id="heading-box" className="col-lg-8 offset-lg-2 header-text mt-5">
                        <p className="portfolio-vibe__eyebrow">{vibe.eyebrow}</p>
                        <h2 className="space-need"><em>{title}</em></h2>
                        <h6>{vibe.mood} Gallery</h6>
                        <p>{summary}</p>
                        <div className="main-content">
                            <div className="counter" style={{justifyContent: "center", gap: "20px"}}>
                                <div>
                                    <div className="value">{imageCount.toString().padStart(2, "0")}</div>
                                    <span>Images</span>
                                </div>
                                <div>
                                    <div className="value">{relatedCount.toString().padStart(2, "0")}</div>
                                    <span>More Galleries</span>
                                </div>
                                <div className="main-button" style={{marginTop: "12px"}}>
                                    <Link to={CONTACT}>{vibe.ctaLabel}</Link>
                                </div>
                                <div className="main-button main-button--ghost" style={{marginTop: "12px"}}>
                                    <a href={siteSettings.instagramUrl} target="_blank" rel="noreferrer">See Recent Reels</a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GalleryHeading;
