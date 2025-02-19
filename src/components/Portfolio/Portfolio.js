import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const Portfolio = () => {
    const portfolioItems = [
        {
            imgSrc: "assets/images/portfolio-01.jpg",
            title: "Walk In the Beach",
            ranked: "2nd",
            award: "None",
        },
        {
            imgSrc: "assets/images/portfolio-02.jpg",
            title: "Walk In The Nature",
            ranked: "3rd",
            award: "EOS R3",
        },
        {
            imgSrc: "assets/images/portfolio-03.jpg",
            title: "Walk In The Forest",
            ranked: "4th",
            award: "EOS R7",
        },
        {
            imgSrc: "assets/images/portfolio-04.jpg",
            title: "Forest Nature",
            ranked: "2nd",
            award: "EOS R3",
        },
        {
            imgSrc: "assets/images/portfolio-05.jpg",
            title: "Fly thru the river",
            ranked: "1st",
            award: "EOS R1",
        },
        {
            imgSrc: "assets/images/portfolio-06.jpg",
            title: "Rocky Mountain",
            ranked: "2nd",
            award: "None",
        },
        {
            imgSrc: "assets/images/portfolio-07.jpg",
            title: "Rocky Mountain . Part 2",
            ranked: "2nd",
            award: "None",
        },
        {
            imgSrc: "assets/images/portfolio-08.jpg",
            title: "Blue Lake Nature",
            ranked: "4th",
            award: "None",
        },
        {
            imgSrc: "assets/images/portfolio-09.jpg",
            title: "Walk In The Forest",
            ranked: "3rd",
            award: "None",
        },
    ];
    return (_jsx("section", { className: "portfolio", children: _jsx("div", { className: "container", children: _jsxs("div", { className: "row", children: [portfolioItems.map((item, index) => (_jsx("div", { className: "col-lg-4", children: _jsxs("div", { className: "thumb", children: [_jsx("img", { src: item.imgSrc, alt: item.title }), _jsx("div", { className: "hover-effect", children: _jsxs("div", { className: "content", children: [_jsx("h4", { children: item.title }), _jsxs("span", { children: ["Ranked: ", _jsx("em", { children: item.ranked })] }), _jsxs("span", { children: ["Award Won: ", _jsx("em", { children: item.award })] }), _jsxs("ul", { children: [_jsx("li", { children: _jsx("a", { href: "#", children: _jsx("i", { className: "fa fa-heart" }) }) }), _jsx("li", { children: _jsx("a", { href: "#", children: _jsx("i", { className: "fa fa-eye" }) }) })] })] }) })] }) }, index))), _jsx("div", { className: "col-lg-12", children: _jsx("div", { className: "main-button", children: _jsx("a", { href: "#", children: "Load More Photos" }) }) })] }) }) }));
};
export default Portfolio;
