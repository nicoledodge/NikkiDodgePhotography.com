import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
const Contact = () => {
    const [formData, setFormData] = useState({
        name: "",
        telephone: "",
        email: "",
        subject: "",
        message: "",
    });
    // Handle input change
    const handleChange = (e) => {
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
            &body=${encodeURIComponent(`Hi, my name is ${name}.\n\n${message}\n\nYou can contact me at:\nPhone: ${telephone}\nEmail: ${email}`)}`;
    };
    return (_jsx("section", { className: "contact-us mb-5", children: _jsx("div", { className: "container mb-5", children: _jsxs("div", { className: "row", children: [_jsx("div", { className: "col-lg-12", children: _jsxs("div", { className: "section-heading text-center", children: [_jsx("h6", { children: "Contact This User" }), _jsxs("h4", { children: ["Don't Be Shy to Contact the ", _jsx("em", { children: "Photographer Now" })] })] }) }), _jsx("div", { className: "col-lg-4", children: _jsxs("div", { className: "info-item", children: [_jsx("i", { className: "fa fa-phone" }), _jsx("h4", { children: "Phone Number" }), _jsx("span", { children: _jsx("a", { href: "tel:972-523-3420", children: "972-523-3420" }) })] }) }), _jsx("div", { className: "col-lg-4", children: _jsxs("div", { className: "info-item", children: [_jsx("i", { className: "fa fa-envelope" }), _jsx("h4", { children: "Email Address" }), _jsx("span", { children: _jsx("a", { href: "mailto:nicole@nikkidodgephotography.com", children: "nicole@nikkidodgephotography.com" }) })] }) }), _jsx("div", { className: "col-lg-4", children: _jsxs("div", { className: "info-item", children: [_jsx("i", { className: "fa fa-map-marked" }), _jsx("h4", { children: "Home Office" }), _jsx("span", { children: _jsx("a", { href: "#", children: "9609 Moss Rose Cir, Highlands Ranch, CO 80129, United States" }) })] }) }), _jsx("div", { className: "col-lg-12", children: _jsx("form", { id: "contact", children: _jsxs("div", { className: "row", children: [_jsx("div", { className: "col-lg-6", children: _jsx("fieldset", { children: _jsx("input", { type: "text", name: "name", placeholder: "Your Name...", value: formData.name, onChange: handleChange, required: true }) }) }), _jsx("div", { className: "col-lg-6", children: _jsx("fieldset", { children: _jsx("input", { type: "text", name: "telephone", placeholder: "Your Telephone...", value: formData.telephone, onChange: handleChange, required: true }) }) }), _jsx("div", { className: "col-lg-6", children: _jsx("fieldset", { children: _jsx("input", { type: "email", name: "email", placeholder: "Your E-mail...", value: formData.email, onChange: handleChange, required: true }) }) }), _jsx("div", { className: "col-lg-6", children: _jsx("fieldset", { children: _jsx("input", { type: "text", name: "subject", placeholder: "Subject...", value: formData.subject, onChange: handleChange }) }) }), _jsx("div", { className: "col-lg-12", children: _jsx("fieldset", { children: _jsx("textarea", { name: "message", placeholder: "Your Message", value: formData.message, onChange: handleChange }) }) }), _jsx("div", { className: "main-button col-lg-12 text-center mt-4", children: _jsx("a", { href: generateMailtoLink(), className: "orange-button", children: "Send Email Now" }) })] }) }) })] }) }) }));
};
export default Contact;
