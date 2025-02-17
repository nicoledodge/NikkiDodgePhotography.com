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

const ContestDetails: React.FC<ContestDetailsProps> = ({
                                                           award,
                                                           timeLeft,
                                                           participants,
                                                           submissions,
                                                           description,
                                                           allowedUses,
                                                           notAllowedUses,
                                                           resources,
                                                       }) => {
    return (
        <div className="contest-details">
            <div className="container">
                <div className="row">
                    {/* Contest Info Section */}
                    <div className="col-lg-12">
                        <div className="top-content">
                            <div className="row">
                                <div className="col-lg-4">
                                    <span className="open">Open Contest</span>
                                    <span className="wish-list"><i className="fa fa-heart"></i> Add To Your Favorites</span>
                                </div>
                                <div className="col-lg-8">
                                    <ul>
                                        <li><i className="fa fa-medal"></i> <span>Award:</span> {award}</li>
                                        <li><span>Time left:</span> {timeLeft}</li>
                                        <li><span>Participants:</span> {participants}</li>
                                        <li><span>Submissions:</span> {submissions}</li>
                                        <li><span>Description:</span> {description}</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="col-lg-12">
                        <div className="main-content seventh-background-color">
                            <h4>Requirements Of The Contest</h4>
                            <h6>Picture Should Have</h6>
                            {allowedUses.map((text, index) => (
                                <p key={index}>{text}</p>
                            ))}

                            <h6 className="second-title">Picture Should Not Have</h6>
                            {notAllowedUses.map((text, index) => (
                                <p key={index}>{text}</p>
                            ))}

                            <h4 className="second-title">Links To Inspire Your Photo</h4>
                            <div className="row">
                                {resources.map((resource, index) => (
                                    <div key={index} className="col-lg-3 col-6">
                                        <div className="item">
                                            <span>{resource.type}</span>
                                            <h5>{resource.title}<br /><h6>{resource.winner}</h6></h5>
                                        </div>
                                    </div>
                                ))}
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
