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
        return `mailto:nicole@nikkidodgephotography.com
            ?subject=${encodeURIComponent(subject || "Photography Inquiry")}
            &body=${encodeURIComponent(
            `Hi, my name is ${name}.\n\n${message}\n\nYou can contact me at:\nPhone: ${telephone}\nEmail: ${email}`
        )}`;
    };

    return (
        <section className="contact-us mb-5">
            <div className="container mb-5">
                <div className="row">
                    <div className="col-lg-12">
                        <div className="section-heading text-center">
                            <h6>Contact This User</h6>
                            <h4>
                                Don't Be Shy to Contact the <em>Photographer Now</em>
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
                            <h4>Home Office</h4>
                            <span>
                                <a href="#">9609 Moss Rose Cir, Highlands Ranch, CO 80129, United States</a>
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
                                            placeholder="Your Name..."
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
                                            placeholder="Your Telephone..."
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
                                            placeholder="Your E-mail..."
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
                                            placeholder="Subject..."
                                            value={formData.subject}
                                            onChange={handleChange}
                                        />
                                    </fieldset>
                                </div>
                                <div className="col-lg-12">
                                    <fieldset>
                                        <textarea
                                            name="message"
                                            placeholder="Your Message"
                                            value={formData.message}
                                            onChange={handleChange}
                                        ></textarea>
                                    </fieldset>
                                </div>

                                <div className="main-button col-lg-12 text-center mt-4">
                                    <a href={generateMailtoLink()} className="orange-button">
                                        Send Email Now
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
