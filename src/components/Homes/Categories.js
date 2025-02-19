import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import mediaLibrary from "../MediaLibrary/MediaLibrary";
const Categories = () => {
    return (_jsx("section", { className: "popular-categories", children: _jsx("div", { className: "container-fluid", children: _jsxs("div", { className: "row", children: [_jsx("div", { className: "col-lg-6", children: _jsxs("div", { className: "section-heading", children: [_jsx("h6", { children: "Our Categories" }), _jsxs("h4", { children: ["Check Out ", _jsx("em", { children: "Popular" }), " Contest ", _jsx("em", { children: "Categories" })] })] }) }), _jsx("div", { className: "col-lg-6", children: _jsx("div", { className: "main-button", children: _jsx("a", { href: "categories.html", children: "Discover All Categories" }) }) }), [
                        {
                            id: 1,
                            title: "Graduation",
                            contests: 126,
                            icon: "icon-01.png",
                            image: mediaLibrary.Graduations.path + '/' + mediaLibrary.Graduations.featuredVertical
                        },
                        {
                            id: 2,
                            title: "Music",
                            contests: 116,
                            icon: "icon-02.png",
                            image: mediaLibrary.Music.path + '/' + mediaLibrary.Music.featuredVertical
                        },
                        {
                            id: 3,
                            title: "Weddings",
                            contests: 164,
                            icon: "icon-03.png",
                            image: mediaLibrary.Weddings.path + '/' + mediaLibrary.Weddings.featuredVertical
                        },
                        {
                            id: 4,
                            title: "Sports",
                            contests: 135,
                            icon: "icon-04.png",
                            image: mediaLibrary.Sports.path + '/' + mediaLibrary.Sports.featuredVertical
                        }
                    ].map((category) => (_jsx("div", { className: "col-lg-3 col-sm-6", children: _jsxs("div", { className: "popular-item", children: [_jsxs("div", { className: "top-content", children: [_jsx("div", { className: "icon", children: _jsx("img", { src: `/assets/images/${category.icon}`, alt: "" }) }), _jsxs("div", { className: "right", children: [_jsx("h4", { children: category.title }), _jsxs("span", { children: [_jsx("em", { children: category.contests }), " Photo Sessions"] })] })] }), _jsxs("div", { className: "thumb", children: [_jsx("img", { src: category.image, alt: "" }), _jsx("span", { className: "category", children: "Top Contest" }), _jsxs("span", { className: "likes", children: [_jsx("i", { className: "fa fa-heart" }), " 256"] })] }), _jsx("div", { className: "main-button border-button", children: _jsxs("a", { href: "contest-details.html", children: ["Browse ", category.title, " Contests"] }) })] }) }, category.id)))] }) }) }));
};
export default Categories;
