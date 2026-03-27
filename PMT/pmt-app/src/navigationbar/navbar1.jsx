import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import '../navigationbar/navbar.css';
import logoDefault from '../img/logo2.png';
import logoScrolled from '../img/logo1.png';

function Navbar({ setActivePage }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleNavClick = (index) => {
    if (location.pathname !== "/") {
      navigate("/", { state: { slideTo: index } });
    } else if (typeof setActivePage === "function") {
      setActivePage(index);
    }
  };

  return (
    <nav className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
      <div className="navbar-container">
        <div className="navbar-brand">
          <img
            src={scrolled ? logoScrolled : logoDefault}
            alt="Logo"
            className="navbar-logo"
          />
          <span className="navbar-brand-text">
            Access<span className="navbar-brand-dot">.</span>
          </span>
        </div>

        <div className="nav-left">
          <button
            className={`nav-left-btn ${location.pathname === "/" ? 'active' : ''}`}
            onClick={() => handleNavClick(0)}
          >
            Home
          </button>

          <button
            className={`nav-left-btn ${location.pathname === "/features" ? 'active' : ''}`}
            onClick={() => handleNavClick(1)}
          >
            Features
          </button>
        </div>

        <div className="nav-right">
          <Link to="/login" className="nav-right-link">
            Log In
          </Link>

          <Link to="/register" className="nav-right-link nav-register">
            Register
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
