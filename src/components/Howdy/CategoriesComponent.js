import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import mediaLibrary from "../MediaLibrary/MediaLibrary";
import { Link } from "react-router-dom";
import { PORTFOLIO } from "../../pages/Portfolio";
const categories = [
    {
        imgSrc: mediaLibrary.Weddings.path + '/' + mediaLibrary.Weddings.featuredHorizontal,
        category: mediaLibrary.Weddings.category,
        shoots: mediaLibrary.Weddings.sessions.length,
        icon: "fa-ring"
    },
    {
        imgSrc: mediaLibrary.Family.path + '/' + mediaLibrary.Family.featuredHorizontal,
        category: mediaLibrary.Family.category,
        shoots: mediaLibrary.Family.sessions.length,
        icon: "fa-people-roof"
    },
    {
        imgSrc: mediaLibrary.Music.path + '/' + mediaLibrary.Music.featuredHorizontal,
        category: mediaLibrary.Music.category,
        shoots: mediaLibrary.Music.sessions.length,
        icon: "fa-icons"
    },
    {
        imgSrc: mediaLibrary.Graduations.path + '/' + mediaLibrary.Graduations.featuredHorizontal,
        category: mediaLibrary.Graduations.category,
        shoots: mediaLibrary.Graduations.sessions.length,
        icon: "fa-graduation-cap"
    },
    {
        imgSrc: mediaLibrary.Sports.path + '/' + mediaLibrary.Sports.featuredHorizontal,
        category: mediaLibrary.Sports.category,
        shoots: mediaLibrary.Sports.sessions.length,
        icon: "fa-volleyball"
    },
];
const CategoriesComponent = () => {
    return (_jsx("div", { className: "top-categories", children: _jsx("div", { className: "container", children: _jsx("div", { className: "row", children: categories.map((category, index) => (_jsx("div", { className: "col-lg col-sm-4", children: _jsx(Link, { to: PORTFOLIO + '/' + category.category, children: _jsxs("div", { className: "item", children: [_jsx("div", { className: "icon", children: _jsx("i", { className: `fa-solid ${category.icon} fa-3x  mt-2` }) }), _jsx("h4", { children: category.category }), _jsx("span", { children: "Photoshoots" }), _jsx("span", { className: "counter", children: category.shoots })] }) }) }, index))) }) }) }));
};
export default CategoriesComponent;
