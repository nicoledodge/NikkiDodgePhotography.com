import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import mediaLibrary from "../MediaLibrary/MediaLibrary";
import { Link } from "react-router-dom";
import { GALLERY } from "../../pages/Gallery";
import { normalize } from "../../functions/normalize";
const itemsPerPage = 4; // Change this to control sessions per page
export const Sessions = Object.values(mediaLibrary)
    .flatMap((category) => {
    if (category.name === "Videos")
        return [];
    return category.sessions
        .filter((session) => session.name !== "Videos" &&
        session.featuredHorizontal !== "" &&
        session.featuredVertical !== "")
        .map((session) => ({
        ...category,
        ...session,
        mediaFiles: session.mediaFiles.map((mediaFile) => category.path + "/" + session.name + "/" + mediaFile),
    }));
})
    .sort(() => Math.random() - 0.5);
const SessionExplorer = ({ categorySearch, sessionSearch }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const filteredSessions = Sessions.filter((session) => (categorySearch === ''
        && sessionSearch === '')
        || normalize(sessionSearch)
            .includes(normalize(session.name))
        || categorySearch === session.category);
    const totalPages = Math.ceil(filteredSessions.length / itemsPerPage);
    // Get paginated sessions
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentSessions = filteredSessions.slice(startIndex, startIndex + itemsPerPage);
    return (_jsx("section", { className: "contest-waiting", children: _jsx("div", { className: "container", children: _jsxs("div", { className: "row", children: [_jsx("div", { className: "col-lg-12", children: _jsx("h5", { children: "My Sessions:" }) }), currentSessions
                        .map((session, key) => {
                        const sessionNameFormatted = session.name.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/&/g, " & ");
                        let columnSize, imagePath = session.featuredHorizontal, smallColumnSize = 'col-sm-6';
                        if (currentSessions.length === 1) {
                            imagePath = session.featuredVertical;
                            columnSize = "12";
                            smallColumnSize = '';
                        }
                        else if (currentSessions.length === 2) {
                            columnSize = "6";
                        }
                        else if (currentSessions.length === 3) {
                            columnSize = "4";
                        }
                        else {
                            columnSize = "3";
                        }
                        return _jsx("div", { className: `col-lg-${columnSize} ${smallColumnSize}`, children: _jsx(Link, { to: GALLERY + '/' + session.category + '/' + session.name, children: _jsxs("div", { className: "waiting-item", children: [_jsx("img", { src: session.path + '/' + session.name + '/' + imagePath, alt: sessionNameFormatted, style: {
                                                overflow: "hidden",
                                                objectFit: "cover", // Prevents distortion while covering the box
                                            } }), _jsxs("div", { className: "down-content", children: [_jsx("h4", { children: sessionNameFormatted }), _jsx("p", { children: "contest.description" }), _jsxs("span", { className: "price", children: ["Price: ", _jsx("em", { children: "contest.price" })] }), _jsxs("span", { className: "deadline", children: ["Deadline: ", _jsx("em", { children: "contest.deadline" })] })] })] }) }) }, key);
                    }), _jsx("div", { className: "col-lg-12", children: _jsxs("ul", { className: "pagination", children: [_jsx("li", { className: currentPage === 1 ? "disabled" : "", children: _jsx("a", { href: "#", onClick: (e) => {
                                            e.preventDefault();
                                            setCurrentPage(prev => Math.max(prev - 1, 1));
                                        }, children: _jsx("i", { className: "fa fa-arrow-left" }) }) }), Array.from({ length: totalPages }, (_, i) => (_jsx("li", { className: currentPage === i + 1 ? "active" : "", children: _jsx("a", { href: "#", onClick: (e) => {
                                            e.preventDefault();
                                            setCurrentPage(i + 1);
                                        }, children: i + 1 }) }, i))), _jsx("li", { className: currentPage === totalPages ? "disabled" : "", children: _jsx("a", { href: "#", onClick: (e) => {
                                            e.preventDefault();
                                            setCurrentPage(prev => Math.min(prev + 1, totalPages));
                                        }, children: _jsx("i", { className: "fa fa-arrow-right" }) }) })] }) })] }) }) }));
};
export default SessionExplorer;
