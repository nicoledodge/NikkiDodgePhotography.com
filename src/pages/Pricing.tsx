import Heading from "../components/Details/Heading";
import ContestWin from "../components/Details/ContestWin";
import PricingSection from "../components/Details/Pricing";


export const PRICING = '/pricing'

function Pricing() {
    return <>
        <Heading />
        <PricingSection />
        <ContestWin />
    </>
}

export default Pricing;