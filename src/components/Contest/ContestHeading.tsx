import React, { useState, useEffect } from "react";

interface ContestHeadingProps {
    title: string;
    deadline: string; // Format: "YYYY-MM-DD HH:MM:SS"
}

const ContestHeading: React.FC<ContestHeadingProps> = ({ title, deadline }) => {
    const calculateTimeLeft = () => {
        const difference = new Date(deadline).getTime() - new Date().getTime();
        if (difference > 0) {
            return {
                days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((difference / (1000 * 60)) % 60),
                seconds: Math.floor((difference / 1000) % 60),
            };
        }
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    };

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    return (
        <div className="page-heading">
            <div className="container">
                <div className="row">
                    <div className="col-lg-8 offset-lg-2 header-text">
                        <h2 className="space-need">{title} <em>Contest</em></h2>
                        <h6>Contest Deadline</h6>
                        <div className="main-content">
                            <div className="counter">
                                <div className="days">
                                    <div className="value">{timeLeft.days.toString().padStart(2, "0")}</div>
                                    <span>Days</span>
                                </div>
                                <div className="hours">
                                    <div className="value">{timeLeft.hours.toString().padStart(2, "0")}</div>
                                    <span>Hours</span>
                                </div>
                                <div className="minutes">
                                    <div className="value">{timeLeft.minutes.toString().padStart(2, "0")}</div>
                                    <span>Minutes</span>
                                </div>
                                <div className="seconds">
                                    <div className="value">{timeLeft.seconds.toString().padStart(2, "0")}</div>
                                    <span>Seconds</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Example Usage
export default function ContestHeadingMock() {
    return <ContestHeading title="A Walk In The Nature" deadline="2025-02-20 23:59:59" />;
}
