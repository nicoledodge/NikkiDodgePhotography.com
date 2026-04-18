import React from "react";

const Heading: React.FC = () => {
    return (
        <div className="page-heading">
            <div className="container mb-5">
                <div className="row">
                    <div id="heading-box" className="col-lg-8 offset-lg-2 header-text mt-5">
                        <h2>
                            Meet <em>Nikki Dodge</em>, your Colorado wedding and portrait <em style={{
                            color: "var(--seventh-color)",
                        }}>Photographer</em>
                        </h2>
                        <p>
                            Nikki works with couples, families, graduates, and creative businesses who want images
                            that look polished without feeling stiff. The approach is equal parts preparation and
                            intuition: good light, steady communication, and enough direction to help people relax.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Heading;
