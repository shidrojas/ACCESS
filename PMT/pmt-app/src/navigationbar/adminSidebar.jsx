// Sidebar.jsx
import React from "react";
import { MdDashboard, MdSettings, MdPeople, MdReceiptLong } from "react-icons/md";
import "../navigationbar/navbar.css";
import logo from "../img/logo2.png";

export default function Sidebar({ isOpen, setActivePage, activePage }) {
  const sections = [
    {
      title: "Admin Panel",
      items: [
        { name: "Dashboard", icon: <MdDashboard /> },
        { name: "User Management", icon: <MdPeople /> },
        { name: "Logs", icon: <MdReceiptLong /> },
        { name: "Profile Settings", icon: <MdSettings /> },
      ],
    },
  ];

  return (
    <div className={`sidebar ${isOpen ? "open" : "closed"}`}>
      {/* TOP */}
      <div className="sidebar-top">
        <img src={logo} alt="Logo" className="sidebar-logo" />

        {isOpen && (
          <div className="project-titles">
            <span className="project-name">CONTROL V1.0</span>
            <span className="project-subtitle">PMS ADMIN MANAGEMENT</span>
          </div>
        )}
      </div>

      {/* MENU */}
      {sections.map((section, idx) => (
        <div key={idx} className="sidebar-section">
          {isOpen && <h4 className="section-title">{section.title}</h4>}

          <ul className="menu">
            {section.items.map((item, index) => (
              <li
                key={index}
                className={`menu-item ${
                  activePage === item.name ? "active" : ""
                }`}
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
