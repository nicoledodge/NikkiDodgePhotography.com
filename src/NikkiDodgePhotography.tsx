import "./NikkiDodgePhotography.css";

import { lazy, Suspense, useEffect, useRef } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";

import Header from "./components/Header";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Pricing, { PRICING } from "./pages/Pricing";
import Portfolio, { PORTFOLIO } from "./pages/Portfolio";
import Contact, { CONTACT } from "./pages/Contact";
import Howdy, { HOWDY } from "./pages/Howdy";
import Blog, { BLOG } from "./pages/Blog";
import Gallery, { GALLERY } from "./pages/Gallery";
import mediaLibrary from "./components/MediaLibrary/MediaLibrary";
import { formatSessionName } from "./pages/Portfolio";
const Admin = lazy(() => import("./pages/Admin"));
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
      <Route
        path={PORTFOLIO + "/:categoryName/:search"}
        element={<Portfolio />}
      />
      <Route path={CONTACT} element={<Contact />} />
      <Route path={HOWDY} element={<Howdy />} />
      <Route path={BLOG} element={<Blog />} />
      <Route
        path={GALLERY + "/:categoryName/:sessionName"}
        element={<Gallery />}
      />
      <Route
        path="*"
        element={
          <section className="site-container empty-state">
            <p className="eyebrow">A different direction</p>
            <h1>There’s more to explore.</h1>
            <p>
              This page isn’t here. Visit the{" "}
              <a className="text-link" href="/Portfolio">
                portfolio ↗
              </a>
            </p>
          </section>
        }
      />
      <Route
        path="/admin"
        element={
          <Suspense fallback={<p className="site-container">Loading admin…</p>}>
            <Admin />
          </Suspense>
        }
      />
    </Routes>
  );

  useEffect(() => {
    if (isAdminRoute) {
      return;
    }

    const titles: Record<string, string> = {
      "/": "Colorado Wedding, Portrait & Event Photographer",
      "/portfolio": "The Portfolio",
      "/howdy": "Meet Nikki",
      "/pricing": "The Experience & Pricing",
      "/contact": "Start Your Inquiry",
      "/blog": "Field Notes",
    };
    const titleKey = location.pathname.toLowerCase();
    const routeParts = location.pathname.split("/");
    const galleryCategory = Object.values(mediaLibrary).find((category) =>
      category.category.toLowerCase() === routeParts[2]?.toLowerCase(),
    );
    const galleryStory = titleKey.startsWith("/gallery/")
      ? galleryCategory?.sessions.find((session) => encodeURIComponent(session.name).toLowerCase() === routeParts[3]?.toLowerCase())
      : undefined;
    const pageTitle = galleryStory
      ? galleryStory.title || formatSessionName(galleryStory.name)
      : titles[titleKey] || "The Portfolio";
    document.title = `${pageTitle} | Nikki Dodge Photography`;
    if (location.hash) {
      window.requestAnimationFrame(() =>
        document.getElementById(location.hash.slice(1))?.scrollIntoView(),
      );
    } else {
      window.scrollTo({ top: 0, left: 0 });
    }
    window.requestAnimationFrame(() =>
      publicMainRef.current?.focus({ preventScroll: true }),
    );
  }, [isAdminRoute, location.pathname]);

  return (
    <>
      {!isAdminRoute && (
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
      )}
      {!isAdminRoute && <Header />}
      {isAdminRoute ? (
        routeMarkup
      ) : (
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
