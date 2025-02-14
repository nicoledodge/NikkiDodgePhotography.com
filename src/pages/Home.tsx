import Banner from "../components/Banner.tsx";
import Features from "../components/Features.tsx";
import Categories from "../components/Categories.tsx";
import Contests from "../components/Contests.tsx";
import Pricing from "../components/Pricing.tsx";

function Home() {
    return <>
        <Banner />
        <Features />
        <Categories />
        <Contests />
        <Pricing />
    </>
}

export default Home;