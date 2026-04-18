import React from "react";

const Heading: React.FC = () => {
    return (
        <div className="page-heading">
            <div className="container">
                <div className="row">
                    <div id="heading-box" className="col-lg-8 offset-lg-2 header-text mt-5">
                        <h2>Reach out about your <em>session, wedding, or project</em></h2>
                        <p>
                            Use this page to start the conversation. Share what you are planning, when you need it,
                            and what kind of images matter most. Nikki will follow up with next steps, availability,
                            and the best fit for your timeline.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Heading;
