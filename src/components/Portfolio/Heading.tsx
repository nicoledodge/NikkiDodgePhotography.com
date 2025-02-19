import React from "react";

const Heading: React.FC = () => {
    return (
        <div className="page-heading mb-5">
            <div className="container">
                <div className="row">
                    <div id="heading-box" className="col-lg-8 offset-lg-2 header-text mt-5">
                        <h2>
                            Timeless <em>Love Stories</em>, <em>Captured Beautifully</em>
                        </h2>
                        <p className="seventh-color">
                            Every love story is unique, and every moment deserves to be remembered.
                            Through my lens, I capture the raw emotion, intimate details, and joyful
                            celebrations that make your day unforgettable. Whether it's a dreamy mountaintop elopement,
                            a lively wedding celebration, or a heartfelt portrait session, my goal is to create images
                            that transport you back to the moment every time you see them.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Heading;
