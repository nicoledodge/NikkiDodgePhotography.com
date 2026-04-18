
import {Link} from "react-router-dom";
import {CONTACT} from "../../pages/Contact";
import {PORTFOLIO} from "../../pages/Portfolio";

const Banner = () => {
    return (
        <section className="main-banner">
            <div className="container">
                <div className="row justify-content-center">
                    <div className="col-lg-10">
                        <h2>
                            Colorado photography that feels <em>personal</em>, calm, and worth remembering.
                        </h2>
                        <p>
                            Nikki photographs weddings, engagements, graduates, families, and creative brands with a
                            candid-first approach that keeps the day feeling like yours. The site should do one thing
                            well: help the right clients see the work, trust the process, and reach out.
                        </p>
                        <div className="buttons">
                            <div className="big-border-button">
                                <Link to={PORTFOLIO}>View The Portfolio</Link>
                            </div>
                            <div className="icon-button">
                                <Link to={CONTACT}>
                                    <i className="fa fa-envelope"></i>
                                    Start Your Inquiry
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Banner;
