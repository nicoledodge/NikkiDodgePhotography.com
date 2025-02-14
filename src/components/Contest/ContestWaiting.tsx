import React from "react";

interface ContestItem {
    id: number;
    image: string;
    title: string;
    description: string;
    price: string;
    deadline: string;
}

const contests: ContestItem[] = [
    {
        id: 1,
        image: "assets/images/waiting-01.jpg",
        title: "Best Mountain Picture Award",
        description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
        price: "$900",
        deadline: "3 Days",
    },
    {
        id: 2,
        image: "assets/images/waiting-02.jpg",
        title: "Nature Walk in the Forest",
        description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
        price: "$1,400",
        deadline: "2 Days",
    },
    {
        id: 3,
        image: "assets/images/waiting-03.jpg",
        title: "The Road to Photograph",
        description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
        price: "$1,250",
        deadline: "4 Days",
    },
    {
        id: 4,
        image: "assets/images/waiting-04.jpg",
        title: "The Lake and Mountain Scenery",
        description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
        price: "$1,600",
        deadline: "10 Days",
    },
];

const ContestWaiting: React.FC = () => {
    return (
        <section className="contest-waiting">
            <div className="container">
                <div className="row">
                    <div className="col-lg-12">
                        <h5>Other Contests Waiting For You:</h5>
                    </div>

                    {contests.map((contest) => (
                        <div key={contest.id} className="col-lg-3 col-sm-6">
                            <div className="waiting-item">
                                <img src={contest.image} alt={contest.title} />
                                <div className="down-content">
                                    <h4>{contest.title}</h4>
                                    <p>{contest.description}</p>
                                    <span className="price">Price: <em>{contest.price}</em></span>
                                    <span className="deadline">Deadline: <em>{contest.deadline}</em></span>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Pagination */}
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

export default ContestWaiting;
