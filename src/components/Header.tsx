import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

const links = [
  { to: "/Portfolio", label: "Portfolio" },
  { to: "/howdy", label: "Meet Nikki" },
  { to: "/pricing", label: "Experience & pricing" },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const toggleRef = useRef<HTMLButtonElement>(null);
  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open]);
  return (
    <header className="site-header">
      <div className="site-container header-inner">
        <Link
          className="wordmark"
          to="/"
          aria-label="Nikki Dodge Photography home"
        >
          <span className="brand-logo">
            <img
              src="/assets/editorial/nikki-dodge-logo.png"
              alt="Nikki Dodge Photography"
              width="2172"
              height="724"
            />
          </span>
        </Link>
        <button
          ref={toggleRef}
          className="menu-toggle"
          type="button"
          aria-expanded={open}
          aria-controls="site-navigation"
          onClick={() => setOpen(!open)}
        >
          {open ? "Close" : "Menu"}{" "}
          <span aria-hidden="true">{open ? "×" : "+"}</span>
        </button>
        <nav
          id="site-navigation"
          className={`site-nav${open ? " is-open" : ""}`}
          aria-label="Main navigation"
        >
          {links.map((link) => (
            <NavLink onClick={() => setOpen(false)} key={link.to} to={link.to}>
              {link.label}
            </NavLink>
          ))}
          <NavLink
            onClick={() => setOpen(false)}
            className="nav-inquire"
            to="/Contact"
          >
            Inquire <span aria-hidden="true">↗</span>
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
