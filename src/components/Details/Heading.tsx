import React from "react";
import {Link} from "react-router-dom";
import {CONTACT} from "../../pages/Contact.tsx";

const Heading: React.FC = () => {
    return (
        <div className="page-heading">
            <div className="container">
                <div className="row">
                    <div id="heading-box" className="col-lg-8 offset-lg-2 header-text mt-5">
                        <h2>Invest in <em>Timeless Memories</em></h2>
                        <p>
                            Your wedding day is more than just a moment—it's a story waiting to be told.
                            From the intimate details to the grand celebrations, I’m here to capture it all
                            with artistry and heart. Choosing the right photographer isn’t just about price; it’s about
                            finding someone
                            who sees your love the way you do.
                            Let’s create something unforgettable together.
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
