import { Link } from "react-router-dom";
import { useSiteSettings } from "../site/SiteSettingsContext";

export default function Footer() {
  const { siteSettings } = useSiteSettings();
  return (
    <footer className="site-footer">
      <div className="site-container">
        <div className="footer-top">
          <div>
            <p className="eyebrow">Your next chapter</p>
            <h2>
              Let’s make something
              <br />
              <em>worth keeping.</em>
            </h2>
          </div>
          <Link className="footer-inquire" to="/Contact">
            Tell me your story <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <div className="footer-bottom">
          <div>
            <Link
              className="footer-brand"
              to="/"
              aria-label="Nikki Dodge Photography home"
            >
              <span className="brand-logo brand-logo--inverse">
                <img
                  src="/assets/editorial/nikki-dodge-logo.png"
                  alt="Nikki Dodge Photography"
                  width="2172"
                  height="724"
                />
              </span>
            </Link>
            <p>Colorado & wherever your story goes.</p>
          </div>
          <nav aria-label="Footer navigation">
            <Link to="/Portfolio">Portfolio</Link>
            <Link to="/howdy">About</Link>
            <Link to="/pricing">Pricing</Link>
            <Link to="/blog">Field notes</Link>
            <Link to="/Contact">Inquire</Link>
          </nav>
          <div className="footer-contact">
            <a href={`mailto:${siteSettings.contactEmail}`}>
              {siteSettings.contactEmail}
            </a>
            <a
              href={siteSettings.instagramUrl}
              target="_blank"
              rel="noreferrer"
            >
              Follow along on Instagram ↗
            </a>
          </div>
        </div>
        <div className="footer-colophon">
          <span>© {new Date().getFullYear()} Nikki Dodge Photography</span>
          <span>Honest moments. Thoughtfully photographed.</span>
          <a href="#main-content">Back to top ↑</a>
        </div>
      </div>
    </footer>
  );
}
