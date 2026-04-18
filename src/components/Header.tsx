import {Link} from "react-router-dom";
import {PORTFOLIO} from "../pages/Portfolio";
import {HOWDY} from "../pages/Howdy";
import {CONTACT} from "../pages/Contact";
import {PRICING} from "../pages/Pricing";
import {BLOG} from "../pages/Blog";


const Header = () => {
    return <header className="header-area header-sticky">
        <nav className="main-nav">
            {/* ***** Menu Start ***** */}
            <ul className="nav">
                <li><Link to="/" className="active">Home</Link></li>
                <li><Link to={HOWDY} className="active">About</Link></li>
                <li><Link to={PORTFOLIO} className="active">Portfolio</Link></li>
            </ul>
            {/* ***** Logo Start ***** */}
            <Link to={'/'} className="logo">
                <img src='/assets/images/logo-black.png'
                     alt="Nikki Dodge Photography"/>
            </Link>
            {/* ***** Logo End ***** */}
            <ul className="nav">
                <li><Link to={PRICING}>Pricing</Link></li>
                <li><Link to={BLOG}>Blog</Link></li>
                <li><Link to={CONTACT}>Inquire</Link></li>
            </ul>
            <a className="menu-trigger">
                <span>Menu</span>
            </a>
            {/* ***** Menu End ***** */}
        </nav>
    </header>

};

export default Header;
