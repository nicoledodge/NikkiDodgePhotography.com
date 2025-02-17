import Banner from "../components/Homes/Banner.tsx";
import Features from "../components/Homes/Features.tsx";
import Categories from "../components/Homes/Categories.tsx";
import Contests from "../components/Homes/Contests.tsx";
import About from "../components/Homes/About.tsx";
import Masonry from "../components/Galery/Masonry.tsx";


function Home() {
    return <>
        <Banner />
        <Features />
        <About />
        <Categories  />
        <Contests />
        <Masonry />
    </>
}

export default Home;