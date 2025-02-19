import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import WeddingTitleAndTimer from "../components/Galery/ContestHeading";
import OtherPhotosInCategory from "../components/Galery/OtherPhotosInCategory";
import Masonry, { getSession } from "../components/Galery/Masonry";
import mediaLibrary from "../components/MediaLibrary/MediaLibrary";
import { useParams } from "react-router-dom";
export const GALLERY = '/gallery';
const Gallery = () => {
    const { categoryName, sessionName } = useParams();
    if (!categoryName || !sessionName) {
        return _jsx("p", { children: "No photo session found." });
    }
    if (!Object.keys(mediaLibrary).includes(categoryName)) {
        return _jsx("p", { children: "Invalid category." });
    }
    // Explicitly cast category to match the valid keys in mediaLibrary
    const category = mediaLibrary[categoryName]; // Safe type assertion
    if (!category) {
        return _jsx("p", { children: "Invalid category." });
    }
    const session = category.sessions.find(s => s.name === sessionName);
    const mediaFiles = getSession({
        categoryName: categoryName,
        sessionName: sessionName
    });
    return _jsxs(_Fragment, { children: [_jsx(WeddingTitleAndTimer, { title: session?.name, deadline: "2025-03-20 23:59:59" }), _jsx(Masonry, { sessions: [mediaFiles] }), _jsx(OtherPhotosInCategory, { mediaFiles: category.sessions.flatMap(s => s.mediaFiles) })] });
};
export default Gallery;
