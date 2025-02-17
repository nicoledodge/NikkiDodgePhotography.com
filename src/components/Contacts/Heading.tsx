import React from "react";

const Heading: React.FC = () => {
    return (
        <div className="page-heading">
            <div className="container">
                <div className="row">
                    <div id="heading-box" className="col-lg-8 offset-lg-2 header-text mt-5">
                        <h2>Explore Stunning <em>Wedding & Lifestyle Photography</em></h2>
                        <p>
                            Capturing timeless moments with elegance and artistry. From intimate weddings to cherished
                            family portraits, every photograph tells a unique story.
                            Let’s create something beautiful together.
                            <a
                                href="https://nikkidodgephotography.com/contact"
                                target="_blank"
                                rel="noopener noreferrer"
                            > Contact Nikki Dodge Photography </a> to book your session today.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Heading;
