import {useEffect, useState} from "react";
import {Link, NavLink, useLocation} from "react-router-dom";
import {PORTFOLIO} from "../pages/Portfolio";
import {HOWDY} from "../pages/Howdy";
import {CONTACT} from "../pages/Contact";
import {PRICING} from "../pages/Pricing";
import {BLOG} from "../pages/Blog";
import { useSiteSettings } from "../site/SiteSettingsContext";

const navigationLinkClass = ({ isActive }: { isActive: boolean }) => isActive ? "active" : undefined;

const Header = () => {
    const { siteSettings } = useSiteSettings();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const location = useLocation();

    useEffect(() => {
        setIsMenuOpen(false);
    }, [location.pathname]);

    const navClassName = isMenuOpen ? "nav is-open" : "nav";

    return <header className={isMenuOpen ? "header-area header-sticky site-nav-open" : "header-area header-sticky"}>
        <nav className="main-nav" aria-label="Primary navigation">
            {/* ***** Menu Start ***** */}
            <ul className={navClassName} id="primary-nav-left">
                <li><NavLink to="/" end className={navigationLinkClass}>Home</NavLink></li>
                <li><NavLink to={HOWDY} className={navigationLinkClass}>About</NavLink></li>
                <li><NavLink to={PORTFOLIO} className={navigationLinkClass}>Portfolio</NavLink></li>
            </ul>
            {/* ***** Logo Start ***** */}
            <Link to={'/'} className="logo">
                <img src={siteSettings.logoUrl}
                     alt={siteSettings.businessName}/>
            </Link>
            {/* ***** Logo End ***** */}
            <ul className={navClassName} id="primary-nav-right">
                <li><NavLink to={PRICING} className={navigationLinkClass}>Pricing</NavLink></li>
                <li><NavLink to={BLOG} className={navigationLinkClass}>Blog</NavLink></li>
                <li><NavLink to={CONTACT} className={navigationLinkClass}>Inquire</NavLink></li>
            </ul>
            <button
                className={isMenuOpen ? "menu-trigger active" : "menu-trigger"}
                type="button"
                aria-controls="primary-nav-left primary-nav-right"
                aria-expanded={isMenuOpen}
                aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                onClick={() => setIsMenuOpen((currentValue) => !currentValue)}
            >
                <span aria-hidden="true" />
            </button>
            {/* ***** Menu End ***** */}
        </nav>
    </header>

};

export default Header;
