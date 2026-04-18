import React, { useState } from "react";

const Contact: React.FC = () => {
    const [formData, setFormData] = useState({
        name: "",
        telephone: "",
        email: "",
        subject: "",
        message: "",
    });

    // Handle input change
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    // Generate mailto link dynamically
    const generateMailtoLink = () => {
        const { name, telephone, email, subject, message } = formData;
        return `mailto:nicole@nikkidodgephotography.com?subject=${encodeURIComponent(subject || "Photography Inquiry")}&body=${encodeURIComponent(
            `Hi Nikki,\n\nMy name is ${name}. ${message}\n\nBest contact details:\nPhone: ${telephone}\nEmail: ${email}`
        )}`;
    };

    return (
        <section className="contact-us mb-5">
            <div className="container mb-5">
                <div className="row">
                    <div className="col-lg-12">
                        <div className="section-heading text-center">
                            <h6>Start Your Inquiry</h6>
                            <h4>
                                Tell Nikki what you are planning and get the conversation moving
                            </h4>
                        </div>
                    </div>

                    <div className="col-lg-4">
                        <div className="info-item">
                            <i className="fa fa-phone"></i>
                            <h4>Phone Number</h4>
                            <span>
                                <a href="tel:972-523-3420">972-523-3420</a>
                            </span>
                        </div>
                    </div>

                    <div className="col-lg-4">
                        <div className="info-item">
                            <i className="fa fa-envelope"></i>
                            <h4>Email Address</h4>
                            <span>
                                <a href="mailto:nicole@nikkidodgephotography.com">
                                    nicole@nikkidodgephotography.com
                                </a>
                            </span>
                        </div>
                    </div>

                    <div className="col-lg-4">
                        <div className="info-item">
                            <i className="fa fa-map-marked"></i>
                            <h4>Service Area</h4>
                            <span>
                                Highlands Ranch, Denver, and destinations across Colorado
                            </span>
                        </div>
                    </div>

                    {/* Contact Form */}
                    <div className="col-lg-12">
                        <form id="contact">
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

                                <div className="main-button col-lg-12 text-center mt-4">
                                    <a href={generateMailtoLink()} className="orange-button">
                                        Open Your Email Draft
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
