import React, {useEffect, useRef} from "react";
import mediaLibrary from "../MediaLibrary/MediaLibrary.tsx";
import {Category, SpecificSession} from "../MediaLibrary/MediaTypes.tsx";
import {Link} from "react-router-dom";
import {GALLERY} from "../../pages/Gallery.tsx";


export const getSession = ({categoryName, sessionName}: {
    categoryName: keyof typeof mediaLibrary;
    sessionName: string;
}): SpecificSession => {
    const categoryData: Category = mediaLibrary[categoryName]!;
    const session = categoryData.sessions!.find(s => s.name === sessionName)!;
    const sessionPath = categoryData.path + "/" + session.name;
    return {
        ...categoryData,
        ...session,
        mediaFiles: session.mediaFiles.map((image) => sessionPath + "/" + image),
        featuredVertical: sessionPath + "/" + categoryData.featuredVertical,
        featuredHorizontal: sessionPath + categoryData.featuredHorizontal
    };
}

const defaultMedia: SpecificSession[] = mediaLibrary.Weddings.sessions.flatMap(s => ({
    ...mediaLibrary.Weddings,
    ...s,
    mediaFiles: s.mediaFiles
        .filter(image =>
            [
                s.featuredHorizontal,
                s.featuredVertical
            ].includes(image))
        .map((image) => {
            return mediaLibrary.Weddings.path + '/' + s.name + '/' + image
        }),
    featuredHorizontal: mediaLibrary.Weddings.path + '/' + s.name + '/' + s.featuredHorizontal,
    featuredVertical: mediaLibrary.Weddings.path + '/' + s.name + '/' + s.featuredVertical
}));

const Masonry: React.FC<{
    sessions?: SpecificSession[];
    title?: string;
}> = ({sessions = defaultMedia, title = "Featured"}) => {

    const imagesRef = useRef<NodeListOf<HTMLImageElement> | null>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target as HTMLImageElement;
                        if (img.dataset.src) {
                            img.src = img.dataset.src;
                            img.removeAttribute("data-src"); // Remove dataset to avoid re-triggering
                        }
                        observer.unobserve(img); // Stop observing once loaded
                    }
                });
            },
            {rootMargin: "300px", threshold: 0.1} // Load images earlier and avoid rapid toggling
        );

        imagesRef.current = document.querySelectorAll(".lazyload");
        imagesRef.current.forEach(img => observer.observe(img));

        return () => observer.disconnect(); // Cleanup observer
    }, []);

    return (
        <section className="featured-contests">
            <style>
                {`
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
                `}
            </style>
            <div className="container">
                <div className="section-heading text-center">
                    <h6>{title} Photos</h6>
                    <h4>
                        Quick look at some of my <em>Wedding Shoots</em>
                    </h4>
                </div>
                {/* Masonry Grid Container */}
                <div className="masonry-gallery">
                    {sessions.map((session) => (
                        session.mediaFiles.map((image, index) => (
                            <Link key={index} to={GALLERY + '/' + session.category + '/' + session.name}>
                                <div className="masonry-item">
                                    <img
                                        data-src={image}
                                        src={image}
                                        alt="Gallery Image"
                                        className="img-fluid lazyload"
                                        onLoad={(e) => e.currentTarget.classList.add("loaded")} // Add fade-in effect
                                    />
                                </div>
                            </Link>
                        ))
                    ))}
                </div>

            </div>
        </section>
    );
};

export default Masonry;