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
import Categories from "./pages/Categories.tsx";
import Contest from "./pages/Contest.tsx";
import Contests from "./pages/Contests.tsx";

const NikkiDodgePhotography = () => {
    return (
        <Router>
            <Header />
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/Categories" element={<Categories />} />
                <Route path="/Contest" element={<Contest />} />
                <Route path="/Contests" element={<Contests />} />
                <Route path="/Users" element={<Users />} />

            </Routes>
            <Footer />
        </Router>
    );
};

export default NikkiDodgePhotography;
