// Sidebar.jsx
import React from "react";
import { MdDashboard, MdWorkOutline, MdSettings, MdPerson, MdArchive } from "react-icons/md";
import "../navigationbar/navbar.css";
import logo from "../img/logo2.png";
import { FaBell } from "react-icons/fa";
export default function Sidebar({ isOpen, setActivePage, activePage }) {
  const sections = [
    {
      title: "Tools",
      items: [
        { name: "Dashboard", icon: <MdDashboard /> },
        { name: "Projects", icon: <MdWorkOutline /> },
      ],
    },
    {
      title: "Profile Settings",
      items: [
        { name: "Profile Settings", icon: <MdSettings /> },
        { name: "Archives", icon: <MdArchive /> },
      ],
    },
  ];

  return (
    <div className={`sidebar ${isOpen ? "open" : "closed"}`}>
      <div className="sidebar-top">
        <img src={logo} alt="Logo" className="sidebar-logo" />

        {isOpen && (
          <div className="project-titles">
            <span className="project-name">ACCESS</span>
            <span className="project-subtitle">PROJECT MANAGEMENT TOOL</span>
            <span className="project-subtitle">V1.0</span>
          </div>
        )}
      </div>

      {sections.map((section, idx) => (
        <div key={idx} className="sidebar-section">
          {isOpen && <h4 className="section-title">{section.title}</h4>}

          <ul className="menu">
            {section.items.map((item, index) => (
              <li
                key={index}
                className={`menu-item ${activePage === item.name ? "active" : ""}`}
                onClick={() => setActivePage(item.name)}
              >
                {item.icon}
                {isOpen && <span className="menu-text">{item.name}</span>}
              </li>
            ))}
          </ul>
         
        </div>
      ))}
    </div>
  );
}
