import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from "react-router-dom";
import { PORTFOLIO } from "../pages/Portfolio";
import { HOWDY } from "../pages/Howdy";
import { CONTACT } from "../pages/Contact";
import { PRICING } from "../pages/Pricing";
import { BLOG } from "../pages/Blog";
const Header = () => {
    return _jsx("header", { className: "header-area header-sticky", children: _jsxs("nav", { className: "main-nav", children: [_jsxs("ul", { className: "nav", children: [_jsx("li", { children: _jsx(Link, { to: "/", className: "active", children: "Home" }) }), _jsx("li", { children: _jsx(Link, { to: HOWDY, className: "active", children: "Howdy" }) }), _jsx("li", { children: _jsx(Link, { to: PORTFOLIO, className: "active", children: "Portfolio" }) })] }), _jsx(Link, { to: '/', className: "logo", children: _jsx("img", { src: '/assets/images/logo-black.png', alt: "Niki Dodge Photography" }) }), _jsxs("ul", { className: "nav", children: [_jsx("li", { children: _jsx(Link, { to: PRICING, children: "Pricing" }) }), _jsx("li", { children: _jsx(Link, { to: BLOG, children: "Blog" }) }), _jsx("li", { children: _jsx(Link, { to: CONTACT, children: "Contact" }) })] }), _jsx("a", { className: "menu-trigger", children: _jsx("span", { children: "Menu" }) })] }) });
};
export default Header;
