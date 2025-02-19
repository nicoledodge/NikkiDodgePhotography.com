import React, { useState, useEffect } from "react";

interface ContestHeadingProps {
    title: string;
    deadline: string; // Format: "YYYY-MM-DD HH:MM:SS"
}

const WeddingTitleAndTimer: React.FC<ContestHeadingProps> = ({ title, deadline }) => {
    const calculateTimeLeft = () => {
        const now = new Date().getTime();
        const targetTime = new Date(deadline).getTime();
        const difference = targetTime - now;

        if (difference > 0) {
            // Counting down
            return {
                isPast: false, // Flag for counting down
                days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((difference / (1000 * 60)) % 60),
                seconds: Math.floor((difference / 1000) % 60),
            };
        } else {
            // Counting up (time elapsed since deadline)
            const elapsed = Math.abs(difference);
            return {
                isPast: true, // Flag for counting up
                days: Math.floor(elapsed / (1000 * 60 * 60 * 24)),
                hours: Math.floor((elapsed / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((elapsed / (1000 * 60)) % 60),
                seconds: Math.floor((elapsed / 1000) % 60),
            };
        }
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
                    <div id="heading-box" className="col-lg-8 offset-lg-2 header-text mt-5">
                        <h2 className="space-need"><em>{title}</em></h2>
                        {/*<h6>Our Wedding Day</h6>*/}
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
export default WeddingTitleAndTimer