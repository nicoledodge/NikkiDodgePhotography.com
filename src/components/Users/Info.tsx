import React from "react";

const Info: React.FC = () => {
    return (
        <div className="user-info">
            <div className="container">
                <div className="row">
                    <div className="col-lg-12">
                        <div className="avatar">
                            <img src="assets/images/user-avatar.jpg" alt="User Avatar" />
                            <h4>#007772 John Walker</h4>
                        </div>
                    </div>

                    {[
                        { title: "Rank", value: "#121", subtitle: "of 1680" },
                        { title: "Ratings", value: "4.56", subtitle: "of 5.00 Stars" },
                        { title: "Top Rated", value: "Nature", subtitle: "Picture Category" },
                        { title: "Profile Views", value: "8,250", subtitle: "Monthly" },
                        { title: "Contests Won", value: "90", subtitle: "of 12,400" },
                        { title: "Total Earned", value: "$68,000", subtitle: "All Time" },
                    ].map((item, index) => (
                        <div className="col-lg-2 col-sm-6" key={index}>
                            <div className="info">
                                <h6>{item.title}</h6>
                                <h4>{item.value}</h4>
                                <span>{item.subtitle}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Info;
