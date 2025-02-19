import React from "react";

const Info: React.FC = () => {
    return (
        <div className="user-info mt-3">
            <div className="container">
                <div className="row">
                    {[
                        { title: <>Client<br/>Ratings</>, value: "4.9", subtitle: "of 5.00 Stars" },
                        { title: <>Portfolio<br/>Views</>, value: "12,500", subtitle: "Monthly" },
                        { title: <>Weddings<br/>Captured</>, value: "250+", subtitle: "Since 2015" },
                        { title: <>Graduation<br/>Sessions</>, value: "85", subtitle: "Booked Last Year" },
                        { title: <>Professional<br/>Headshots</>, value: "120", subtitle: "Clients Served" },
                        { title: <>Family<br/>Photoshoots</>, value: "150", subtitle: "Memories Captured" },
                    ].map((item, index) => (
                        <div className="col-lg-2 col-sm-6" key={index}>
                            <div className="info" style={{
                                height: "180px",
                            }}>
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
