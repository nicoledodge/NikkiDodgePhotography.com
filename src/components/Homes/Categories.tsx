import {Link} from "react-router-dom";
import {PORTFOLIO} from "../../pages/Portfolio";
import mediaLibrary from "../MediaLibrary/MediaLibrary";

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
            title: "Music",
            icon: "icon-02.png",
            libraryKey: "Music",
        },
        {
            id: 3,
            title: "Weddings",
            icon: "icon-03.png",
            libraryKey: "Weddings",
        },
        {
            id: 4,
            title: "Sports",
            icon: "icon-04.png",
            libraryKey: "Sports",
        },
    ];

    return (
        <section className="popular-categories">
            <div className="container-fluid">
                <div className="row">
                    <div className="col-lg-6">
                        <div className="section-heading">
                            <h6>Our Categories</h6>
                            <h4>Check Out <em>Popular</em> Contest <em>Categories</em></h4>
                        </div>
                    </div>
                    <div className="col-lg-6">
                        <div className="main-button">
                            <a href="categories.html">Discover All Categories</a>
                        </div>
                    </div>
                    {featuredCategories.map(({id, title, icon, libraryKey}) => {
                        const category = mediaLibrary[libraryKey];
                        const imageSrc = `${category.path}/${category.featuredVertical}`;
                        const sessionCount = category.sessions.length;
                        const destination = `${PORTFOLIO}/${category.category}`;

                        return (
                            <div className="col-lg-3 col-sm-6" key={id}>
                                <div className="popular-item">
                                    <div className="top-content">
                                        <div className="icon">
                                            <img src={`/assets/images/${icon}`} alt=""/>
                                        </div>
                                        <div className="right">
                                            <h4>{title}</h4>
                                            <span><em>{sessionCount}</em> Photo Sessions</span>
                                        </div>
                                    </div>
                                    <div className="thumb">
                                        <img src={imageSrc} alt=""/>
                                        <span className="category">Top Contest</span>
                                        <span className="likes"><i className="fa fa-heart"></i> 256</span>
                                    </div>
                                    <div className="main-button border-button">
                                        <Link to={destination}>Browse {category.name}</Link>
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
