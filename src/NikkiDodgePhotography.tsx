import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "swiper/swiper-bundle.css";
import "animate.css/animate.min.css";
import "owl.carousel/dist/assets/owl.carousel.css";
import './NikkiDodgePhotography.css'

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Header from "./components/Header.tsx";
import Footer from "./components/Footer.tsx";
import Home from "./pages/Home.tsx";
import Users from "./pages/Users.tsx";
import Pricing, {PRICING} from "./pages/Pricing.tsx";
import Portfolio, {PORTFOLIO} from "./pages/Portfolio.tsx";
import Contact, {CONTACT} from "./pages/Contact.tsx";
import Howdy, {HOWDY} from "./pages/Howdy.tsx";
import Blog, {BLOG} from "./pages/Blog.tsx";
import Gallery, {GALLERY} from "./pages/Gallery.tsx";

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
                <Route path="/Users" element={<Users />} />
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
