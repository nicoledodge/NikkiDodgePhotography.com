import React from "react";

const Info: React.FC = () => {
    return (
        <div className="user-info">
            <div className="container">
                <div className="row">
                    <div className="col-lg-12">
                        <div className="avatar">
                            <img src="assets/images/profilePhoto.jpg" alt="User Avatar" />
                            <h4>Nikki Dodge</h4>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Info;
