import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const contests = [
    {
        id: 1,
        image: "assets/images/contest-01.jpg",
        title: "Graduation",
        award: "Award Price",
        price: "$1,200",
        participants: 80,
        submissions: 260,
    },
    {
        id: 2,
        image: "assets/images/contest-02.jpg",
        title: "Walk In The Nature Night",
        award: "Award Price",
        price: "$2,400",
        participants: 60,
        submissions: 212,
    },
    {
        id: 3,
        image: "assets/images/contest-03.jpg",
        title: "Walk In The Nature Night",
        award: "Award Price",
        price: "$3,600",
        participants: 55,
        submissions: 150,
    },
    {
        id: 4,
        image: "assets/images/contest-04.jpg",
        title: "Walk In The Nature Night",
        award: "Award Price",
        price: "$4,800",
        participants: 40,
        submissions: 120,
    },
];
const ContestWin = () => {
    return (_jsx("section", { className: "contest-win mb-5", children: _jsx("div", { className: "container-fluid", children: _jsxs("div", { className: "row", children: [_jsx("div", { className: "col-lg-12", children: _jsxs("div", { className: "section-heading text-center", children: [_jsx("h6", { children: "Recently Added Contests by Users" }), _jsxs("h4", { children: ["Current ", _jsx("em", { children: "Contests" }), " to Enter Now & ", _jsx("em", { children: "Win" })] })] }) }), contests.map((contest) => (_jsx("div", { className: "col-lg-3", children: _jsxs("div", { className: "contest-item", children: [_jsxs("div", { className: "top-content", children: [_jsx("span", { className: "award", children: contest.award }), _jsx("span", { className: "price", children: contest.price })] }), _jsx("img", { src: contest.image, alt: contest.title }), _jsx("h4", { children: contest.title }), _jsxs("div", { className: "info", children: [_jsxs("span", { className: "participants", children: [_jsx("img", { src: "/assets/images/icon-03.png", alt: "Participants" }), _jsx("br", {}), " ", contest.participants, " Participants"] }), _jsxs("span", { className: "submittions", children: [_jsx("img", { src: "/assets/images/icon-01.png", alt: "Submissions" }), _jsx("br", {}), " ", contest.submissions, " Submissions"] })] }), _jsx("div", { className: "border-button", children: _jsx("a", { href: "contest-details.html", children: "Browse Nature Pic Contests" }) }), _jsx("span", { className: "info", children: "* Client will pay via Online Payments" })] }) }, contest.id))), _jsx("div", { className: "col-lg-12", children: _jsxs("ul", { className: "pagination", children: [_jsx("li", { children: _jsx("a", { href: "#", children: _jsx("i", { className: "fa fa-arrow-left" }) }) }), _jsx("li", { children: _jsx("a", { href: "#", children: "1" }) }), _jsx("li", { className: "active", children: _jsx("a", { href: "#", children: "2" }) }), _jsx("li", { children: _jsx("a", { href: "#", children: "3" }) }), _jsx("li", { children: _jsx("a", { href: "#", children: _jsx("i", { className: "fa fa-arrow-right" }) }) })] }) })] }) }) }));
};
export default ContestWin;
