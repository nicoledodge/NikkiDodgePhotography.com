import { Link } from "react-router-dom";

const Banner = () => {
    return (
        <div className="main-banner">
            <div className="container">
                <div className="row">
                    <div className="col-lg-10 offset-lg-1">
                        <div className="header-text">
                            <h2>
                                Enter a world of <em>Photos</em> & Amazing <em>Awards</em>
                            </h2>
                            <p>
                                SnapX Photography is a professional website template with 5 different HTML pages for maximum customizations.
                                It is free for commercial usage. This Bootstrap v5.1.3 CSS layout is provided by TemplateMo Free CSS Templates.
                            </p>
                            <div className="buttons">
                                <div className="big-border-button">
                                    <Link to="/contests">Explore SnapX Contest</Link>
                                </div>
                                <div className="icon-button">
                                    <a href="https://youtube.com/templatemo" target="_blank" rel="noopener noreferrer">
                                        <i className="fa fa-play"></i> Watch Our Video Now
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Banner;
