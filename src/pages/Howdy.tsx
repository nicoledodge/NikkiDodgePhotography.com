import Heading from "../components/Howdy/Heading.tsx";
import Categories from "../components/Howdy/Categories.tsx";
import Testimonials from "../components/Howdy/Testimonials.tsx";
import Info from "../components/Howdy/Info.tsx";

export const HOWDY = '/howdy'

function Howdy() {
    return <>
        <Heading />
        <Categories />
        <Info />
        <Testimonials />
    </>
}

export default Howdy;