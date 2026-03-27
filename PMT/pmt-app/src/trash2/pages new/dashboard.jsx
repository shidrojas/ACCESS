import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; // import useNavigate
import "../pages/pages.css";
import placeholderImg from "../img/placeholder-projects.png";
import analyticsIcon from "../img/analyticsicon.jpg";
import projectsIcon from "../img/prjctandtask.jpg";

function Dashboard() {
  const [activeTopTab, setActiveTopTab] = useState("projects");
  const [activeTaskTab, setActiveTaskTab] = useState("assigned");
  const [userName, setUserName] = useState("JOHN JUAN DOE");

  const navigate = useNavigate(); // initialize navigate

  return (
    <div className="dashboard">
      {/* USER HEADER */}
      <div className="dashboard-user">
        <h2>{userName}</h2>
        <p>johndoe@gmail.com | Student</p>
      </div>

      {/* MINI NAVBAR */}
      <div className="dashboard-mini-nav">
        <button
          className={activeTopTab === "projects" ? "active" : ""}
          onClick={() => setActiveTopTab("projects")}
        >
          <img src={projectsIcon} alt="Projects Icon" className="mini-nav-icon" />
          PROJECTS & TASKS
        </button>
        <button
          className={activeTopTab === "analytics" ? "active" : ""}
          onClick={() => setActiveTopTab("analytics")}
        >
          <img src={analyticsIcon} alt="Analytics Icon" className="mini-nav-icon" />
          ANALYTICS & REPORTS
        </button>
      </div>

      {/* CONDITIONAL RENDERING */}
      {activeTopTab === "projects" ? (
        <>
          {/* RECENT PROJECTS */}
          <div className="dashboard-section">
            <div className="section-header">
              <h4>RECENT PROJECTS</h4>
              <div className="section-actions">
                <a href="#">VIEW ALL PROJECTS</a>
              </div>
            </div>

            <div className="projects-placeholder">
              <img src={placeholderImg} alt="placeholder" />
              <p>No projects found. Join a project to get started.</p>
            </div>

            {/* NEW BUTTON TO NAVIGATE */}
            <div className="project-dashboard-btn">
              <button onClick={() => navigate("/projectdashboard")}>
                Go to Project Dashboard
              </button>
            </div>
          </div>

          {/* TASK TABS */}
          <div className="task-tabs">
            {["assigned", "progress", "review", "activities"].map((tab) => (
              <button
                key={tab}
                className={activeTaskTab === tab ? "active" : ""}
                onClick={() => setActiveTaskTab(tab)}
              >
                {tab === "assigned" && "ASSIGNED TO YOU"}
                {tab === "progress" && "IN PROGRESS"}
                {tab === "review" && "FOR REVIEW"}
                {tab === "activities" && "ACTIVITIES"}
              </button>
            ))}
            <a href="#" className="view-all">
              VIEW ALL
            </a>
          </div>

          {/* TASK TABLE */}
          <table className="task-table">
            <thead>
              <tr>
                <th>TITLE</th>
                <th>PROJECT</th>
                <th>CREATION DATE</th>
                <th>CREATED BY</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>SAMPLE PROJECT 1: SAMPLE TASK</td>
                <td className="tag orange">APARTMENT RENTAL</td>
                <td>01/01/2025</td>
                <td>JOHN JUAN DOE</td>
              </tr>
              <tr>
                <td>SAMPLE PROJECT 2: CREATE LANDING PAGE</td>
                <td className="tag green">PET GROOMING</td>
                <td>01/01/2025</td>
                <td>JOHN JUAN DOE</td>
              </tr>
            </tbody>
          </table>
        </>
      ) : (
        /* ANALYTICS & REPORTS SECTION */
        <div className="analytics-wrapper">
          <div className="analytics-stats">
            <div className="stat-card highlight">
              <div className="stat-number">113</div>
              <div className="stat-label">COMPLETED</div>
              <div className="stat-description">
                Completed tasks in every project
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-number">14</div>
              <div className="stat-label">PROJECTS</div>
              <div className="stat-description">
                Created and Collaborated projects
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-number">10</div>
              <div className="stat-label">ASSIGNED</div>
              <div className="stat-description">Assigned tasks to you</div>
            </div>
          </div>

          <div className="analytics-charts">
            <div className="chart-box"></div>
            <div className="chart-box"></div>
          </div>

          <div className="analytics-report-box"></div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
