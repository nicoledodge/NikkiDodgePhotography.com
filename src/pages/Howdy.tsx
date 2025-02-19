import Heading from "../components/Howdy/Heading";
import CategoriesComponent from "../components/Howdy/CategoriesComponent";
import Testimonials from "../components/Howdy/Testimonials";
import Info from "../components/Howdy/Info";

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