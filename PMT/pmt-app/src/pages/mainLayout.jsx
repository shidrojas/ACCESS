import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "../navigationbar/sidebar";
import Navbar2 from "../navigationbar/navbar2";
import "../pages/pages.css";
import DashboardPage from "../pages/dashboard";
import Projects from "../pages/projects";
import Settings from "../pages/settings";
import Archives from "../pages/archives";
// Import the TeacherProjectDashboard
import TeacherProjectDashboard from "../TeacherForms/TeacherProjectForms/TeacherProjectDashboard";

function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activePage, setActivePage] = useState("Dashboard");
  const [selectedProject, setSelectedProject] = useState(null);
  const location = useLocation();

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  // Check for project in navigation state when component mounts or location changes
  useEffect(() => {
    if (location.state?.project) {
      setSelectedProject(location.state.project);
      setActivePage("ProjectDashboard");
      // Clear the state to prevent re-triggering
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const renderPage = () => {
    switch (activePage) {
      case "Dashboard":
        return <DashboardPage setActivePage={setActivePage} />;

      case "Projects":
        return (
          <Projects 
            setActivePage={setActivePage} 
            setCurrentProject={setSelectedProject}
          />
        );

      case "ProjectDashboard":
        // For students viewing projects (active or archived)
        return <TeacherProjectDashboard project={selectedProject} />;

      case "Profile Settings":
        return <Settings />;

      case "Archives":
        return <Archives />;

      default:
        return <DashboardPage setActivePage={setActivePage} />;
    }
  };

  return (
    <div 
      className="dashboard-container" 
      style={{ 
        display: "flex", 
        height: "100vh", 
        overflow: "hidden" 
      }}
    >
      {/* Sidebar - fixed, no scroll */}
      <Sidebar
        isOpen={sidebarOpen}
        setActivePage={setActivePage}
        activePage={activePage}
      />

      {/* Main content area - this will scroll independently */}
      <div 
        className="main-content" 
        style={{ 
          flex: 1, 
          display: "flex", 
          flexDirection: "column",
          height: "100vh",
          overflow: "hidden"
        }}
      >
        {/* Navbar - fixed at top */}
        <Navbar2
          toggleSidebar={toggleSidebar}
          activePage={activePage}
          sidebarOpen={sidebarOpen}
        />

        {/* Content area - this is the only part that scrolls */}
        <div 
          className="content-area" 
          style={{ 
            flex: 1, 
            overflowY: "auto",
            overflowX: "hidden"
          }}
        >
          {renderPage()}
        </div>
      </div>
    </div>
  );
}

export default MainLayout;