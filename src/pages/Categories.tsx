import Heading from "../components/Categories/Heading.tsx";
import Categories from "../components/Categories/Categories.tsx";
import Contests from "../components/Categories/Contests.tsx";
import Testimonials from "../components/Categories/Testimonials.tsx";

function Home() {
    return <>
        <Heading />
        <Categories />
        <Contests />
        <Testimonials />
    </>
}

export default Home;