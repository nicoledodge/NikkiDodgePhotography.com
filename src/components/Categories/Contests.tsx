import React from "react";

const contests = [
    {
        imgSrc: "assets/images/featured-image-02.jpg",
        price: "$1,600",
        participants: 60,
        submissions: 188,
    },
    {
        imgSrc: "assets/images/featured-image-01.jpg",
        price: "$3,200",
        participants: 78,
        submissions: 240,
    },
    {
        imgSrc: "assets/images/featured-image-03.jpg",
        price: "$4,100",
        participants: 112,
        submissions: 286,
    },
    {
        imgSrc: "assets/images/featured-image-04.jpg",
        price: "$3,400",
        participants: 54,
        submissions: 140,
    },
    {
        imgSrc: "assets/images/featured-image-05.jpg",
        price: "$2,200",
        participants: 68,
        submissions: 162,
    },
];

const Contests: React.FC = () => {
    return (
        <section className="featured-contests">
            <div className="container">
                <div className="row">
                    <div className="col-lg-12">
                        <div className="section-heading text-center">
                            <h6>Featured Contests</h6>
                            <h4>
                                View Most <em>Popular</em> Category <em>Contests</em>
                            </h4>
                        </div>
                    </div>
                    {contests.map((contest, index) => (
                        <div className={`col-lg-${index < 2 ? 6 : 4}`} key={index}>
                            <div className="item">
                                <div className="thumb">
                                    <img src={contest.imgSrc} alt="Contest Image" />
                                    <div className="hover-effect">
                                        <div className="content">
                                            <div className="top-content">
                                                <span className="award">Award Price</span>
                                                <span className="price">{contest.price}</span>
                                            </div>
                                            <h4>Walk In The Nature Night</h4>
                                            <div className="info">
                        <span className="participants">
                          <img src="assets/images/icon-03.png" alt="Participants" />
                          <br />
                            {contest.participants}
                            <br />
                          Participants
                        </span>
                                                <span className="submittions">
                          <img src="assets/images/icon-01.png" alt="Submissions" />
                          <br />
                                                    {contest.submissions}
                                                    <br />
                          Submissions
                        </span>
                                            </div>
                                            <div className="border-button">
                                                <a href="contest-details.html">Browse Nature Contests</a>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Contests;
