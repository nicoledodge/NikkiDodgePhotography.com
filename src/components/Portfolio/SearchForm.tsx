import React, {useEffect, useState} from "react";
import Photos from "./SessionExplorer";
import Masonry from "../Galery/Masonry";
import {Link, useParams} from "react-router-dom";
import {PORTFOLIO} from "../../pages/Portfolio";
import {CONTACT} from "../../pages/Contact";
import MediaLibrary from "../MediaLibrary/MediaLibrary";
import type {Category} from "../MediaLibrary/MediaTypes";
import {normalize} from "../../functions/normalize";
import {getCategoryCopy} from "../../data/categoryCopy";
import {getCategoryVibe} from "../../data/categoryVibes";
import {useSiteSettings} from "../../site/SiteSettingsContext";

const categoryPriority = ["Music", "Sports", "Graduations", "Lifestyles", "Family", "Engagements", "Weddings", "Representatives", "Featured"];

const getCategorySortIndex = (category: string) => {
    const priorityIndex = categoryPriority.indexOf(category);
    return priorityIndex === -1 ? categoryPriority.length : priorityIndex;
};

const portfolioCategories = Object.values(MediaLibrary)
    .filter((category) => category.sessions.length > 0 && category.featuredVertical)
    .filter((category) => category.category !== "Videos")
    .sort((left, right) => getCategorySortIndex(left.category) - getCategorySortIndex(right.category));

const imageFilePattern = /\.(avif|gif|jpe?g|png|webp)$/i;

function getCategoryPreviewImages(category: Category): string[] {
    const featuredImages = category.sessions
        .flatMap((session) => [session.featuredVertical, session.featuredHorizontal]
            .filter((image): image is string => Boolean(image) && imageFilePattern.test(image))
            .map((image) => `${category.path}/${session.name}/${image}`));
    const galleryImages = category.sessions
        .flatMap((session) => session.mediaFiles
            .filter((image) => imageFilePattern.test(image))
            .slice(0, 2)
            .map((image) => `${category.path}/${session.name}/${image}`));

    return Array.from(new Set([...featuredImages, ...galleryImages])).slice(0, 10);
}


