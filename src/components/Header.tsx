import {Link} from "react-router-dom";


const Header = () => {
    return <header className="header-area header-sticky">
        <nav className="main-nav">

            {/* ***** Menu Start ***** */}
            <ul className="nav">
                <li><Link to="/" className="active">Home</Link></li>
                <li><Link to="/Contests" className="active">Howdy</Link></li>
                <li><Link to="/Contest" className="active">Portfolio</Link></li>
                {/*<li className="has-sub">
                    <a href="#">Portfolio</a>
                    <ul className="sub-menu">
                        <li><Link to="/contests">Contests</Link></li>
                        <li><Link to="/contest-details">Single Contest</Link></li>
                    </ul>
                </li>*/}
            </ul>
            {/* ***** Logo Start ***** */}
            <Link to="/" className="logo">
                <img src='/assets/images/logo-white.png'
                     alt="Niki Dodge Photography"/>
            </Link>
            {/* ***** Logo End ***** */}
            <ul className="nav">
                <li><Link to="/Categories">Details</Link></li>
                <li><Link to="/users">Blog</Link></li>
                <li><Link to="/users">Contact</Link></li>
            </ul>
            {/*<div className="border-button">
                            <a id="modal_trigger" href="#modal" className="sign-in-up">
                                <i className="fa fa-user"></i> Contact
                            </a>
                        </div>*/}
            <a className="menu-trigger">
                <span>Menu</span>
            </a>
            {/* ***** Menu End ***** */}
        </nav>
    </header>

};

export default Header;
