import React, { useRef, useState } from "react";
import { useSiteSettings } from "../../site/SiteSettingsContext";

interface InquiryFormData {
    name: string;
    telephone: string;
    email: string;
    subject: string;
    message: string;
}

type InquiryFormErrors = Partial<Record<keyof InquiryFormData, string>>;

const initialFormData: InquiryFormData = {
    name: "",
    telephone: "",
    email: "",
    subject: "",
    message: "",
};

const requiredFields: Array<keyof InquiryFormData> = ["name", "telephone", "email", "message"];
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Contact: React.FC = () => {
    const { siteSettings } = useSiteSettings();
    const [formData, setFormData] = useState<InquiryFormData>(initialFormData);
    const [formErrors, setFormErrors] = useState<InquiryFormErrors>({});
    const [submitState, setSubmitState] = useState<"idle" | "submitting" | "success" | "error">("idle");
    const [submitMessage, setSubmitMessage] = useState("");
    const fieldRefs = useRef<Partial<Record<keyof InquiryFormData, HTMLInputElement | HTMLTextAreaElement>>>({});
    const statusRef = useRef<HTMLParagraphElement>(null);

    const setFieldRef = (field: keyof InquiryFormData) => (node: HTMLInputElement | HTMLTextAreaElement | null) => {
        if (node) {
            fieldRefs.current[field] = node;
        } else {
            delete fieldRefs.current[field];
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const fieldName = e.target.name as keyof InquiryFormData;
        setFormData({
            ...formData,
            [fieldName]: e.target.value,
        });
        setFormErrors((currentErrors) => {
            if (!currentErrors[fieldName]) {
                return currentErrors;
            }

            const nextErrors = {...currentErrors};
            delete nextErrors[fieldName];
            return nextErrors;
        });
    };

    const generateMailtoLink = () => {
        const { name, telephone, email, subject, message } = formData;
        return `mailto:${siteSettings.contactEmail}?subject=${encodeURIComponent(subject || "Photography Inquiry")}&body=${encodeURIComponent(
            `Hi Nikki,\n\nMy name is ${name}. ${message}\n\nBest contact details:\nPhone: ${telephone}\nEmail: ${email}`
        )}`;
    };

    const getFieldError = (field: keyof InquiryFormData, value: string): string | undefined => {
        if (requiredFields.includes(field) && value.trim().length === 0) {
            return "This field is required.";
        }

        if (field === "email" && value.trim().length > 0 && !emailPattern.test(value.trim())) {
            return "Enter a valid email address.";
        }

        return undefined;
    };

    const validateForm = (): InquiryFormErrors => {
        const nextErrors: InquiryFormErrors = {};
        for (const field of requiredFields) {
            const error = getFieldError(field, formData[field]);
            if (error) {
                nextErrors[field] = error;
            }
        }

        return nextErrors;
    };

    const focusStatus = () => {
        window.requestAnimationFrame(() => statusRef.current?.focus());
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const validationErrors = validateForm();
        const firstInvalidField = requiredFields.find((field) => validationErrors[field]);

        if (firstInvalidField) {
            setFormErrors(validationErrors);
            setSubmitState("error");
            setSubmitMessage("Please fix the highlighted fields so Nikki has enough detail to follow up.");
            fieldRefs.current[firstInvalidField]?.focus();
            return;
        }

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

            setFormData(initialFormData);
            setFormErrors({});
            setSubmitState("success");
            setSubmitMessage("Thanks. Nikki has your inquiry and will follow up soon.");
            focusStatus();
        } catch (error) {
            setSubmitState("error");
            setSubmitMessage(error instanceof Error ? error.message : "Unable to send your inquiry right now.");
            focusStatus();
        }
    };

    return (
        <section className="contact-us mb-5" aria-labelledby="inquiry-form-title">
            <div className="container mb-5">
                <div className="row">
                    <div className="col-lg-12">
                        <div className="section-heading text-center">
                            <h6>{siteSettings.inquirySectionEyebrow}</h6>
                            <h4 id="inquiry-form-title">
                                {siteSettings.inquirySectionTitle}
                            </h4>
                        </div>
                    </div>

                    <div className="col-lg-3 col-md-6">
                        <div className="info-item">
                            <i className="fa fa-phone" aria-hidden="true"></i>
                            <h4>Phone Number</h4>
                            <span>
                                <a href={`tel:${siteSettings.contactPhone}`}>{siteSettings.contactPhone}</a>
                            </span>
                        </div>
                    </div>

                    <div className="col-lg-3 col-md-6">
                        <div className="info-item">
                            <i className="fa fa-envelope" aria-hidden="true"></i>
                            <h4>Email Address</h4>
                            <span>
                                <a href={`mailto:${siteSettings.contactEmail}`}>
                                    {siteSettings.contactEmail}
                                </a>
                            </span>
                        </div>
                    </div>

                    <div className="col-lg-3 col-md-6">
                        <div className="info-item">
                            <i className="fa fa-map-marked" aria-hidden="true"></i>
                            <h4>Service Area</h4>
                            <span>
                                {siteSettings.serviceArea}
                            </span>
                        </div>
                    </div>

                    <div className="col-lg-3 col-md-6">
                        <div className="info-item">
                            <i className="fa-brands fa-instagram" aria-hidden="true"></i>
                            <h4>Recent Reels</h4>
                            <span>
                                <a href={siteSettings.instagramUrl} target="_blank" rel="noreferrer">
                                    See current work
                                </a>
                            </span>
                        </div>
                    </div>

                    <div className="col-lg-12">
                        <form id="contact" onSubmit={handleSubmit} noValidate>
                            <div className="row">
                                <div className="col-lg-6">
                                    <fieldset className="contact-field">
                                        <label htmlFor="contact-name">Your name</label>
                                        <input
                                            type="text"
                                            id="contact-name"
                                            name="name"
                                            ref={setFieldRef("name")}
                                            placeholder="Alex Morgan"
                                            value={formData.name}
                                            onChange={handleChange}
                                            autoComplete="name"
                                            aria-invalid={Boolean(formErrors.name)}
                                            aria-errormessage={formErrors.name ? "contact-name-error" : undefined}
                                        />
                                        {formErrors.name && <span className="contact-field-error" id="contact-name-error">{formErrors.name}</span>}
                                    </fieldset>
                                </div>
                                <div className="col-lg-6">
                                    <fieldset className="contact-field">
                                        <label htmlFor="contact-phone">Phone number</label>
                                        <input
                                            type="tel"
                                            id="contact-phone"
                                            name="telephone"
                                            ref={setFieldRef("telephone")}
                                            placeholder="(555) 123-4567"
                                            value={formData.telephone}
                                            onChange={handleChange}
                                            autoComplete="tel"
                                            aria-invalid={Boolean(formErrors.telephone)}
                                            aria-errormessage={formErrors.telephone ? "contact-phone-error" : undefined}
                                        />
                                        {formErrors.telephone && <span className="contact-field-error" id="contact-phone-error">{formErrors.telephone}</span>}
                                    </fieldset>
                                </div>
                                <div className="col-lg-6">
                                    <fieldset className="contact-field">
                                        <label htmlFor="contact-email">Email address</label>
                                        <input
                                            type="email"
                                            id="contact-email"
                                            name="email"
                                            ref={setFieldRef("email")}
                                            placeholder="you@example.com"
                                            value={formData.email}
                                            onChange={handleChange}
                                            autoComplete="email"
                                            aria-invalid={Boolean(formErrors.email)}
                                            aria-errormessage={formErrors.email ? "contact-email-error" : undefined}
                                        />
                                        {formErrors.email && <span className="contact-field-error" id="contact-email-error">{formErrors.email}</span>}
                                    </fieldset>
                                </div>
                                <div className="col-lg-6">
                                    <fieldset className="contact-field">
                                        <label htmlFor="contact-subject">What are you planning?</label>
                                        <input
                                            type="text"
                                            id="contact-subject"
                                            name="subject"
                                            ref={setFieldRef("subject")}
                                            placeholder="Concert, sports session, senior portraits..."
                                            value={formData.subject}
                                            onChange={handleChange}
                                            autoComplete="off"
                                        />
                                    </fieldset>
                                </div>
                                <div className="col-lg-12">
                                    <fieldset className="contact-field">
                                        <label htmlFor="contact-message">Details Nikki should know</label>
                                        <span className="contact-field-help" id="contact-message-help">
                                            Include date, location, session type, deadline, and how you want the images to feel.
                                        </span>
                                        <textarea
                                            id="contact-message"
                                            name="message"
                                            ref={setFieldRef("message")}
                                            placeholder="We are planning..."
                                            value={formData.message}
                                            onChange={handleChange}
                                            aria-describedby="contact-message-help"
                                            aria-invalid={Boolean(formErrors.message)}
                                            aria-errormessage={formErrors.message ? "contact-message-error" : undefined}
                                        />
                                        {formErrors.message && <span className="contact-field-error" id="contact-message-error">{formErrors.message}</span>}
                                    </fieldset>
                                </div>

                                {submitMessage && (
                                    <div className="col-lg-12">
                                        <p
                                            ref={statusRef}
                                            className={submitState === "error" ? "contact-form-message is-error" : "contact-form-message is-success"}
                                            role={submitState === "error" ? "alert" : "status"}
                                            tabIndex={-1}
                                        >
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
