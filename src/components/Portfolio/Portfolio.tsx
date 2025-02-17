import React from "react";

const Portfolio: React.FC = () => {
    const portfolioItems = [
        {
            imgSrc: "assets/images/portfolio-01.jpg",
            title: "Walk In the Beach",
            ranked: "2nd",
            award: "None",
        },
        {
            imgSrc: "assets/images/portfolio-02.jpg",
            title: "Walk In The Nature",
            ranked: "3rd",
            award: "EOS R3",
        },
        {
            imgSrc: "assets/images/portfolio-03.jpg",
            title: "Walk In The Forest",
            ranked: "4th",
            award: "EOS R7",
        },
        {
            imgSrc: "assets/images/portfolio-04.jpg",
            title: "Forest Nature",
            ranked: "2nd",
            award: "EOS R3",
        },
        {
            imgSrc: "assets/images/portfolio-05.jpg",
            title: "Fly thru the river",
            ranked: "1st",
            award: "EOS R1",
        },
        {
            imgSrc: "assets/images/portfolio-06.jpg",
            title: "Rocky Mountain",
            ranked: "2nd",
            award: "None",
        },
        {
            imgSrc: "assets/images/portfolio-07.jpg",
            title: "Rocky Mountain . Part 2",
            ranked: "2nd",
            award: "None",
        },
        {
            imgSrc: "assets/images/portfolio-08.jpg",
            title: "Blue Lake Nature",
            ranked: "4th",
            award: "None",
        },
        {
            imgSrc: "assets/images/portfolio-09.jpg",
            title: "Walk In The Forest",
            ranked: "3rd",
            award: "None",
        },
    ];

    return (
        <section className="portfolio">
            <div className="container">
                <div className="row">
                    {portfolioItems.map((item, index) => (
                        <div className="col-lg-4" key={index}>
                            <div className="thumb">
                                <img src={item.imgSrc} alt={item.title} />
                                <div className="hover-effect">
                                    <div className="content">
                                        <h4>{item.title}</h4>
                                        <span>
                      Ranked: <em>{item.ranked}</em>
                    </span>
                                        <span>
                      Award Won: <em>{item.award}</em>
                    </span>
                                        <ul>
                                            <li>
                                                <a href="#">
                                                    <i className="fa fa-heart"></i>
                                                </a>
                                            </li>
                                            <li>
                                                <a href="#">
                                                    <i className="fa fa-eye"></i>
                                                </a>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    <div className="col-lg-12">
                        <div className="main-button">
                            <a href="#">Load More Photos</a>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Portfolio;
