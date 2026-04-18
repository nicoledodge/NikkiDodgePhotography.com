import {useEffect, useState} from "react";
import mediaLibrary from "../MediaLibrary/MediaLibrary";
import {Link} from "react-router-dom";
import {GALLERY} from "../../pages/Gallery";
import type {Search} from "./SearchForm.types";
import {normalize} from "../../functions/normalize";
import {getCategoryCopy} from "../../data/categoryCopy";

const itemsPerPage = 4; // Change this to control sessions per page

export const Sessions = Object.values(mediaLibrary)
    .flatMap((category) => {
        if (category.name === "Videos") return []
        return category.sessions
            .filter((session) =>
                session.name !== "Videos" &&
                session.featuredHorizontal !== "" &&
                session.featuredVertical !== ""
            )
            .map((session) => ({
                ...category,
                ...session,
                mediaFiles: session.mediaFiles.map(
                    (mediaFile) => category.path + "/" + session.name + "/" + mediaFile
                ),
            }));
    });

const SessionExplorer = (
    {
        categorySearch,
        sessionSearch
    } : Search
) => {

    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        setCurrentPage(1);
    }, [categorySearch, sessionSearch]);

    const filteredSessions = Sessions.filter((session) => {
        const matchesCategory = categorySearch === '' || categorySearch === session.category;
        const matchesSearch = sessionSearch === ''
            || normalize(session.name).includes(normalize(sessionSearch))
            || normalize(session.category).includes(normalize(sessionSearch));

        return matchesCategory && matchesSearch;
    });

    const totalPages = Math.ceil(filteredSessions.length / itemsPerPage);

    // Get paginated sessions
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentSessions = filteredSessions.slice(startIndex, startIndex + itemsPerPage);

    return (
        <section className="contest-waiting">
            <div className="container">
                <div className="row">
                    <div className="col-lg-12">
                        <h5>Recent Sessions</h5>
                    </div>

                    {currentSessions.length === 0 && (
                        <div className="col-lg-12">
                            <p>No matching galleries yet. Try a broader category or search term.</p>
                        </div>
                    )}

                    {currentSessions
                        .map((session, key) => {
                                const sessionNameFormatted = session.name.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/&/g, " & ");
                                let columnSize, imagePath = session.featuredHorizontal, smallColumnSize = 'col-sm-6';

                                if (currentSessions.length === 1) {
                                    imagePath = session.featuredVertical;
                                    columnSize = "12";
                                    smallColumnSize = '';
                                } else if (currentSessions.length === 2) {
                                    columnSize = "6";
                                } else if (currentSessions.length === 3) {
                                    columnSize = "4";
                                } else {
                                    columnSize = "3";
                                }


                                return <div key={key} className={`col-lg-${columnSize} ${smallColumnSize}`}>
                                    <Link to={
                                        GALLERY + '/' + session.category + '/' + session.name
                                    }>
                                        <div className="waiting-item">
                                            <img src={session.path + '/' + session.name + '/' + imagePath}
                                                 alt={sessionNameFormatted} style={{
                                                overflow: "hidden",
                                                objectFit: "cover", // Prevents distortion while covering the box
                                            }}/>
                                            <div className="down-content">
                                                <h4>{sessionNameFormatted}</h4>
                                                <p>{getCategoryCopy(session.category).description}</p>
                                                <span className="price">Category: <em>{session.category}</em></span>
                                                <span className="deadline">Images: <em>{session.mediaFiles.length}</em></span>
                                            </div>
                                        </div>
                                    </Link>
                                </div>
                            }
                        )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="col-lg-12">
                            <ul className="pagination">
                                <li className={currentPage === 1 ? "disabled" : ""}>
                                    <a href="#" onClick={(e) => {
                                        e.preventDefault();
                                        setCurrentPage(prev => Math.max(prev - 1, 1));
                                    }}>
                                        <i className="fa fa-arrow-left"></i>
                                    </a>
                                </li>
                                {Array.from({length: totalPages}, (_, i) => (
                                    <li key={i} className={currentPage === i + 1 ? "active" : ""}>
                                        <a href="#" onClick={(e) => {
                                            e.preventDefault();
                                            setCurrentPage(i + 1);
                                        }}>{i + 1}</a>
                                    </li>
                                ))}
                                <li className={currentPage === totalPages ? "disabled" : ""}>
                                    <a href="#" onClick={(e) => {
                                        e.preventDefault();
                                        setCurrentPage(prev => Math.min(prev + 1, totalPages));
                                    }}>
                                        <i className="fa fa-arrow-right"></i>
                                    </a>
                                </li>
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};

export default SessionExplorer;
