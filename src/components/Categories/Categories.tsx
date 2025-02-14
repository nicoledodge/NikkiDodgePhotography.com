import React from "react";

const categories = [
    { imgSrc: "assets/images/icon-01.png", title: "Nature Picture", contests: 128 },
    { imgSrc: "assets/images/icon-02.png", title: "Space Contest", contests: 224 },
    { imgSrc: "assets/images/icon-03.png", title: "Portrait Picture", contests: 145 },
    { imgSrc: "assets/images/icon-04.png", title: "Nature Picture", contests: 268 },
    { imgSrc: "assets/images/icon-01.png", title: "Space Picture", contests: 310 },
];

const Categories: React.FC = () => {
    return (
        <div className="top-categories">
            <div className="container">
                <div className="row">
                    {categories.map((category, index) => (
                        <div className="col-lg col-sm-4" key={index}>
                            <div className="item">
                                <div className="icon">
                                    <img src={category.imgSrc} alt={category.title} />
                                </div>
                                <h4>{category.title}</h4>
                                <span>Available Contests</span>
                                <span className="counter">{category.contests}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Categories;
