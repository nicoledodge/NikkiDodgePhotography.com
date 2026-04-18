const Footer = () => {
    const currentYear = new Date().getFullYear();
    return (
        <footer>
            <div className="container">
                <div className="row">
                    <div className="col-lg-12">
                        <p>
                            Copyright © {currentYear} Nikki Dodge Photography. Serving Highlands Ranch, Denver, and
                            Colorado destination clients.
                            <br />
                            <a href="mailto:nicole@nikkidodgephotography.com">nicole@nikkidodgephotography.com</a>
                            {" · "}
                            <a href="tel:972-523-3420">972-523-3420</a>
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
};
export default Footer
