import Banner from "../components/Homes/Banner";
import Features from "../components/Homes/Features";
import Categories from "../components/Homes/Categories";
import Contests from "../components/Homes/Contests";
import About from "../components/Homes/About";
import Masonry from "../components/Galery/Masonry";
import Testimonials from "../components/Howdy/Testimonials";


function Home() {
    return <>
        <Banner />
        <Features />
        <About />
        <Categories  />
        <Contests />
        <Testimonials />
        <Masonry />
    </>
}

export default Home;
