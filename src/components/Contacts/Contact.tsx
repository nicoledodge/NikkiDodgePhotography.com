import React, { useState } from "react";
import { useSiteSettings } from "../../site/SiteSettingsContext";

const Contact: React.FC = () => {
    const { siteSettings } = useSiteSettings();
    const [formData, setFormData] = useState({
        name: "",
        telephone: "",
        email: "",
        subject: "",
        message: "",
    });
    const [submitState, setSubmitState] = useState<"idle" | "submitting" | "success" | "error">("idle");
    const [submitMessage, setSubmitMessage] = useState("");

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const generateMailtoLink = () => {
        const { name, telephone, email, subject, message } = formData;
        return `mailto:${siteSettings.contactEmail}?subject=${encodeURIComponent(subject || "Photography Inquiry")}&body=${encodeURIComponent(
            `Hi Nikki,\n\nMy name is ${name}. ${message}\n\nBest contact details:\nPhone: ${telephone}\nEmail: ${email}`
        )}`;
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSubmitState("submitting");
        setSubmitMessage("");

        try {
            const response = await fetch("/api/public/inquiries", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
            });

            const payload = await response.json() as { error?: string };
            if (!response.ok) {
                throw new Error(payload.error || "Unable to send your inquiry right now.");
            }

            setFormData({
                name: "",
                telephone: "",
                email: "",
                subject: "",
                message: "",
            });
            setSubmitState("success");
            setSubmitMessage("Thanks. Nikki has your inquiry and will follow up soon.");
        } catch (error) {
            setSubmitState("error");
            setSubmitMessage(error instanceof Error ? error.message : "Unable to send your inquiry right now.");
        }
    };

    return (
        <section className="contact-us mb-5">
            <div className="container mb-5">
                <div className="row">
                    <div className="col-lg-12">
                        <div className="section-heading text-center">
                            <h6>{siteSettings.inquirySectionEyebrow}</h6>
                            <h4>
                                {siteSettings.inquirySectionTitle}
                            </h4>
                        </div>
                    </div>

                    <div className="col-lg-4">
                        <div className="info-item">
                            <i className="fa fa-phone"></i>
                            <h4>Phone Number</h4>
                            <span>
                                <a href={`tel:${siteSettings.contactPhone}`}>{siteSettings.contactPhone}</a>
                            </span>
                        </div>
                    </div>

                    <div className="col-lg-4">
                        <div className="info-item">
                            <i className="fa fa-envelope"></i>
                            <h4>Email Address</h4>
                            <span>
                                <a href={`mailto:${siteSettings.contactEmail}`}>
                                    {siteSettings.contactEmail}
                                </a>
                            </span>
                        </div>
                    </div>

                    <div className="col-lg-4">
                        <div className="info-item">
                            <i className="fa fa-map-marked"></i>
                            <h4>Service Area</h4>
                            <span>
                                {siteSettings.serviceArea}
                            </span>
                        </div>
                    </div>

                    <div className="col-lg-12">
                        <form id="contact" onSubmit={handleSubmit}>
                            <div className="row">
                                <div className="col-lg-6">
                                    <fieldset>
                                        <input
                                            type="text"
                                            name="name"
                                            placeholder="Your name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            required
                                        />
                                    </fieldset>
                                </div>
                                <div className="col-lg-6">
                                    <fieldset>
                                        <input
                                            type="text"
                                            name="telephone"
                                            placeholder="Phone number"
                                            value={formData.telephone}
                                            onChange={handleChange}
                                            required
                                        />
                                    </fieldset>
                                </div>
                                <div className="col-lg-6">
                                    <fieldset>
                                        <input
                                            type="email"
                                            name="email"
                                            placeholder="Email address"
                                            value={formData.email}
                                            onChange={handleChange}
                                            required
                                        />
                                    </fieldset>
                                </div>
                                <div className="col-lg-6">
                                    <fieldset>
                                        <input
                                            type="text"
                                            name="subject"
                                            placeholder="Wedding, senior session, family photos..."
                                            value={formData.subject}
                                            onChange={handleChange}
                                        />
                                    </fieldset>
                                </div>
                                <div className="col-lg-12">
                                    <fieldset>
                                        <textarea
                                            name="message"
                                            placeholder="Share your date, location, session type, and what you want the photos to feel like."
                                            value={formData.message}
                                            onChange={handleChange}
                                        ></textarea>
                                    </fieldset>
                                </div>

                                {submitMessage && (
                                    <div className="col-lg-12">
                                        <p className={submitState === "error" ? "contact-form-message is-error" : "contact-form-message is-success"}>
                                            {submitMessage}
                                        </p>
                                    </div>
                                )}

                                <div className="main-button col-lg-12 text-center mt-4">
                                    <button className="orange-button" type="submit" disabled={submitState === "submitting"}>
                                        {submitState === "submitting" ? "Sending..." : "Send Inquiry"}
                                    </button>
                                </div>
                                <div className="col-lg-12 text-center mt-3">
                                    <a className="contact-form-fallback" href={generateMailtoLink()}>
                                        Prefer email? Open a draft instead.
                                    </a>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Contact;
