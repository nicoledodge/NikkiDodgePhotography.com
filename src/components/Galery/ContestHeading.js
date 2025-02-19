import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
const WeddingTitleAndTimer = ({ title, deadline }) => {
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
        }
        else {
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
    return (_jsx("div", { className: "page-heading", children: _jsx("div", { className: "container", children: _jsx("div", { className: "row", children: _jsxs("div", { id: "heading-box", className: "col-lg-8 offset-lg-2 header-text mt-5", children: [_jsx("h2", { className: "space-need", children: _jsx("em", { children: title }) }), _jsx("div", { className: "main-content", children: _jsxs("div", { className: "counter", children: [_jsxs("div", { className: "days", children: [_jsx("div", { className: "value", children: timeLeft.days.toString().padStart(2, "0") }), _jsx("span", { children: "Days" })] }), _jsxs("div", { className: "hours", children: [_jsx("div", { className: "value", children: timeLeft.hours.toString().padStart(2, "0") }), _jsx("span", { children: "Hours" })] }), _jsxs("div", { className: "minutes", children: [_jsx("div", { className: "value", children: timeLeft.minutes.toString().padStart(2, "0") }), _jsx("span", { children: "Minutes" })] }), _jsxs("div", { className: "seconds", children: [_jsx("div", { className: "value", children: timeLeft.seconds.toString().padStart(2, "0") }), _jsx("span", { children: "Seconds" })] })] }) })] }) }) }) }));
};
// Example Usage
export default WeddingTitleAndTimer;
