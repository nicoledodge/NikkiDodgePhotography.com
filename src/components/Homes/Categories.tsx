import {Link} from "react-router-dom";
import {PORTFOLIO} from "../../pages/Portfolio";
import mediaLibrary from "../MediaLibrary/MediaLibrary";
import {getCategoryCopy} from "../../data/categoryCopy";

const Categories = () => {
    const featuredCategories: Array<{
        id: number;
        title: string;
        icon: string;
        libraryKey: keyof typeof mediaLibrary;
    }> = [
        {
            id: 1,
            title: "Graduation",
            icon: "icon-01.png",
            libraryKey: "Graduations",
        },
        {
            id: 2,
            title: "Engagements",
            icon: "icon-02.png",
            libraryKey: "Engagements",
        },
        {
            id: 3,
            title: "Weddings",
            icon: "icon-03.png",
            libraryKey: "Weddings",
        },
        {
            id: 4,
            title: "Families",
            icon: "icon-04.png",
            libraryKey: "Family",
        },
    ];

    return (
        <section className="popular-categories">
            <div className="container-fluid">
                <div className="row">
                    <div className="col-lg-6">
                        <div className="section-heading">
                            <p className="section-eyebrow">Signature Sessions</p>
                            <h2>Explore the work clients book most <em>often</em></h2>
                        </div>
                    </div>
                    <div className="col-lg-6">
                        <div className="main-button">
                            <Link to={PORTFOLIO}>Browse The Full Portfolio</Link>
                        </div>
                    </div>
                    {featuredCategories.map(({id, title, icon, libraryKey}) => {
                        const category = mediaLibrary[libraryKey];
                        const imageSrc = `${category.path}/${category.featuredVertical}`;
                        const sessionCount = category.sessions.length;
                        const destination = `${PORTFOLIO}/${category.category}`;
                        const copy = getCategoryCopy(category.category);

                        return (
                            <div className="col-lg-3 col-sm-6" key={id}>
                                <div className="popular-item">
                                    <div className="top-content">
                                        <div className="icon">
                                            <img src={`/assets/images/${icon}`} alt=""/>
                                        </div>
                                        <div className="right">
                                            <h3>{title}</h3>
                                            <span><em>{sessionCount}</em> Photo Sessions</span>
                                        </div>
                                    </div>
                                    <div className="thumb">
                                        <img src={imageSrc} alt={title}/>
                                        <span className="category">Featured Gallery</span>
                                        <span className="likes"><i className="fa fa-camera"></i> {sessionCount} Sessions</span>
                                    </div>
                                    <p>{copy.description}</p>
                                    <div className="main-button border-button">
                                        <Link to={destination}>See {category.name}</Link>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default Categories;
