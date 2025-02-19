import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import MediaLibrary from "../MediaLibrary/MediaLibrary";
const basic = {
    title: "The Basic",
    image: MediaLibrary.Weddings.path + '/' + MediaLibrary.Weddings.sessions[2].name + '/' + MediaLibrary.Weddings.sessions[2].featuredHorizontal,
    price: 1500,
    features: [
        "Access to online gallery including all your photos",
        "Up to eight hours of wedding day coverage",
        "Professionally edited photos",
        "Turnaround aprox 10 weeks"
    ]
};
const deluxe = {
    title: "The Deluxe",
    image: MediaLibrary.Weddings.path + '/' + MediaLibrary.Weddings.sessions[0].name + '/' + MediaLibrary.Weddings.sessions[0].featuredHorizontal,
    price: 1750,
    features: [
        ...basic.features,
        "1 Hour Bridal Session"
    ]
};
const premium = {
    title: "The Premium",
    image: MediaLibrary.Weddings.path + '/' + MediaLibrary.Weddings.sessions[5].name + '/' + MediaLibrary.Weddings.sessions[5].featuredHorizontal,
    price: 2000,
    features: [
        ...deluxe.features,
        "2 Hour Engagement Session"
    ]
};
const pricingPlans = [
    basic, deluxe, premium
];
const Pricing = () => {
    return (_jsx("section", { className: "pricing-plans", children: _jsx("div", { className: "container", children: _jsxs("div", { className: "row", children: [_jsx("div", { className: "col-lg-12", children: _jsxs("div", { className: "section-heading text-center", children: [_jsx("h6", { children: "Our Pricing" }), _jsxs("h4", { children: [_jsx("em", { children: "Wedding" }), " Packages"] })] }) }), pricingPlans.map((plan, key) => (_jsx("div", { className: "col-lg-4", children: _jsxs("div", { className: "pricing-item", children: [_jsx("img", { src: `${plan.image}`, alt: "" }), _jsx("h4", { children: plan.title }), _jsx("ul", { className: `plan-${key}`, style: {
                                        minHeight: "200px"
                                    }, children: plan.features.map((feature, index) => (_jsx("li", { children: feature }, index))) }), _jsxs("span", { className: "price", children: ["$", plan.price, " USD"] }), _jsx("div", { className: "border-button", children: _jsx("a", { href: "#", children: "Choose This Plan" }) })] }) }, key)))] }) }) }));
};
export default Pricing;
