import React, {useState} from "react";
import mediaLibrary from "../MediaLibrary/MediaLibrary.tsx";
import {Link} from "react-router-dom";
import {GALLERY} from "../../pages/Gallery.tsx";
import {Search} from "./SearchForm.tsx";
import {normalize} from "../../functions/normalize.tsx";

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
    })
    .sort(() => Math.random() - 0.5);

const SessionExplorer: React.FC<Search> = (
    {
        categorySearch,
        sessionSearch
    }
) => {

    const [currentPage, setCurrentPage] = useState(1);

    const filteredSessions = Sessions.filter(
        (session) => (categorySearch === ''
            && sessionSearch === '')
            || normalize(sessionSearch)
                .includes(normalize(session.name))
            || categorySearch === session.category
    );




    const totalPages = Math.ceil(filteredSessions.length / itemsPerPage);

    // Get paginated sessions
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentSessions = filteredSessions.slice(startIndex, startIndex + itemsPerPage);

    return (
        <section className="contest-waiting">
            <div className="container">
                <div className="row">
                    <div className="col-lg-12">
                        <h5>My Sessions:</h5>
                    </div>

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
                                                <p>contest.description</p>
                                                <span className="price">Price: <em>contest.price</em></span>
                                                <span className="deadline">Deadline: <em>contest.deadline</em></span>
                                            </div>
                                        </div>
                                    </Link>
                                </div>
                            }
                        )}

                    {/* Pagination */}
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
                </div>
            </div>
        </section>
    );
};

export default SessionExplorer;
