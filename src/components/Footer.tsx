const Footer = () => {
    const currentYear = new Date().getFullYear();
    return (
        <footer>
            <div className="container">
                <div className="row">
                    <div className="col-lg-12">
                        <p>
                            Copyright © {currentYear} <a href="#">Nicole Dodge</a>, DBA. All rights reserved.
                            <br />
                            Design: <a title="CSS Templates" rel="sponsored" href="https://templatemo.com/page/1" target="_blank">TemplateMo</a>
                            Distribution: <a title="CSS Templates" rel="sponsored" href="https://themewagon.com" target="_blank">ThemeWagon</a>
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
};
export default Footer