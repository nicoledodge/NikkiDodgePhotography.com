import React from "react";

const Heading: React.FC = () => {
    return (
        <div className="page-heading">
            <div className="container">
                <div className="row">
                    <div id="heading-box" className="col-lg-8 offset-lg-2 header-text mt-5">
                        <h2>
                            Planning notes, recent work, and useful answers for <em>future clients</em>
                        </h2>
                        <p>
                            The blog should pull its weight. Every post here is meant to help couples, families,
                            graduates, and small businesses feel more prepared before they ever send the first email.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Heading;
