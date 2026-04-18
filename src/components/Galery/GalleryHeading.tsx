import {FC} from "react";
import {Link} from "react-router-dom";
import {CONTACT} from "../../pages/Contact";

interface GalleryHeadingProps {
    title: string;
    category: string;
    summary: string;
    imageCount: number;
    relatedCount: number;
}

const GalleryHeading: FC<GalleryHeadingProps> = ({title, category, summary, imageCount, relatedCount}) => {
    return (
        <div className="page-heading">
            <div className="container">
                <div className="row">
                    <div id="heading-box" className="col-lg-8 offset-lg-2 header-text mt-5">
                        <h2 className="space-need"><em>{title}</em></h2>
                        <h6>{category} Gallery</h6>
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
                                    <Link to={CONTACT}>Ask About A Session Like This</Link>
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
