import React, {useEffect, useRef} from "react";
import mediaLibrary from "../MediaLibrary/MediaLibrary";
import {Category, SpecificSession} from "../MediaLibrary/MediaTypes";
import {Link} from "react-router-dom";
import {GALLERY} from "../../pages/Gallery";


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
        featuredHorizontal: sessionPath + "/" + categoryData.featuredHorizontal
    };
}

const defaultCategoryOrder = ["Music", "Sports", "Graduations", "Lifestyles", "Family", "Engagements", "Weddings", "Representatives"];

const defaultMedia: SpecificSession[] = Object.values(mediaLibrary)
    .filter((category) => defaultCategoryOrder.includes(category.category))
    .sort((left, right) => defaultCategoryOrder.indexOf(left.category) - defaultCategoryOrder.indexOf(right.category))
    .flatMap((category) => category.sessions
        .filter((session) => session.featuredHorizontal && session.featuredVertical)
        .slice(0, 2)
        .map((session) => {
            const sessionPath = `${category.path}/${session.name}`;
            return {
                ...category,
                ...session,
                mediaFiles: session.mediaFiles
                    .filter((image) => [session.featuredHorizontal, session.featuredVertical].includes(image))
                    .map((image) => `${sessionPath}/${image}`),
                featuredHorizontal: `${sessionPath}/${session.featuredHorizontal}`,
                featuredVertical: `${sessionPath}/${session.featuredVertical}`,
            };
        }));

const Masonry: React.FC<{
    sessions?: SpecificSession[];
    title?: string;
}> = ({sessions = defaultMedia, title = "Featured Galleries"}) => {

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
        <section className="featured-gallery">
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
                @media (max-width: 767px) {
                    .masonry-gallery {
                        column-count: 2;
                        column-gap: 12px;
                    }
                    .masonry-item {
                        margin-bottom: 12px;
                    }
                }
                `}
            </style>
            <div className="container">
                <div className="section-heading text-center">
                    <p className="section-eyebrow">{title}</p>
                    <h2>
                        Images that show the pace, people, and in-between moments that make a gallery feel <em>alive</em>
                    </h2>
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
                                        alt={`${session.name} gallery image`}
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