const SearchForm = () => {

    const {categoryName, search} = useParams();
    const {siteSettings} = useSiteSettings();
    const [sessionSearch, setSessionSearch] = useState(search || '');
    const [categorySearch, setCategorySearch] = useState(categoryName || '');
    const selectedCategory = portfolioCategories.find((category) => category.category === categorySearch);
    const selectedCategoryCopy = selectedCategory ? getCategoryCopy(selectedCategory.category) : undefined;
    const selectedCategoryVibe = selectedCategory ? getCategoryVibe(selectedCategory.category) : undefined;
    const selectedCategoryImages = selectedCategory ? getCategoryPreviewImages(selectedCategory) : [];
    const [selectedDeckImageIndex, setSelectedDeckImageIndex] = useState(0);
    const selectedDeckImage = selectedCategoryImages[selectedDeckImageIndex] ?? selectedCategoryImages[0];

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
    };

    useEffect(() => {
        setSessionSearch(search || "");
        setCategorySearch(categoryName || "");
    }, [categoryName, search]);

    useEffect(() => {
        setSelectedDeckImageIndex(0);
    }, [categorySearch]);

    const categories = portfolioCategories
        .filter((category) => categorySearch === '' || categorySearch === category.category)
        .filter((category) =>
            category.featuredVertical
            && (
                sessionSearch === '' ||
                normalize(category.category)
                    .includes(normalize(sessionSearch))
            ));

    const categoryVibeMarkup = selectedCategory && selectedCategoryCopy && selectedCategoryVibe && (
        <section className={`portfolio-vibe portfolio-vibe--${selectedCategoryVibe.key}`} aria-labelledby="portfolio-vibe-title">
            <div className="container">
                <div className="portfolio-vibe__layout">
                    <div className="portfolio-vibe__copy">
                        <p className="portfolio-vibe__eyebrow">{selectedCategoryVibe.eyebrow}</p>
                        <h2 id="portfolio-vibe-title">{selectedCategoryVibe.headline}</h2>
                        <p>{selectedCategoryCopy.lead}</p>
                        <p>{selectedCategoryVibe.bookingPrompt}</p>
                        <div className="portfolio-vibe__stats" aria-label={`${selectedCategory.name} portfolio stats`}>
                            <span><strong>{selectedCategory.sessions.length}</strong> {selectedCategory.sessions.length === 1 ? "Gallery" : "Galleries"}</span>
                            <span><strong>{selectedCategory.sessions.reduce((total, session) => total + session.mediaFiles.length, 0)}</strong> Images</span>
                            <span><strong>{selectedCategoryVibe.pace}</strong> Pace</span>
                        </div>
                        <div className="portfolio-vibe__actions">
                            <Link className="portfolio-vibe__button" to={CONTACT}>
                                {selectedCategoryVibe.ctaLabel}
                            </Link>
                            <a className="portfolio-vibe__button portfolio-vibe__button--ghost" href={siteSettings.instagramUrl} target="_blank" rel="noreferrer">
                                See Recent Reels
                            </a>
                        </div>
                    </div>
                    {selectedDeckImage && (
                        <div className="portfolio-deck" aria-label={`${selectedCategory.name} featured photo deck`}>
                            <div className="portfolio-deck__stage">
                                <img src={selectedDeckImage} alt="" />
                                <div className="portfolio-deck__caption">
                                    <span>{selectedCategoryVibe.mood}</span>
                                    <strong>{selectedCategory.name}</strong>
                                </div>
                            </div>
                            <div className="portfolio-deck__controls" aria-label="Choose preview image">
                                {selectedCategoryImages.map((image, index) => (
                                    <button
                                        type="button"
                                        key={image}
                                        className={index === selectedDeckImageIndex ? "is-active" : undefined}
                                        aria-current={index === selectedDeckImageIndex ? "true" : undefined}
                                        aria-label={`Show preview image ${index + 1}`}
                                        onClick={() => setSelectedDeckImageIndex(index)}
                                    >
                                        {(index + 1).toString().padStart(2, "0")}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );

    const categoryPickerMarkup = (
        <section className="portfolio-category-picker" aria-labelledby="portfolio-category-picker-title">
            <div className="container">
                <div className="section-heading text-center">
                    <p className="section-eyebrow">Pick A Lane</p>
                    <h2 id="portfolio-category-picker-title">Start with the kind of session that matches the job your photos need to do</h2>
                </div>
                <div className="portfolio-category-picker__grid">
                    {portfolioCategories.map((category) => {
                        const vibe = getCategoryVibe(category.category);
                        return (
                            <Link
                                className={`portfolio-category-chip portfolio-category-chip--${vibe.key}`}
                                to={`${PORTFOLIO}/${category.category}`}
                                key={category.category}
                            >
                                <span>{vibe.eyebrow}</span>
                                <strong>{category.name}</strong>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </section>
    );

    const categoriesMarkup = <section className="photos-videos">
        <div className="container">
            <div className="row">
                <div className="col-lg-12">
                    <div className="section-heading text-center">
                        <h6>Moments & Memories</h6>
                        <h4>
                            {categories.length === 1
                                ? <>Browse the best of {categorySearch}</>
                                : <>Browse by <em>session type</em></>
                            }
                        </h4>
                    </div>
                </div>

                {categories.map((category, key) => {
                    let columnSize, height, imagePath;

                    if (categories.length === 1) {
                        imagePath = category.path + '/' + category.featuredHorizontal
                        columnSize = "12";
                        height = '100%'
                    } else {
                        imagePath = category.path + '/' + category.featuredVertical
                        columnSize = key < 2 ? "6" : "4";
                        height = '416px'
                    }

                    return <div key={key} className={`col-lg-${columnSize}`}>
                        <Link to={PORTFOLIO + '/' + category.category}>
                            <div className="item">
                                <div className="thumb">
                                    <img
                                        src={imagePath}
                                        alt={category.name}
                                        style={{
                                            height: height,
                                            objectPosition: "50% 20%", // Aligns the image to the top
                                            overflow: "hidden",
                                            objectFit: "cover", // Prevents distortion while covering the box
                                        }}/>
                                    <div className="top-content">
                                        <h4>{category.name}</h4>
                                        <h6>
                                            <i className="fa fa-camera" aria-hidden="true"></i> {category.sessions.length} |{" "}
                                            <i className="fa fa-at" aria-hidden="true"></i> NikkiDodgePhotography
                                        </h6>
                                    </div>
                                </div>
                                <div className="down-content">
                                    <div className="row">
                                        <div className="col-7">
                                            <h2 style={{
                                                color: "white",
                                            }}>Why Clients Book It</h2>
                                        </div>
                                        <div className="col-5">
                                            <h6>{category.sessions.length} Galleries</h6>
                                        </div>
                                    </div>
                                    <p>{getCategoryCopy(category.category).description}</p>
                                </div>
                            </div>
                        </Link>
                    </div>
                })}
            </div>
        </div>
    </section>
    const photosMarkup = <Photos categorySearch={categorySearch} sessionSearch={sessionSearch}/>

    return (<>
        <div className="search-form">
            <div className="container">
                <div className="row">
                    <div className="col-lg-12">
                        <form id="search-form" name="gs" onSubmit={handleSubmit} role="search">
                            <div className="row">
                                <div className="col-lg-6">
                                    <fieldset>
                                        <label htmlFor="session-search" className="form-label">
                                            Search Sessions
                                        </label>
                                        <input
                                            type="text"
                                            id="session-search"
                                            name="search"
                                            className="searchText"
                                            placeholder="Music, sports, seniors, family..."
                                            autoComplete="on"
                                            value={sessionSearch}
                                            onChange={(e) => setSessionSearch(e.target.value)}
                                        />
                                    </fieldset>
                                </div>
                                <div className="col-lg-6">
                                    <fieldset>
                                        <label htmlFor="category" className="form-label">
                                            Pick A Category
                                        </label>
                                        <select
                                            name="category"
                                            className="form-select"
                                            id="category"
                                            value={categorySearch}
                                            onChange={(e) => setCategorySearch(e.target.value)}
                                        >
                                            <option value="">Choose a category</option>
                                            {portfolioCategories.map((category) =>
                                                <option key={category.category} value={category.category}>
                                                    {category.category} Photography
                                                    ({category.sessions.length} Sessions)
                                                </option>)}
                                        </select>
                                    </fieldset>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>

        {selectedCategory ? categoryVibeMarkup : categoryPickerMarkup}

        {categorySearch === ''
            ? <>{categoriesMarkup}{photosMarkup}</>
            : <>{photosMarkup}{categoriesMarkup}</>}

        {(categorySearch === ''
                || categorySearch === "Weddings")
            && <Masonry/>}
    </>);
};

export default SearchForm;
