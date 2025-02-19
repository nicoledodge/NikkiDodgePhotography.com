import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import mediaLibrary from "../MediaLibrary/MediaLibrary";
const closedContests = [
    {
        id: 1,
        image: mediaLibrary.Family.path + '/' + mediaLibrary.Family.sessions[0].name + '/' + mediaLibrary.Family.sessions[0].featuredHorizontal,
        winner: "Anthony Soft",
        award: "$1,600",
        participants: 88,
        pictures: 320
    },
    {
        id: 2,
        image: mediaLibrary.Weddings.path + '/' + mediaLibrary.Weddings.sessions[3].name + '/' + mediaLibrary.Weddings.sessions[3].featuredHorizontal,
        winner: "Anthony Soft",
        award: "$4,200",
        participants: 96,
        pictures: 410
    },
    {
        id: 3,
        image: mediaLibrary.Engagements.path + '/' + mediaLibrary.Engagements.sessions[0].name + '/' + mediaLibrary.Engagements.sessions[0].featuredHorizontal,
        winner: "Anthony Soft",
        award: "$3,200",
        participants: 74,
        pictures: 284
    }
];
const Contests = () => {
    return (_jsx("section", { className: "closed-contests", children: _jsx("div", { className: "container", children: _jsxs("div", { className: "row", children: [_jsx("div", { className: "col-lg-12", children: _jsxs("div", { className: "section-heading text-center", children: [_jsx("h6", { style: {
                                        color: "var(--fourth-color)"
                                    }, children: "Some of Our Favorite Sessions" }), _jsxs("h4", { style: {
                                        color: "var(--fourth-color)"
                                    }, children: ["Handpicked ", _jsx("em", { children: "Goodness" }), " That Makes Us ", _jsx("em", { children: "Smile" })] })] }) }), _jsx("div", { className: "col-lg-12", children: _jsx(Swiper, { modules: [Navigation, Pagination], navigation: true, pagination: { clickable: true }, spaceBetween: 20, slidesPerView: 3, loop: true, breakpoints: {
                                320: { slidesPerView: 1 },
                                768: { slidesPerView: 2 },
                                1024: { slidesPerView: 3 },
                            }, children: closedContests.map((contest) => (_jsx(SwiperSlide, { children: _jsxs("div", { className: "closed-item", children: [_jsxs("div", { className: "thumb", children: [_jsx("img", { src: contest.image, alt: "" }), _jsxs("span", { className: "winner", children: [_jsx("em", { children: "Winner:" }), " ", contest.winner] }), _jsxs("span", { className: "price", children: [_jsx("em", { children: "Award :" }), " ", contest.award] })] }), _jsx("div", { className: "down-content", children: _jsxs("div", { className: "row", children: [_jsx("div", { className: "col-7", children: _jsxs("h4", { children: [contest.participants, " Participants ", _jsx("br", {}), _jsx("span", { children: "Number Of Artists" })] }) }), _jsx("div", { className: "col-5", children: _jsxs("h4", { className: "pics", children: [contest.pictures, " Pictures ", _jsx("br", {}), _jsx("span", { children: "Submitted Pics" })] }) })] }) })] }) }, contest.id))) }) }), _jsx("div", { className: "col-lg-12 mt-5", children: _jsx("div", { className: "main-button text-center", children: _jsx("a", { href: "contests.html", children: "Browse Open Contests" }) }) })] }) }) }));
};
export default Contests;
