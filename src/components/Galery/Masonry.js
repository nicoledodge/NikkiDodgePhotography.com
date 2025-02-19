import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from "react";
import mediaLibrary from "../MediaLibrary/MediaLibrary";
import { Link } from "react-router-dom";
import { GALLERY } from "../../pages/Gallery";
export const getSession = ({ categoryName, sessionName }) => {
    const categoryData = mediaLibrary[categoryName];
    const session = categoryData.sessions.find(s => s.name === sessionName);
    const sessionPath = categoryData.path + "/" + session.name;
    return {
        ...categoryData,
        ...session,
        mediaFiles: session.mediaFiles.map((image) => sessionPath + "/" + image),
        featuredVertical: sessionPath + "/" + categoryData.featuredVertical,
        featuredHorizontal: sessionPath + categoryData.featuredHorizontal
    };
};
const defaultMedia = mediaLibrary.Weddings.sessions.flatMap(s => ({
    ...mediaLibrary.Weddings,
    ...s,
    mediaFiles: s.mediaFiles
        .filter(image => [
        s.featuredHorizontal,
        s.featuredVertical
    ].includes(image))
        .map((image) => {
        return mediaLibrary.Weddings.path + '/' + s.name + '/' + image;
    }),
    featuredHorizontal: mediaLibrary.Weddings.path + '/' + s.name + '/' + s.featuredHorizontal,
    featuredVertical: mediaLibrary.Weddings.path + '/' + s.name + '/' + s.featuredVertical
}));
const Masonry = ({ sessions = defaultMedia, title = "Featured" }) => {
    const imagesRef = useRef(null);
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute("data-src"); // Remove dataset to avoid re-triggering
                    }
                    observer.unobserve(img); // Stop observing once loaded
                }
            });
        }, { rootMargin: "300px", threshold: 0.1 } // Load images earlier and avoid rapid toggling
        );
        imagesRef.current = document.querySelectorAll(".lazyload");
        imagesRef.current.forEach(img => observer.observe(img));
        return () => observer.disconnect(); // Cleanup observer
    }, []);
    return (_jsxs("section", { className: "featured-contests", children: [_jsx("style", { children: `
                .masonry-gallery {
                    column-count: 3; /* Adjust the number of columns */
                    column-gap: 16px; /* Space between items */
                }
                .masonry-item {
                    display: inline-block;
                    width: 100%;
                    margin-bottom: 16px; /* Space between rows */
                }
                .masonry-item img {
                    width: 100%;
                    display: block;
                    border-radius: 8px;
                    object-fit: cover;
                    aspect-ratio: auto; /* Ensures natural proportions */
                    transition: opacity 0.3s ease-in-out;
                    opacity: 0; /* Hide until loaded */
                }
                .masonry-item img.loaded {
                    opacity: 1; /* Fade in when loaded */
                }
                ` }), _jsxs("div", { className: "container", children: [_jsxs("div", { className: "section-heading text-center", children: [_jsxs("h6", { children: [title, " Photos"] }), _jsxs("h4", { children: ["Quick look at some of my ", _jsx("em", { children: "Wedding Shoots" })] })] }), _jsx("div", { className: "masonry-gallery", children: sessions.map((session) => (session.mediaFiles.map((image, index) => (_jsx(Link, { to: GALLERY + '/' + session.category + '/' + session.name, children: _jsx("div", { className: "masonry-item", children: _jsx("img", { "data-src": image, src: image, alt: "Gallery Image", className: "img-fluid lazyload", onLoad: (e) => e.currentTarget.classList.add("loaded") }) }) }, index))))) })] })] }));
};
export default Masonry;
