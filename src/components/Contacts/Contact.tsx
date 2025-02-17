import React from "react";

const Contact: React.FC = () => {
    return (
        <section className="contact-us mb-5">
            <div className="container mb-5">
                <div className="row">
                    <div className="col-lg-12">
                        <div className="section-heading text-center">
                            <h6>Contact This User</h6>
                            <h4>
                                Don't Be Shy to contact the <em>Photographer Now</em>
                            </h4>
                        </div>
                    </div>

                    <div className="col-lg-4">
                        <div className="info-item">
                            <i className="fa fa-phone"></i>
                            <h4>Phone Numbers</h4>
                            <span>
                <a href="tel:972-523-3420">972-523-3420</a>
              </span>
                        </div>
                    </div>

                    <div className="col-lg-4">
                        <div className="info-item">
                            <i className="fa fa-envelope"></i>
                            <h4>Email Addresses</h4>
                            <span>
                <a href="mailto:info@company.com">nicole@nikkidodgephotography.com</a>
              </span>
                        </div>
                    </div>

                    <div className="col-lg-4">
                        <div className="info-item">
                            <i className="fa fa-map-marked"></i>
                            <h4>Home Office</h4>
                            <span>
                <a href="#">9609 Moss Rose Cir, Highlands Ranch,<br />CO 80129, United States</a>
              </span>
                        </div>
                    </div>

                    <div className="col-lg-12">
                        <form id="contact" action="#" method="post">
                            <div className="row">
                                <div className="col-lg-6">
                                    <fieldset>
                                        <input
                                            type="text"
                                            name="name"
                                            id="name"
                                            placeholder="Your Name..."
                                            autoComplete="on"
                                            required
                                        />
                                    </fieldset>
                                </div>
                                <div className="col-lg-6">
                                    <fieldset>
                                        <input
                                            type="text"
                                            name="telephone"
                                            id="telephone"
                                            placeholder="Your Telephone..."
                                            autoComplete="on"
                                            required
                                        />
                                    </fieldset>
                                </div>
                                <div className="col-lg-6">
                                    <fieldset>
                                        <input
                                            type="email"
                                            name="email"
                                            id="email"
                                            placeholder="Your E-mail..."
                                            required
                                        />
                                    </fieldset>
                                </div>
                                <div className="col-lg-6">
                                    <fieldset>
                                        <input
                                            type="text"
                                            name="subject"
                                            id="subject"
                                            placeholder="Subject..."
                                            autoComplete="on"
                                        />
                                    </fieldset>
                                </div>
                                <div className="col-lg-12">
                                    <fieldset>
                    <textarea
                        name="message"
                        id="message"
                        placeholder="Your Message"
                    ></textarea>
                                    </fieldset>
                                </div>
                                <div className="col-lg-12">
                                    <fieldset>
                                        <button type="submit" id="form-submit" className="orange-button">
                                            Send Message Now
                                        </button>
                                    </fieldset>
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
