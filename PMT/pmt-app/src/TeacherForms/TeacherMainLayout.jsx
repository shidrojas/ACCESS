import React, { useState } from "react";
import Sidebar from "../navigationbar/sidebar";
import Navbar2 from "../navigationbar/navbar2";
import "../pages/pages.css";

import TeacherDashboard from "../TeacherForms/TeacherDashboard";
import TeacherProjects from "../TeacherForms/TeacherProjects";
import TeacherSettings from "../TeacherForms/TeacherSettings";
import TeacherArchives from "../TeacherForms/TeacherArchives";
import TeacherProjectDashboard from "../TeacherForms/TeacherProjectForms/TeacherProjectDashboard";

function TeacherMainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activePage, setActivePage] = useState("Dashboard");
  const [selectedProject, setSelectedProject] = useState(null);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const renderPage = () => {
    switch (activePage) {
      case "Dashboard":
        return (
          <TeacherDashboard 
            setActivePage={setActivePage}
            setSelectedProject={setSelectedProject}
          />
        );

      case "Projects":
        return (
          <TeacherProjects
            setActivePage={setActivePage}
            setSelectedProject={setSelectedProject}
          />
        );

      case "ProjectDashboard":
        return (
          <TeacherProjectDashboard
            project={selectedProject}
            setActivePage={setActivePage}
          />
        );

      case "Archives":
        return (
          <TeacherArchives 
            setActivePage={setActivePage}
            setSelectedProject={setSelectedProject}
          />
        );

      case "Settings":
      case "Profile Settings":
        return <TeacherSettings />;

      default:
        return <TeacherDashboard 
          setActivePage={setActivePage}
          setSelectedProject={setSelectedProject}
        />;
    }
  };

  return (
    <div className="dashboard-container" style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* Sidebar - fixed, no scroll */}
      <Sidebar
        isOpen={sidebarOpen}
        setActivePage={setActivePage}
        activePage={activePage}
      />

      {/* Main content area - this will scroll independently */}
      <div className="main-content" style={{ 
        flex: 1, 
        display: "flex", 
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden"
      }}>
        {/* Navbar - fixed at top */}
        <Navbar2
          toggleSidebar={toggleSidebar}
          activePage={activePage}
          sidebarOpen={sidebarOpen}
        />

        {/* Content area - this is the only part that scrolls */}
        <div className="content-area" style={{ 
          flex: 1, 
          overflowY: "auto",
          overflowX: "hidden"
        }}>
          {renderPage()}
        </div>
      </div>
    </div>
  );
}

export default TeacherMainLayout;