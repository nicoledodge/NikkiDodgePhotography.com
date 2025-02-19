import Heading from "../components/Howdy/Heading.tsx";
import CategoriesComponent from "../components/Howdy/CategoriesComponent.tsx";
import Testimonials from "../components/Howdy/Testimonials.tsx";
import Info from "../components/Howdy/Info.tsx";

export const HOWDY = '/howdy'

function Howdy() {
    return <>
        <Heading />
        <CategoriesComponent />
        <Info />
        <Testimonials />
    </>
}

export default Howdy;