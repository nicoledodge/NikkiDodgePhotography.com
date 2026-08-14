import {Link} from "react-router-dom";
import {PORTFOLIO} from "../../pages/Portfolio";
import mediaLibrary from "../MediaLibrary/MediaLibrary";
import {getCategoryCopy} from "../../data/categoryCopy";
import {getCategoryVibe} from "../../data/categoryVibes";

const Categories = () => {
    const featuredCategories = Object.values(mediaLibrary)
        .filter((category) => category.sessions.length > 0 && category.featuredVertical)
        .filter((category) => category.category !== "Featured" && category.category !== "Videos")
        .sort((left, right) => {
            const priority = ["Music", "Sports", "Graduations", "Lifestyles", "Family", "Engagements", "Weddings", "Representatives"];
            return priority.indexOf(left.category) - priority.indexOf(right.category);
        });

    return (
        <section className="popular-categories" aria-labelledby="booking-lanes-title">
            <div className="container-fluid">
                <div className="row">
                    <div className="col-lg-6">
                        <div className="section-heading">
                            <p className="section-eyebrow">Book By Energy</p>
                            <h2 id="booking-lanes-title">Choose the lane that matches what you need the photos to <em>do</em></h2>
                        </div>
                    </div>
                    <div className="col-lg-6">
                        <div className="main-button">
                            <Link to={PORTFOLIO}>Browse The Full Portfolio</Link>
                        </div>
                    </div>
                </div>
                <div className="popular-categories__grid">
                    {featuredCategories.map((category) => {
                        const imageSrc = `${category.path}/${category.featuredVertical}`;
                        const sessionCount = category.sessions.length;
                        const destination = `${PORTFOLIO}/${category.category}`;
                        const copy = getCategoryCopy(category.category);
                        const vibe = getCategoryVibe(category.category);

                        return (
                            <article className={`popular-item popular-item--${vibe.key}`} key={category.category}>
                                <Link to={destination} aria-label={`${vibe.ctaLabel}. ${copy.description}`}>
                                    <div className="top-content">
                                        <div className="right">
                                            <p className="popular-item__eyebrow">{vibe.eyebrow}</p>
                                            <h3>{category.name}</h3>
                                            <span><em>{sessionCount}</em> {sessionCount === 1 ? "Gallery" : "Galleries"}</span>
                                        </div>
                                    </div>
                                    <div className="thumb">
                                        <img src={imageSrc} alt={category.name}/>
                                        <span className="category">{vibe.mood}</span>
                                        <span className="likes"><i className="fa fa-camera" aria-hidden="true"></i> {vibe.pace}</span>
                                    </div>
                                    <p>{copy.description}</p>
                                    <span className="popular-item__cta">{vibe.ctaLabel}</span>
                                </Link>
                            </article>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default Categories;
