export const sendEmail = async ({ to, subject, text, }) => {
    try {
        const response = await fetch("http://localhost:5000/send-email", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                to: to,
                subject: subject,
                text: text,
            }),
        });
        const data = await response.json();
        console.log("Email Sent:", data);
    }
    catch (error) {
        console.error("Error sending email:", error);
    }
};
