import React from "react";

const Heading: React.FC = () => {
    return (
        <div className="page-heading">
            <div className="container mb-5">
                <div className="row">
                    <div id="heading-box" className="col-lg-8 offset-lg-2 header-text mt-5">
                        <h2>
                            Hey, I'm <em>Nikki Dodge</em> – Your Wedding & Lifestyle <em style={{
                            color: "var(--seventh-color)",
                        }}>Photographer</em>
                        </h2>
                        <p>
                            I’m a <b>natural light photographer</b> specializing in <b>weddings, couples, and
                            portraits</b>.
                            My passion is capturing authentic, timeless moments that tell a beautiful love story.
                            Based in Denver, Colorado, but always ready to travel wherever your adventure takes us.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Heading;
