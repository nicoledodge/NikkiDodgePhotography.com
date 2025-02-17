import express, {Request, Response} from "express";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import cors from "cors";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors()); // Enable CORS for React frontend
app.use(express.json()); // Parse JSON requests

// Configure Nodemailer
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
    },
});

// Email sending endpoint
app.post("/send-email", async (req: Request, res: Response): Promise<void> => {
    try {
        const {to, subject, text} = req.body;

        if (!to || !subject || !text) {
            res.status(400).json({error: "Missing required fields."});
            return;
        }

        const mailOptions = {
            from: process.env.GMAIL_USER,
            to,
            bcc: process.env.GMAIL_USER, // BCC to yourself
            subject,
            text,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent:", info.response);
        res.status(200).json({message: "Email sent successfully", info});
    } catch (error) {
        console.error("Error sending email:", error);
        res.status(500).json({error: "Failed to send email"});
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
