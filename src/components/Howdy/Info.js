import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
const Info = () => {
    return (_jsx("div", { className: "user-info mt-3", children: _jsx("div", { className: "container", children: _jsx("div", { className: "row", children: [
                    { title: _jsxs(_Fragment, { children: ["Client", _jsx("br", {}), "Ratings"] }), value: "4.9", subtitle: "of 5.00 Stars" },
                    { title: _jsxs(_Fragment, { children: ["Portfolio", _jsx("br", {}), "Views"] }), value: "12,500", subtitle: "Monthly" },
                    { title: _jsxs(_Fragment, { children: ["Weddings", _jsx("br", {}), "Captured"] }), value: "250+", subtitle: "Since 2015" },
                    { title: _jsxs(_Fragment, { children: ["Graduation", _jsx("br", {}), "Sessions"] }), value: "85", subtitle: "Booked Last Year" },
                    { title: _jsxs(_Fragment, { children: ["Professional", _jsx("br", {}), "Headshots"] }), value: "120", subtitle: "Clients Served" },
                    { title: _jsxs(_Fragment, { children: ["Family", _jsx("br", {}), "Photoshoots"] }), value: "150", subtitle: "Memories Captured" },
                ].map((item, index) => (_jsx("div", { className: "col-lg-2 col-sm-6", children: _jsxs("div", { className: "info", style: {
                            height: "180px",
                        }, children: [_jsx("h6", { children: item.title }), _jsx("h4", { children: item.value }), _jsx("span", { children: item.subtitle })] }) }, index))) }) }) }));
};
export default Info;
