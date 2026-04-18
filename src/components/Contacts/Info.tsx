import React from "react";

const Info: React.FC = () => {
    return (
        <div className="user-info">
            <div className="container">
                <div className="row">
                    <div className="col-lg-12">
                        <div className="avatar">
                            <img src="assets/images/profilePhoto.jpg" alt="Portrait of Nikki Dodge" />
                            <h4>Nikki Dodge</h4>
                            <span>Wedding, portrait, and lifestyle photographer based in Highlands Ranch, Colorado.</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Info;
