import React from "react";

interface ContestDetailsProps {
    award: string;
    timeLeft: string;
    participants: number;
    submissions: number;
    description: string[];
    allowedUses: string[];
    notAllowedUses: string[];
    resources: ResourceItem[];
}

interface ResourceItem {
    type: string;
    title: string;
    winner: string;
}

const ContestDetails: React.FC<ContestDetailsProps> = () => {
    return (
        <div className="contest-details">
            <div className="container">
                <div className="row">
                    {/* Contest Info Section */}
                    <div className="col-lg-12">
                        <div className="top-content" style={{
                            display: "flex",
                            justifyContent: "center", /* Centers horizontally */
                            alignItems: "center", /* Centers vertically if needed */
                            flexWrap: "wrap", /* Ensures wrapping on smaller screens */
                            textAlign: "center",
                            gap: "10px" /* Adds spacing between items */
                        }}>
                            <div className="row">
                                <div className="col-lg-12 d-flex justify-content-center flex-wrap">
                                    <span className="open mx-2">📸 Featured Photos</span>
                                    <span className="open mx-2">📝 Blog Posts</span>
                                    <span className="open mx-2">🌍 Travel Stories</span>
                                    <span className="open mx-2">🎓 Photography Tips</span>
                                    <span className="open mx-2">🏆 Contest Info</span>
                                    <span className="open mx-2">📅 Upcoming Events</span>
                                    <span className="open mx-2">📩 Contact Me</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="col-lg-12">
                        <div className="main-content seventh-background-color mb-5">
                            <h4>My life</h4>
                            <h6>Picture Should Have</h6>
                                <p key={1}>yooo</p>

                            <h6 className="second-title">Picture Should Not Have</h6>
                                <p key={1}>Sample text here to give some idea of what this looks like..</p>

                            <h4 className="second-title">Links To Inspire Your Photo</h4>
                            <div className="row">
                                <div key={1} className="col-lg-3 col-6">
                                    <div className="item">
                                        <span>hi</span>
                                        <h5>I travel<br/>
                                            <h6>We hope this template is very useful for your website development.</h6>
                                        </h5>
                                    </div>
                                </div>
                                <div key={1} className="col-lg-3 col-6">
                                    <div className="item">
                                        <span>hi</span>
                                        <h5>I travel<br/>
                                            <h6>We hope this template is very useful for your website development.</h6>
                                        </h5>
                                    </div>
                                </div>
                                <div key={1} className="col-lg-3 col-6">
                                    <div className="item">
                                        <span>hi</span>
                                        <h5>I travel<br/>
                                            <h6>We hope this template is very useful for your website development.</h6>
                                        </h5>
                                    </div>
                                </div>
                                <div key={1} className="col-lg-3 col-6">
                                    <div className="item">
                                        <span>hi</span>
                                        <h5>I travel<br/>
                                            <h6>We hope this template is very useful for your website development.</h6>
                                        </h5>
                                    </div>
                                </div>
                            </div>

                            {/* Submission Button */}
                            <div className="main-button">
                                <a href="#">Submit Your Photo/Video</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Example Usage
const contestData: ContestDetailsProps = {
    award: "$2,400",
    timeLeft: "7 Days",
    participants: 118,
    submissions: 280,
    description: [
        "SnapX Photography is a professional website template with 5 different HTML pages for maximum customizations.",
        "This is based on Bootstrap v5.1.3 CSS framework.",
    ],
    allowedUses: [
        "You are allowed to 100% freely use this SnapX Template for your commercial websites.",
        "You are not allowed to redistribute the template ZIP file on any other Free CSS Template collection websites.",
    ],
    notAllowedUses: [
        "We hope this template is very useful for your website development.",
        "If you need the PSD source files of this template, please feel free to contact TemplateMo.",
    ],
    resources: [
        { type: "JPG", title: "A Trip In The Rain", winner: "Previous Winner" },
        { type: "PNG", title: "A Trip In The Jungle", winner: "Previous Winner" },
        { type: "PDF", title: "A Trip In The Mountain", winner: "Previous Winner" },
        { type: "AI", title: "A Trip In The Forest", winner: "Previous Winner" },
    ],
};

export default function ContestDetailsMock() {
    return <ContestDetails {...contestData} />;
}
