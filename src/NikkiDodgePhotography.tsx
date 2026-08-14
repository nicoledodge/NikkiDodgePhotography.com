import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "swiper/swiper-bundle.css";
import "animate.css/animate.min.css";
import "owl.carousel/dist/assets/owl.carousel.css";
import './NikkiDodgePhotography.css'

import {useEffect, useRef} from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";

import Header from "./components/Header";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Pricing, {PRICING} from "./pages/Pricing";
import Portfolio, {PORTFOLIO} from "./pages/Portfolio";
import Contact, {CONTACT} from "./pages/Contact";
import Howdy, {HOWDY} from "./pages/Howdy";
import Blog, {BLOG} from "./pages/Blog";
import Gallery, {GALLERY} from "./pages/Gallery";
import Admin from "./pages/Admin";
import { SiteSettingsProvider } from "./site/SiteSettingsContext";

const AppLayout = () => {
    const location = useLocation();
    const publicMainRef = useRef<HTMLElement>(null);
    const isAdminRoute = location.pathname.startsWith("/admin");
    const routeMarkup = (
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
            <Route path="/admin" element={<Admin />} />
        </Routes>
    );

    useEffect(() => {
        if (isAdminRoute) {
            return;
        }

        window.scrollTo({top: 0, left: 0});
        window.requestAnimationFrame(() => publicMainRef.current?.focus());
    }, [isAdminRoute, location.pathname]);

    return (
        <>
            {!isAdminRoute && <a className="skip-link" href="#main-content">Skip to main content</a>}
            {!isAdminRoute && <Header />}
            {isAdminRoute ? routeMarkup : (
                <main id="main-content" tabIndex={-1} ref={publicMainRef}>
                    {routeMarkup}
                </main>
            )}
            {!isAdminRoute && <Footer />}
        </>
    );
};

const NikkiDodgePhotography = () => {
    return (
        <Router>
            <SiteSettingsProvider>
                <AppLayout />
            </SiteSettingsProvider>
        </Router>
    );
};

export default NikkiDodgePhotography;
