import React from "react";
import {Link} from "react-router-dom";
import {CONTACT} from "../../pages/Contact";

const Heading: React.FC = () => {
    return (
        <div className="page-heading">
            <div className="container">
                <div className="row">
                    <div id="heading-box" className="col-lg-8 offset-lg-2 header-text mt-5">
                        <h2>Invest in <em>Timeless Memories</em></h2>
                        <p>
                            These collections are built to make the booking decision easier, not more confusing.
                            Wedding coverage starts with clear essentials and scales up for clients who want more time,
                            more portraits, or both. Families, graduates, headshots, and brand sessions can be quoted
                            separately based on scope.
                        </p>
                        <div className="main-button mt-5">
                            <Link to={CONTACT}>Let’s Chat About Your Day</Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Heading;
