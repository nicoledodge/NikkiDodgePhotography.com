import React from "react";

const Heading: React.FC = () => {
    return (
        <div className="page-heading">
            <div className="container">
                <div className="row">
                    <div id="heading-box" className="col-lg-8 offset-lg-2 header-text mt-5">
                        <h2>
                            <em>Welcome</em> to the Nikki Dodge Photography <em>Blog</em>
                        </h2>
                        <p>
                            Capturing <em>timeless love stories</em>, unforgettable moments, and the beauty of human
                            connection. Here, you'll find wedding inspiration, behind-the-scenes stories, and
                            photography tips straight from my lens. Whether you're a bride-to-be, a photography
                            enthusiast, or just love beautiful images, I invite you to explore and get inspired!
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Heading;
