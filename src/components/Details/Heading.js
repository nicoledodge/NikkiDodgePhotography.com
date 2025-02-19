import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from "react-router-dom";
import { CONTACT } from "../../pages/Contact";
const Heading = () => {
    return (_jsx("div", { className: "page-heading", children: _jsx("div", { className: "container", children: _jsx("div", { className: "row", children: _jsxs("div", { id: "heading-box", className: "col-lg-8 offset-lg-2 header-text mt-5", children: [_jsxs("h2", { children: ["Invest in ", _jsx("em", { children: "Timeless Memories" })] }), _jsx("p", { children: "Your wedding day is more than just a moment\u2014it's a story waiting to be told. From the intimate details to the grand celebrations, I\u2019m here to capture it all with artistry and heart. Choosing the right photographer isn\u2019t just about price; it\u2019s about finding someone who sees your love the way you do. Let\u2019s create something unforgettable together." }), _jsx("div", { className: "main-button mt-5", children: _jsx(Link, { to: CONTACT, children: "Let\u2019s Chat About Your Day" }) })] }) }) }) }));
};
export default Heading;
