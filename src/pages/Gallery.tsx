import GalleryHeading from "../components/Galery/GalleryHeading";
import OtherPhotosInCategory from "../components/Galery/OtherPhotosInCategory";
import Masonry, {getSession} from "../components/Galery/Masonry";
import React from "react";
import mediaLibrary from "../components/MediaLibrary/MediaLibrary";
import {useParams} from "react-router-dom";
import {Categories} from "../components/MediaLibrary/MediaTypes";
import {getCategoryCopy} from "../data/categoryCopy";


export const GALLERY = '/gallery'

const Gallery: React.FC = () => {

    const { categoryName, sessionName } = useParams();

    if (!categoryName || !sessionName) {
        return <p>No photo session found.</p>;
    }

    if (!Object.keys(mediaLibrary).includes(categoryName)) {
        return <p>Invalid category.</p>;
    }

    // Explicitly cast category to match the valid keys in mediaLibrary
    const category = mediaLibrary[categoryName as Categories]; // Safe type assertion

    if (!category) {
        return <p>Invalid category.</p>;
    }

    const session = category.sessions.find(s => s.name === sessionName);
    if (!session) {
        return <p>No photo session found.</p>;
    }
    const formattedSessionName = sessionName.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/&/g, " & ");

    const mediaFiles = getSession({
        categoryName: categoryName as Categories,
        sessionName: sessionName
    });

    const relatedSessions = category.sessions
        .filter((item) => item.name !== sessionName && item.featuredHorizontal && item.featuredVertical)
        .slice(0, 4)
        .map((item) => ({
            category: category.category,
            image: `${category.path}/${item.name}/${item.featuredHorizontal}`,
            lead: getCategoryCopy(category.category).lead,
            name: item.name,
            photoCount: item.mediaFiles.length
        }));

    return <>
        <GalleryHeading
            title={formattedSessionName}
            category={category.category}
            summary={getCategoryCopy(category.category).lead}
            imageCount={session.mediaFiles.length}
            relatedCount={relatedSessions.length}
        />
        <Masonry sessions={[mediaFiles]} title={formattedSessionName}/>
        <OtherPhotosInCategory categoryName={category.category} sessions={relatedSessions}/>
    </>
};

export default Gallery;
