import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import Photos from "./SessionExplorer";
import Masonry from "../Galery/Masonry";
import { Link, useParams } from "react-router-dom";
import { PORTFOLIO } from "../../pages/Portfolio";
import MediaLibrary from "../MediaLibrary/MediaLibrary";
import { normalize } from "../../functions/normalize";
const SearchForm = () => {
    const { categoryName, sessionName } = useParams();
    const [sessionSearch, setSessionSearch] = useState(sessionName || '');
    const [categorySearch, setCategorySearch] = useState(categoryName || '');
    console.log('sessionSearch', sessionSearch, 'categorySearch', categorySearch);
    const handleSubmit = (event) => {
        event.preventDefault();
        console.log("Searching for:", { contest: sessionSearch, category: categorySearch });
    };
    console.log('sessionSearch', sessionSearch);
    console.log('categorySearch', categorySearch === '', categorySearch === undefined);
    const categories = Object.values(MediaLibrary)
        .filter((category) => categorySearch === '' || categorySearch === category.category)
        .filter((category) => category.featuredVertical
        && (sessionSearch === '' ||
            normalize(sessionSearch)
                .includes(normalize(category.category))));
    const categoriesMarkup = _jsx("section", { className: "photos-videos", children: _jsx("div", { className: "container", children: _jsxs("div", { className: "row", children: [_jsx("div", { className: "col-lg-12", children: _jsxs("div", { className: "section-heading text-center", children: [_jsx("h6", { children: "Moments & Memories" }), _jsx("h4", { children: categories.length === 1
                                        ? _jsxs(_Fragment, { children: ["Searching Through ", categorySearch] })
                                        : _jsxs(_Fragment, { children: ["Featured ", _jsx("em", { children: "Categories" })] }) })] }) }), categories.map((category, key) => {
                        let columnSize, height, imagePath;
                        if (categories.length === 1) {
                            imagePath = category.path + '/' + category.featuredHorizontal;
                            columnSize = "12";
                            height = '100%';
                        }
                        else {
                            imagePath = category.path + '/' + category.featuredVertical;
                            columnSize = key < 2 ? "6" : "4";
                            height = '416px';
                        }
                        return _jsx("div", { className: `col-lg-${columnSize}`, onClick: () => setCategorySearch(category.category), children: _jsx(Link, { to: PORTFOLIO + '/' + category.category + '/', children: _jsxs("div", { className: "item", children: [_jsxs("div", { className: "thumb", children: [_jsx("img", { src: imagePath, alt: category.name, style: {
                                                        height: height,
                                                        objectPosition: "50% 20%", // Aligns the image to the top
                                                        overflow: "hidden",
                                                        objectFit: "cover", // Prevents distortion while covering the box
                                                    } }), _jsxs("div", { className: "top-content", children: [_jsx("h4", { children: category.name }), _jsxs("h6", { children: [_jsx("i", { className: "fa fa-camera-alt" }), " ", category.sessions.length, " |", " ", _jsx("i", { className: "fa fa-at" }), " NikkiDodgePhotography"] })] })] }), _jsx("div", { className: "down-content", children: _jsxs("div", { className: "row", children: [_jsx("div", { className: "col-7", children: _jsx("h2", { style: {
                                                                color: "white",
                                                            }, children: "Description: " }) }), _jsx("div", { className: "col-5", children: _jsxs("h6", { children: ["Category: ", category.category] }) })] }) })] }) }) }, key);
                    })] }) }) });
    const photosMarkup = _jsx(Photos, { categorySearch: categorySearch, sessionSearch: sessionSearch });
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: "search-form", children: _jsx("div", { className: "container", children: _jsx("div", { className: "row", children: _jsx("div", { className: "col-lg-12", children: _jsx("form", { id: "search-form", name: "gs", onSubmit: handleSubmit, role: "search", children: _jsxs("div", { className: "row", children: [_jsx("div", { className: "col-lg-6", children: _jsxs("fieldset", { children: [_jsx("label", { htmlFor: "contest", className: "form-label", children: "Search Any Contest" }), _jsx("input", { type: "text", name: "contest", className: "searchText", placeholder: "Contest Name...", autoComplete: "on", required: true, value: sessionSearch, onChange: (e) => setSessionSearch(e.target.value) })] }) }), _jsx("div", { className: "col-lg-6", children: _jsxs("fieldset", { children: [_jsx("label", { htmlFor: "category", className: "form-label", children: "Pick Category" }), _jsxs("select", { name: "category", className: "form-select", id: "category", value: categorySearch, onChange: (e) => setCategorySearch(e.target.value), children: [_jsx("option", { value: "", children: "Choose a category" }), Object.values(MediaLibrary).map((category) => _jsxs("option", { value: category.category, children: [category.category, " Photography (", category.sessions.length, " Sessions)"] }))] })] }) })] }) }) }) }) }) }), categorySearch === ''
                ? _jsxs(_Fragment, { children: [categoriesMarkup, photosMarkup] })
                : _jsxs(_Fragment, { children: [photosMarkup, categoriesMarkup] }), (categorySearch === ''
                || categorySearch === "Weddings")
                && _jsx(Masonry, {})] }));
};
export default SearchForm;
