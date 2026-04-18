import React from "react";

const Info: React.FC = () => {
    return (
        <div className="user-info mt-3">
            <div className="container">
                <div className="row">
                    {[
                        { title: <>Planning<br/>Support</>, value: "01", subtitle: "Location ideas, timelines, and prep guidance" },
                        { title: <>Natural<br/>Direction</>, value: "02", subtitle: "Prompts that keep portraits from feeling forced" },
                        { title: <>Fast<br/>Communication</>, value: "03", subtitle: "Clear answers before and after the session" },
                        { title: <>True-To-Life<br/>Editing</>, value: "04", subtitle: "Warm skin tones and clean, timeless color" },
                        { title: <>Online<br/>Delivery</>, value: "05", subtitle: "Simple galleries built for sharing and printing" },
                        { title: <>Colorado<br/>Coverage</>, value: "06", subtitle: "Local sessions and destination travel across the state" },
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
