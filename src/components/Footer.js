import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const Footer = () => {
    const currentYear = new Date().getFullYear();
    return (_jsx("footer", { children: _jsx("div", { className: "container", children: _jsx("div", { className: "row", children: _jsx("div", { className: "col-lg-12", children: _jsxs("p", { children: ["Copyright \u00A9 ", currentYear, " ", _jsx("a", { href: "#", children: "Nicole Dodge" }), ", DBA. All rights reserved.", _jsx("br", {}), "Design: ", _jsx("a", { title: "CSS Templates", rel: "sponsored", href: "https://templatemo.com/page/1", target: "_blank", children: "TemplateMo" }), "Distribution: ", _jsx("a", { title: "CSS Templates", rel: "sponsored", href: "https://themewagon.com", target: "_blank", children: "ThemeWagon" })] }) }) }) }) }));
};
export default Footer;
