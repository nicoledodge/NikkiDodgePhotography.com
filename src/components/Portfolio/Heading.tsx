import React from "react";

const Heading: React.FC = () => {
    return (
        <div className="page-heading mb-5">
            <div className="container">
                <div className="row">
                    <div id="heading-box" className="col-lg-8 offset-lg-2 header-text mt-5">
                        <h2>
                            Browse real <em>galleries</em>, not filler content
                        </h2>
                        <p className="seventh-color">
                            This portfolio should help a potential client answer two questions fast: does Nikki's work
                            feel like the way I want my story photographed, and can I picture myself in these images?
                            Search by session type, open a gallery, and move straight from inspiration to inquiry.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Heading;
