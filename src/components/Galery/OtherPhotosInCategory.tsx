import React from "react";
import {Link} from "react-router-dom";
import {GALLERY} from "../../pages/Gallery";

interface RelatedSession {
    category: string;
    image: string;
    lead: string;
    name: string;
    photoCount: number;
}

const formatSessionName = (value: string) => value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/&/g, " & ");

const OtherPhotosInCategory: React.FC<{
    categoryName: string;
    sessions: RelatedSession[];
}> = ({categoryName, sessions}) => {
    if (!sessions.length) {
        return null;
    }

    return (
        <section className="gallery-list mb-5">
            <div className="container">
                <div className="row">
                    <div className="col-lg-12">
                        <h5>More {categoryName} Galleries</h5>
                    </div>

                    {sessions.map((session) => (
                        <div key={session.name} className="col-lg-3 col-sm-6">
                            <Link to={`${GALLERY}/${session.category}/${session.name}`}>
                                <div className="waiting-item">
                                    <img src={session.image} alt={formatSessionName(session.name)}/>
                                    <div className="down-content">
                                        <h4>{formatSessionName(session.name)}</h4>
                                        <p>{session.lead}</p>
                                        <span className="price">Category: <em>{session.category}</em></span>
                                        <span className="deadline">Images: <em>{session.photoCount}</em></span>
                                    </div>
                                </div>
                            </Link>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default OtherPhotosInCategory;
