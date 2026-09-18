import React, { useEffect, useRef, useState } from "react";
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

const requiredFields: Array<keyof InquiryFormData> = ["name", "email", "telephone", "message"];
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Contact: React.FC<{ initialSubject?: string }> = ({ initialSubject = "" }) => {
    const { siteSettings } = useSiteSettings();
    const [formData, setFormData] = useState<InquiryFormData>(() => ({ ...initialFormData, subject: initialSubject }));
    const previousInitialSubject = useRef(initialSubject);
    const [formErrors, setFormErrors] = useState<InquiryFormErrors>({});
    const [submitState, setSubmitState] = useState<"idle" | "submitting" | "success" | "error">("idle");
    const [submitMessage, setSubmitMessage] = useState("");
    const fieldRefs = useRef<Partial<Record<keyof InquiryFormData, HTMLInputElement | HTMLTextAreaElement>>>({});
    const statusRef = useRef<HTMLParagraphElement>(null);

    useEffect(() => {
        const previousSubject = previousInitialSubject.current;
        previousInitialSubject.current = initialSubject;
        if (previousSubject === initialSubject) return;
        setFormData((current) => current.subject === previousSubject || current.subject === ""
            ? { ...current, subject: initialSubject }
            : current);
    }, [initialSubject]);

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
            setSubmitMessage("Please check the highlighted fields before sending.");
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

            const payload = await response.json() as { ok?: boolean; error?: string };
            if (!response.ok || payload.ok !== true) {
                throw new Error(payload.error || "Unable to send your inquiry right now.");
            }

            setFormData(initialFormData);
            setFormErrors({});
            setSubmitState("success");
            setSubmitMessage("Thank you — your inquiry has been received. Nikki will be in touch to talk through the details.");
            focusStatus();
        } catch {
            setSubmitState("error");
            setSubmitMessage("Your inquiry couldn’t be sent. Please try again, or use the email link below — your details are still here.");
            focusStatus();
        }
    };

    return (
        <section className="inner-inquiry" aria-labelledby="inquiry-form-title">
            <p className="eyebrow">Your inquiry</p>
            <h2 id="inquiry-form-title">Let’s start a conversation.</h2>
            <p className="inner-form-intro">Share a little about your plans. I’ll be in touch with availability and next steps.</p>
            <p className="inner-required-note">All fields are required unless marked optional.</p>
            <form className="inner-inquiry-form" onSubmit={handleSubmit} noValidate aria-busy={submitState === "submitting"}>
                <div className="inner-field">
                    <label htmlFor="contact-name">Your name</label>
                    <input type="text" id="contact-name" name="name" ref={setFieldRef("name")}
                        value={formData.name} onChange={handleChange} autoComplete="name" required
                        aria-invalid={Boolean(formErrors.name)}
                        aria-describedby={formErrors.name ? "contact-name-error" : undefined} />
                    {formErrors.name && <span className="inner-field-error" id="contact-name-error">{formErrors.name}</span>}
                </div>
                <div className="inner-field">
                    <label htmlFor="contact-email">Email address</label>
                    <input type="email" id="contact-email" name="email" ref={setFieldRef("email")}
                        value={formData.email} onChange={handleChange} autoComplete="email" required
                        aria-invalid={Boolean(formErrors.email)}
                        aria-describedby={formErrors.email ? "contact-email-error" : undefined} />
                    {formErrors.email && <span className="inner-field-error" id="contact-email-error">{formErrors.email}</span>}
                </div>
                <div className="inner-field">
                    <label htmlFor="contact-phone">Phone number</label>
                    <input type="tel" id="contact-phone" name="telephone" ref={setFieldRef("telephone")}
                        value={formData.telephone} onChange={handleChange} autoComplete="tel" required
                        aria-invalid={Boolean(formErrors.telephone)}
                        aria-describedby={formErrors.telephone ? "contact-phone-error" : undefined} />
                    {formErrors.telephone && <span className="inner-field-error" id="contact-phone-error">{formErrors.telephone}</span>}
                </div>
                <div className="inner-field">
                    <label htmlFor="contact-subject">What are you planning? <span>(optional)</span></label>
                    <input type="text" id="contact-subject" name="subject" ref={setFieldRef("subject")}
                        placeholder="A wedding, portraits, an event…" value={formData.subject}
                        onChange={handleChange} autoComplete="off" />
                </div>
                <div className="inner-field inner-field-full">
                    <label htmlFor="contact-message">Tell me a little more</label>
                    <span className="inner-field-help" id="contact-message-help">Your date, location, and what you have in mind. It’s okay if you’re still figuring things out.</span>
                    <textarea id="contact-message" name="message" ref={setFieldRef("message")}
                        value={formData.message} onChange={handleChange} rows={5} required
                        aria-describedby={`contact-message-help${formErrors.message ? " contact-message-error" : ""}`}
                        aria-invalid={Boolean(formErrors.message)} />
                    {formErrors.message && <span className="inner-field-error" id="contact-message-error">{formErrors.message}</span>}
                </div>
                {submitMessage && (
                    <p ref={statusRef} className={`inner-form-message inner-field-full ${submitState === "error" ? "is-error" : "is-success"}`}
                        role={submitState === "error" ? "alert" : "status"} tabIndex={-1}>
                        {submitMessage}
                    </p>
                )}
                <div className="inner-form-actions inner-field-full">
                    <button className="button" type="submit" disabled={submitState === "submitting"}>
                        {submitState === "submitting" ? "Sending…" : "Send your inquiry"} <span aria-hidden="true">↗</span>
                    </button>
                    <a className="inner-email-fallback" href={generateMailtoLink()}>Prefer email? Open a draft.</a>
                </div>
            </form>
        </section>
    );
};

export default Contact;
