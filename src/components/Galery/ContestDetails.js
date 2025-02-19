import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const ContestDetails = ({ award, timeLeft, participants, submissions, description, allowedUses, notAllowedUses, resources, }) => {
    return (_jsx("div", { className: "contest-details", children: _jsx("div", { className: "container", children: _jsxs("div", { className: "row", children: [_jsx("div", { className: "col-lg-12", children: _jsx("div", { className: "top-content", children: _jsxs("div", { className: "row", children: [_jsxs("div", { className: "col-lg-4", children: [_jsx("span", { className: "open", children: "Open Contest" }), _jsxs("span", { className: "wish-list", children: [_jsx("i", { className: "fa fa-heart" }), " Add To Your Favorites"] })] }), _jsx("div", { className: "col-lg-8", children: _jsxs("ul", { children: [_jsxs("li", { children: [_jsx("i", { className: "fa fa-medal" }), " ", _jsx("span", { children: "Award:" }), " ", award] }), _jsxs("li", { children: [_jsx("span", { children: "Time left:" }), " ", timeLeft] }), _jsxs("li", { children: [_jsx("span", { children: "Participants:" }), " ", participants] }), _jsxs("li", { children: [_jsx("span", { children: "Submissions:" }), " ", submissions] }), _jsxs("li", { children: [_jsx("span", { children: "Description:" }), " ", description] })] }) })] }) }) }), _jsx("div", { className: "col-lg-12", children: _jsxs("div", { className: "main-content seventh-background-color", children: [_jsx("h4", { children: "Requirements Of The Contest" }), _jsx("h6", { children: "Picture Should Have" }), allowedUses.map((text, index) => (_jsx("p", { children: text }, index))), _jsx("h6", { className: "second-title", children: "Picture Should Not Have" }), notAllowedUses.map((text, index) => (_jsx("p", { children: text }, index))), _jsx("h4", { className: "second-title", children: "Links To Inspire Your Photo" }), _jsx("div", { className: "row", children: resources.map((resource, index) => (_jsx("div", { className: "col-lg-3 col-6", children: _jsxs("div", { className: "item", children: [_jsx("span", { children: resource.type }), _jsxs("h5", { children: [resource.title, _jsx("br", {}), _jsx("h6", { children: resource.winner })] })] }) }, index))) }), _jsx("div", { className: "main-button", children: _jsx("a", { href: "#", children: "Submit Your Photo/Video" }) })] }) })] }) }) }));
};
// Example Usage
const contestData = {
    award: "$2,400",
    timeLeft: "7 Days",
    participants: 118,
    submissions: 280,
    description: [
        "SnapX Photography is a professional website template with 5 different HTML pages for maximum customizations.",
        "This is based on Bootstrap v5.1.3 CSS framework.",
    ],
    allowedUses: [
        "You are allowed to 100% freely use this SnapX Template for your commercial websites.",
        "You are not allowed to redistribute the template ZIP file on any other Free CSS Template collection websites.",
    ],
    notAllowedUses: [
        "We hope this template is very useful for your website development.",
        "If you need the PSD source files of this template, please feel free to contact TemplateMo.",
    ],
    resources: [
        { type: "JPG", title: "A Trip In The Rain", winner: "Previous Winner" },
        { type: "PNG", title: "A Trip In The Jungle", winner: "Previous Winner" },
        { type: "PDF", title: "A Trip In The Mountain", winner: "Previous Winner" },
        { type: "AI", title: "A Trip In The Forest", winner: "Previous Winner" },
    ],
};
export default function ContestDetailsMock() {
    return _jsx(ContestDetails, { ...contestData });
}
