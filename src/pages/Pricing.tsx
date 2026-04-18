import Heading from "../components/Details/Heading";
import SessionOffers from "../components/Details/SessionOffers";
import PricingSection from "../components/Details/Pricing";


export const PRICING = '/pricing'

function Pricing() {
    return <>
        <Heading />
        <PricingSection />
        <SessionOffers />
    </>
}

export default Pricing;
