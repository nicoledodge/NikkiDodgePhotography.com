import Heading from "../components/Contacts/Heading.tsx";
import Info from "../components/Contacts/Info.tsx";
import ContactForum from "../components/Contacts/Contact.tsx";

export const CONTACT = '/Contact'

function Contact() {
    return <>
        <Heading/>
        <Info />
        <ContactForum />
    </>
}

export default Contact;