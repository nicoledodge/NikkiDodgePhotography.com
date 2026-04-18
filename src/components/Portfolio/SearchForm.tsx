import React, {useState} from "react";
import Photos from "./SessionExplorer";
import Masonry from "../Galery/Masonry";
import {Link, useParams} from "react-router-dom";
import {PORTFOLIO} from "../../pages/Portfolio";
import MediaLibrary from "../MediaLibrary/MediaLibrary";
import {normalize} from "../../functions/normalize";
import {getCategoryCopy} from "../../data/categoryCopy";


const SearchForm = () => {

    const {categoryName, search} = useParams();
    const [sessionSearch, setSessionSearch] = useState(search || '');
    const [categorySearch, setCategorySearch] = useState(categoryName || '');

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
    };

    const categories = Object.values(MediaLibrary)
        .filter((category) => categorySearch === '' || categorySearch === category.category)
        .filter((category) =>
            category.featuredVertical
            && (
                sessionSearch === '' ||
                normalize(category.category)
                    .includes(normalize(sessionSearch))
            ));

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

                    return <div key={key} className={`col-lg-${columnSize}`}
                                onClick={() => setCategorySearch(category.category)}>
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
                                            <i className="fa fa-camera-alt"></i> {category.sessions.length} |{" "}
                                            <i className="fa fa-at"></i> NikkiDodgePhotography
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
                                            placeholder="Weddings, seniors, family, music..."
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
                                            {Object.values(MediaLibrary).map((category) =>
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

        {categorySearch === ''
            ? <>{categoriesMarkup}{photosMarkup}</>
            : <>{photosMarkup}{categoriesMarkup}</>}

        {(categorySearch === ''
                || categorySearch === "Weddings")
            && <Masonry/>}
    </>);
};

export default SearchForm;
