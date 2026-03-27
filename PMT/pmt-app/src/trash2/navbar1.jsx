import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import '../navigationbar/navbar.css';
import logo from '../img/logo2.png';

function Navbar({ scrollTo }) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleClick = (id) => {
    if (location.pathname === '/') {
      // Already on home page, scroll to section
      scrollTo && scrollTo(id);
    } else {
      // Navigate to home and pass section id
      navigate('/', { state: { scrollTo: id } });
    }
  };

  return (
    <nav className="navbar">
      <div className="logo">
        <img src={logo} alt="Logo" style={{ width: "50px", height: "auto" }} />
      </div>

      <ul className="nav-center">
        <li><button className="nav-center-btn" onClick={() => handleClick('home')}>Home</button></li>
        <li><button className="nav-center-btn" onClick={() => handleClick('contents')}>Contents</button></li>
        <li><button className="nav-center-btn" onClick={() => handleClick('about')}>About Us</button></li>
        <li><button className="nav-center-btn" onClick={() => handleClick('updates')}>Updates</button></li>
      </ul>

      <ul className="nav-right">
        <li><Link to="/login">Log In</Link></li>
        <li><Link to="/register">Register</Link></li>
      </ul>
    </nav>
  );
}

export default Navbar;
