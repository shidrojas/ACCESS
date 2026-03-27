import React, { useState } from "react";
import Sidebar from "../navigationbar/sidebar";
import Navbar2 from "../navigationbar/navbar2";
import "../pages/pages.css";
import DashboardPage from "../pages/dashboard";
import Projects from "../pages/projects";
import Settings from "../pages/settings";
import ProjectDashboard from "../ProjectForms/projectdashboard"; 

function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activePage, setActivePage] = useState("Dashboard");

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const renderPage = () => {
    switch (activePage) {
      case "Dashboard":
        return <DashboardPage />;

      case "Projects":
        return <Projects setActivePage={setActivePage} />; 

      case "Settings":
        return <Settings />;

    

      case "ProjectDashboard": 
        return <ProjectDashboard />;

      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="dashboard-container" style={{ display: "flex", height: "100vh" }}>
      <Sidebar
        isOpen={sidebarOpen}
        setActivePage={setActivePage}
        activePage={activePage}
      />

      <div className="main-content" style={{ flex: 1 }}>
        <Navbar2
          toggleSidebar={toggleSidebar}
          activePage={activePage}
          sidebarOpen={sidebarOpen}
        />

        <div className="content-area">
          {renderPage()}
        </div>
      </div>
    </div>
  );
}

export default MainLayout;