import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import mediaLibrary from "../MediaLibrary/MediaLibrary";
import { Link } from "react-router-dom";
import { GALLERY } from "../../pages/Gallery";
const testimonialsData = [
    {
        text: "I had always adored Nikki’s beautiful style of photographing weddings, so when we got engaged we basically picked our wedding date around Nikki’s availability! She perfectly captured our day and our loved ones, and her photos serve as constant reminders of our happy day. We especially loved how she captured the simple, subtle moments and details like flowers and fabrics to create a story of the day. Nikki is fantastic, warm, and highly professional!",
        name: "Sally & Dan",
        userId: "User #007704",
        image: "assets/images/author.jpg",
    },
    {
        text: "Nikki is a gifted photographer, artist, and human being. Her depth of experience, creative vision, artistic insight, and eye for compositions are unrivaled. Nikki has a wonderful love affair with light and nature. It is the way she sees the world and how she captures photographs that sets her apart. She doesn’t just capture a shot, she captures an experience. We entrusted Nikki with our special day, and we are so thankful to her for beautifully capturing the heart and soul of our wedding.",
        name: "Ria & Andrew",
        userId: "User #007772",
        image: "assets/images/author.jpg",
    }
];
const clientLogos = [
    _jsx(Link, { to: GALLERY + '/' + mediaLibrary.Family.category + '/' + mediaLibrary.Family.featuredVertical.split('/')[0], children: _jsx("img", { src: mediaLibrary.Family.path + '/' + mediaLibrary.Family.featuredVertical, alt: "Client Logo" }) }),
    _jsx(Link, { to: GALLERY + '/' + mediaLibrary.Sports.category + '/' + mediaLibrary.Sports.featuredVertical.split('/')[0], children: _jsx("img", { src: mediaLibrary.Sports.path + '/' + mediaLibrary.Sports.featuredVertical, alt: "Client Logo" }) }),
    _jsx(Link, { to: GALLERY + '/' + mediaLibrary.Graduations.category + '/' + mediaLibrary.Graduations.featuredVertical.split('/')[0], children: _jsx("img", { src: mediaLibrary.Graduations.path + '/' + mediaLibrary.Graduations.featuredVertical, alt: "Client Logo" }) }),
    _jsx(Link, { to: GALLERY + '/' + mediaLibrary.Music.category + '/' + mediaLibrary.Music.featuredVertical.split('/')[0], children: _jsx("img", { src: mediaLibrary.Music.path + '/' + mediaLibrary.Music.featuredVertical, alt: "Client Logo" }) }),
    _jsx(Link, { to: GALLERY + '/' + mediaLibrary.Engagements.category + '/' + mediaLibrary.Engagements.featuredVertical.split('/')[0], children: _jsx("img", { src: mediaLibrary.Engagements.path + '/' + mediaLibrary.Engagements.featuredVertical, alt: "Client Logo" }) }),
    _jsx(Link, { to: GALLERY + '/' + mediaLibrary.Lifestyles.category + '/' + mediaLibrary.Lifestyles.featuredVertical.split('/')[0], children: _jsx("img", { src: mediaLibrary.Lifestyles.path + '/' + mediaLibrary.Lifestyles.featuredVertical, alt: "Client Logo" }) })
];
const Testimonials = () => {
    return (_jsx("section", { className: "testimonials", children: _jsx("div", { className: "container", children: _jsxs("div", { className: "row", children: [_jsx("div", { className: "col-lg-12", children: _jsxs("div", { className: "section-heading text-center", children: [_jsx("h6", { children: "Testimonials" }), _jsxs("h4", { children: ["What ", _jsx("em", { children: "My Clients" }), " Are ", _jsx("em", { children: "Saying" })] })] }) }), _jsx("div", { className: "col-lg-8 offset-lg-2", children: _jsx(Swiper, { modules: [Navigation, Pagination, Autoplay], spaceBetween: 20, slidesPerView: 1, navigation: true, pagination: { clickable: true }, autoplay: { delay: 5000, disableOnInteraction: false }, loop: true, children: testimonialsData.map((testimonial, index) => (_jsx(SwiperSlide, { children: _jsx("div", { className: "item", children: _jsxs("div", { className: "content", children: [_jsxs("div", { className: "left-content", children: [_jsx("p", { children: testimonial.text }), _jsx("h4", { children: testimonial.name }), _jsx("span", { children: testimonial.userId })] }), _jsx("div", { className: "image", children: _jsx("img", { src: testimonial.image, alt: testimonial.name }) })] }) }) }, index))) }) }), _jsx("div", { className: "col-lg-12 mt-5", children: _jsx("div", { className: "clients", children: _jsx("div", { className: "row", children: clientLogos.map((logo, index) => (_jsx("div", { className: "col-lg-2 col-4", children: logo }, index))) }) }) })] }) }) }));
};
export default Testimonials;
