import WeddingTitleAndTimer from "../components/Galery/ContestHeading.tsx";
import OtherPhotosInCategory from "../components/Galery/OtherPhotosInCategory.tsx";
import Masonry, {getSession} from "../components/Galery/Masonry.tsx";
import React from "react";
import mediaLibrary from "../components/MediaLibrary/MediaLibrary.tsx";
import {useParams} from "react-router-dom";
import {Categories} from "../components/MediaLibrary/MediaTypes.tsx";


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

    const mediaFiles = getSession({
        categoryName: categoryName as Categories,
        sessionName: sessionName
    })

    return <>
        <WeddingTitleAndTimer title={session?.name!} deadline={"2025-03-20 23:59:59"} />
        <Masonry sessions={[mediaFiles]}/>
        <OtherPhotosInCategory mediaFiles={category.sessions.flatMap(s => s.mediaFiles)}/>
    </>
};

export default Gallery;