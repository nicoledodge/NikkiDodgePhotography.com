import React from "react";

interface ContestItem {
    id: number;
    image: string;
    title: string;
    award: string;
    price: string;
    participants: number;
    submissions: number;
}

const contests: ContestItem[] = [
    {
        id: 1,
        image: "assets/images/contest-01.jpg",
        title: "Graduation",
        award: "Award Price",
        price: "$1,200",
        participants: 80,
        submissions: 260,
    },
    {
        id: 2,
        image: "assets/images/contest-02.jpg",
        title: "Walk In The Nature Night",
        award: "Award Price",
        price: "$2,400",
        participants: 60,
        submissions: 212,
    },
    {
        id: 3,
        image: "assets/images/contest-03.jpg",
        title: "Walk In The Nature Night",
        award: "Award Price",
        price: "$3,600",
        participants: 55,
        submissions: 150,
    },
    {
        id: 4,
        image: "assets/images/contest-04.jpg",
        title: "Walk In The Nature Night",
        award: "Award Price",
        price: "$4,800",
        participants: 40,
        submissions: 120,
    },
];

const ContestWin: React.FC = () => {
    return (
        <section className="contest-win mb-5">
            <div className="container-fluid">
                <div className="row">
                    <div className="col-lg-12">
                        <div className="section-heading text-center">
                            <h6>Recently Added Contests by Users</h6>
                            <h4>Current <em>Contests</em> to Enter Now &amp; <em>Win</em></h4>
                        </div>
                    </div>

                    {contests.map((contest) => (
                        <div key={contest.id} className="col-lg-3">
                            <div className="contest-item">
                                <div className="top-content">
                                    <span className="award">{contest.award}</span>
                                    <span className="price">{contest.price}</span>
                                </div>
                                <img src={contest.image} alt={contest.title}/>
                                <h4>{contest.title}</h4>
                                <div className="info">
                                  <span className="participants">
                                    <img src="/assets/images/icon-03.png" alt="Participants"/>
                                    <br/> {contest.participants} Participants
                                  </span>
                                    <span className="submittions">
                                    <img src="/assets/images/icon-01.png" alt="Submissions"/>
                                    <br/> {contest.submissions} Submissions
                                  </span>
                                </div>
                                <div className="border-button">
                                    <a href="contest-details.html">Browse Nature Pic Contests</a>
                                </div>
                                <span className="info">* Client will pay via Online Payments</span>
                            </div>
                        </div>
                    ))}

                    {/* Pagination Section */}
                    <div className="col-lg-12">
                        <ul className="pagination">
                            <li><a href="#"><i className="fa fa-arrow-left"></i></a></li>
                            <li><a href="#">1</a></li>
                            <li className="active"><a href="#">2</a></li>
                            <li><a href="#">3</a></li>
                            <li><a href="#"><i className="fa fa-arrow-right"></i></a></li>
                        </ul>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ContestWin;
