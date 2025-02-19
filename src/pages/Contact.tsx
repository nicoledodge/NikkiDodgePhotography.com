import Heading from "../components/Contacts/Heading";
import Info from "../components/Contacts/Info";
import ContactForum from "../components/Contacts/Contact";

export const CONTACT = '/Contact'

function Contact() {
    return <>
        <Heading/>
        <Info />
        <ContactForum />
    </>
}

export default Contact;