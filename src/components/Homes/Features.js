import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import MediaLibrary from "../MediaLibrary/MediaLibrary";
import { shuffleArray } from "../../functions/shuffleArray";
const featuredItems = shuffleArray(MediaLibrary.Featured.sessions
    .filter(s => s.name === "Horizontal")
    .flatMap((session) => session.mediaFiles.map((image) => ({
    category: MediaLibrary.Featured.category,
    path: MediaLibrary.Featured.path,
    name: session.name,
    mediaFiles: session.mediaFiles,
    image: image
}))))
    .map((imageObject, index) => (_jsx(SwiperSlide, { children: _jsx("div", { className: "item", children: _jsxs("div", { className: "thumb", children: [_jsx("img", { src: MediaLibrary.Featured.path + '/' + imageObject.name + '/' + imageObject.image, alt: "" }), _jsx("div", { className: "hover-effect", children: _jsxs("div", { className: "content", children: [_jsxs("h4", { children: [imageObject.name, " ", _jsx("i", { className: "fa fa-star" }), _jsx("i", { className: "fa fa-star" }), _jsx("i", { className: "fa fa-star" }), _jsx("i", { className: "fa fa-star" }), " ", _jsx("span", { children: "(4.5)" })] }), _jsxs("ul", { children: [_jsxs("li", { children: [_jsx("span", { children: "Contest Winner:" }), " ", imageObject.image] }), _jsxs("li", { children: [_jsx("span", { children: "Contest Author:" }), " Vincent Adam"] }), _jsxs("li", { children: [_jsx("span", { children: "Awards:" }), " $1,200 + Canon EOS R10"] })] })] }) })] }) }) }, index)));
const Features = () => {
    return (_jsx("section", { className: "featured-items", id: "featured-items", children: _jsx("div", { className: "container", children: _jsx("div", { className: "row", children: _jsx("div", { className: "col-lg-12", children: _jsx(Swiper, { modules: [Navigation, Pagination, Autoplay], navigation: true, pagination: { clickable: true }, spaceBetween: 20, slidesPerView: 3, autoplay: {
                            delay: 3000, // ✅ Auto-slide every 3 seconds
                            disableOnInteraction: false, // ✅ Keeps autoplay even after user interaction
                            pauseOnMouseEnter: true, // ✅ Keeps autoplay even after user interaction
                        }, loop: true, breakpoints: {
                            320: { slidesPerView: 1 },
                            768: { slidesPerView: 2 },
                            1024: { slidesPerView: 3 },
                        }, children: featuredItems }) }) }) }) }));
};
export default Features;
