import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "swiper/swiper-bundle.css";
import "animate.css/animate.min.css";
import "owl.carousel/dist/assets/owl.carousel.css";
import './NikkiDodgePhotography.css'

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Header from "./components/Header";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Pricing, {PRICING} from "./pages/Pricing";
import Portfolio, {PORTFOLIO} from "./pages/Portfolio";
import Contact, {CONTACT} from "./pages/Contact";
import Howdy, {HOWDY} from "./pages/Howdy";
import Blog, {BLOG} from "./pages/Blog";
import Gallery, {GALLERY} from "./pages/Gallery";

const NikkiDodgePhotography = () => {
    return (
        <Router>
            <Header />
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path={PRICING} element={<Pricing />} />
                <Route path={PORTFOLIO} element={<Portfolio />} />
                <Route path={PORTFOLIO + "/:categoryName"} element={<Portfolio />} />
                <Route path={PORTFOLIO + "/:categoryName/:search"} element={<Portfolio />} />
                <Route path={CONTACT} element={<Contact />} />
                <Route path={HOWDY} element={<Howdy />} />
                <Route path={BLOG} element={<Blog />} />
                <Route path={GALLERY + "/:categoryName/:sessionName"} element={<Gallery />} />

            </Routes>
            <Footer />
        </Router>
    );
};

export default NikkiDodgePhotography;
