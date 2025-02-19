import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const ContestDetails = () => {
    return (_jsx("div", { className: "contest-details", children: _jsx("div", { className: "container", children: _jsxs("div", { className: "row", children: [_jsx("div", { className: "col-lg-12", children: _jsx("div", { className: "top-content", style: {
                                display: "flex",
                                justifyContent: "center", /* Centers horizontally */
                                alignItems: "center", /* Centers vertically if needed */
                                flexWrap: "wrap", /* Ensures wrapping on smaller screens */
                                textAlign: "center",
                                gap: "10px" /* Adds spacing between items */
                            }, children: _jsx("div", { className: "row", children: _jsxs("div", { className: "col-lg-12 d-flex justify-content-center flex-wrap", children: [_jsx("span", { className: "open mx-2", children: "\uD83D\uDCF8 Featured Photos" }), _jsx("span", { className: "open mx-2", children: "\uD83D\uDCDD Blog Posts" }), _jsx("span", { className: "open mx-2", children: "\uD83C\uDF0D Travel Stories" }), _jsx("span", { className: "open mx-2", children: "\uD83C\uDF93 Photography Tips" }), _jsx("span", { className: "open mx-2", children: "\uD83C\uDFC6 Contest Info" }), _jsx("span", { className: "open mx-2", children: "\uD83D\uDCC5 Upcoming Events" }), _jsx("span", { className: "open mx-2", children: "\uD83D\uDCE9 Contact Me" })] }) }) }) }), _jsx("div", { className: "col-lg-12", children: _jsxs("div", { className: "main-content seventh-background-color mb-5", children: [_jsx("h4", { children: "My life" }), _jsx("h6", { children: "Picture Should Have" }), _jsx("p", { children: "yooo" }, 1), _jsx("h6", { className: "second-title", children: "Picture Should Not Have" }), _jsx("p", { children: "Sample text here to give some idea of what this looks like.." }, 1), _jsx("h4", { className: "second-title", children: "Links To Inspire Your Photo" }), _jsxs("div", { className: "row", children: [_jsx("div", { className: "col-lg-3 col-6", children: _jsxs("div", { className: "item", children: [_jsx("span", { children: "hi" }), _jsxs("h5", { children: ["I travel", _jsx("br", {}), _jsx("h6", { children: "We hope this template is very useful for your website development." })] })] }) }, 1), _jsx("div", { className: "col-lg-3 col-6", children: _jsxs("div", { className: "item", children: [_jsx("span", { children: "hi" }), _jsxs("h5", { children: ["I travel", _jsx("br", {}), _jsx("h6", { children: "We hope this template is very useful for your website development." })] })] }) }, 1), _jsx("div", { className: "col-lg-3 col-6", children: _jsxs("div", { className: "item", children: [_jsx("span", { children: "hi" }), _jsxs("h5", { children: ["I travel", _jsx("br", {}), _jsx("h6", { children: "We hope this template is very useful for your website development." })] })] }) }, 1), _jsx("div", { className: "col-lg-3 col-6", children: _jsxs("div", { className: "item", children: [_jsx("span", { children: "hi" }), _jsxs("h5", { children: ["I travel", _jsx("br", {}), _jsx("h6", { children: "We hope this template is very useful for your website development." })] })] }) }, 1)] }), _jsx("div", { className: "main-button", children: _jsx("a", { href: "#", children: "Submit Your Photo/Video" }) })] }) })] }) }) }));
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
