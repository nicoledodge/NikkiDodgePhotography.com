import Heading from "../components/Details/Heading.tsx";
import ContestWin from "../components/Details/ContestWin.tsx";
import PricingSection from "../components/Details/Pricing.tsx";


export const PRICING = '/pricing'

function Pricing() {
    return <>
        <Heading />
        <PricingSection />
        <ContestWin />
    </>
}

export default Pricing;