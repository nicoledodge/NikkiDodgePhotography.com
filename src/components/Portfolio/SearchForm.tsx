import React, {useState} from "react";
import mediaLibrary from "../MediaLibrary/MediaLibrary.tsx";
import Photos from "./SessionExplorer.tsx";
import Masonry from "../Galery/Masonry.tsx";
import {Link, useParams} from "react-router-dom";
import {PORTFOLIO} from "../../pages/Portfolio.tsx";
import MediaLibrary from "../MediaLibrary/MediaLibrary.tsx";
import {normalize} from "../../functions/normalize.tsx";

export interface Search {
    categorySearch: string;
    sessionSearch: string;
}

const SearchForm: React.FC = () => {

    const {categoryName, sessionName} = useParams();
    const [sessionSearch, setSessionSearch] = useState(sessionName || '');
    const [categorySearch, setCategorySearch] = useState(categoryName || '');

    console.log(
        'sessionSearch', sessionSearch,
        'categorySearch', categorySearch
    );

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        console.log("Searching for:", {contest: sessionSearch, category: categorySearch});
    };

    console.log('sessionSearch', sessionSearch)
    console.log('categorySearch', categorySearch === '', categorySearch === undefined)

    const categories = Object.values(MediaLibrary)
        .filter((category) => categorySearch === '' || categorySearch === category.category)
        .filter((category) =>
            category.featuredVertical
            && (
                sessionSearch === '' ||
                normalize(sessionSearch)
                    .includes(normalize(category.category))
            ));

    const categoriesMarkup = <section className="photos-videos">
        <div className="container">
            <div className="row">
                <div className="col-lg-12">
                    <div className="section-heading text-center">
                        <h6>Moments & Memories</h6>
                        <h4>
                            {categories.length === 1
                                ? <>Searching Through {categorySearch}</>
                                : <>Featured <em>Categories</em></>
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
                        <Link to={PORTFOLIO + '/' + category.category + '/'}>
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
                                            }}>Description: </h2>
                                        </div>
                                        <div className="col-5">
                                            <h6>Category: {category.category}</h6>
                                        </div>
                                    </div>
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
                                        <label htmlFor="contest" className="form-label">
                                            Search Any Contest
                                        </label>
                                        <input
                                            type="text"
                                            name="contest"
                                            className="searchText"
                                            placeholder="Contest Name..."
                                            autoComplete="on"
                                            required
                                            value={sessionSearch}
                                            onChange={(e) => setSessionSearch(e.target.value)}
                                        />
                                    </fieldset>
                                </div>
                                <div className="col-lg-6">
                                    <fieldset>
                                        <label htmlFor="category" className="form-label">
                                            Pick Category
                                        </label>
                                        <select
                                            name="category"
                                            className="form-select"
                                            id="category"
                                            value={categorySearch}
                                            onChange={(e) => setCategorySearch(e.target.value)}
                                        >
                                            <option value="">Choose a category</option>
                                            {Object.values(mediaLibrary).map((category) =>
                                                <option value={category.category}>
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
