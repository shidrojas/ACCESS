import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../pages/pages.css';
import projectPlaceholder from '../img/projectplaceholder.png';

function Projects({ setActivePage, setCurrentProject }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [warning, setWarning] = useState('');
  const [projects, setProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [projectMembers, setProjectMembers] = useState({});

  // Custom Alert Popup
  const [showAlertPopup, setShowAlertPopup] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState("info");

  const navigate = useNavigate();

  const gradientColors = [
    "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
    "linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)",
    "linear-gradient(135deg, #fddb92 0%, #d1fdff 100%)",
    "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",
    "linear-gradient(135deg, #cfd9df 0%, #e2ebf0 100%)"
  ];

  // Custom alert function
  const showCustomAlert = (message, type = "info") => {
    setAlertMessage(message);
    setAlertType(type);
    setShowAlertPopup(true);
  };

  // Helper function to truncate text
  const truncateText = (text, maxLength = 20) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  // Get initials from name
  const getInitials = (firstName, lastName) => {
    if (!firstName && !lastName) return "?";
    const first = firstName ? firstName.charAt(0).toUpperCase() : '';
    const last = lastName ? lastName.charAt(0).toUpperCase() : '';
    return first + last || first;
  };

  // Fetch member details for a project
  const fetchProjectMembers = async (projectId) => {
    try {
      const response = await fetch(
        `https://accesspmt.bsit3a2025.com/api/general/get_project_members.php?ProjectID=${projectId}`
      );
      const result = await response.json();
      
      if (result.status === "success") {
        const approvedMembers = result.members
          .filter(m => m.ProjectRole !== 'Pending')
          .map(m => ({
            id: m.UserID,
            initials: getInitials(m.FirstName, m.LastName),
            name: `${m.FirstName} ${m.LastName}`,
            role: m.ProjectRole
          }));
        
        return {
          members: approvedMembers,
          count: approvedMembers.length
        };
      }
      return { members: [], count: 0 };
    } catch (error) {
      console.error(`Error fetching members for project ${projectId}:`, error);
      return { members: [], count: 0 };
    }
  };

  // Fetch all project members
  const fetchAllProjectMembers = async (projects) => {
    const membersData = {};
    for (const project of projects) {
      membersData[project.ProjectID] = await fetchProjectMembers(project.ProjectID);
    }
    setProjectMembers(membersData);
  };

  // Fetch projects on component mount
  useEffect(() => {
    fetchProjects();
  }, []);

  const openModal = () => {
    setModalType('join');
    setModalOpen(true);
    setWarning('');
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalType('');
    setJoinCode('');
    setWarning('');
  };

  const openProjectDashboard = (proj) => {
    // Always use the layout's state management when available
    if (setCurrentProject && setActivePage) {
      setCurrentProject(proj);
      setActivePage("ProjectDashboard");
    } else {
      // Fallback to navigation (should not happen in mainLayout)
      navigate("/mainLayout?page=ProjectDashboard", {
        state: { project: proj },
      });
    }
  };

  const filteredProjects = projects.filter(proj =>
    proj.ProjectName && proj.ProjectName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const fetchProjects = async () => {
    setIsLoading(true);
    
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      setIsLoading(false);
      return;
    }

    try {
      const userData = JSON.parse(storedUser);
      const UserID = userData.UserID || userData.user_id || userData.id;
      
      const response = await fetch(
        `https://accesspmt.bsit3a2025.com/api/general/get_my_projects.php?UserID=${UserID}`
      );
      const result = await response.json();

      if (result.status === "success" && result.projects) {
        const projectsWithColor = result.projects.map((proj, index) => ({
          ProjectID: proj.ProjectID,
          ProjectName: proj.ProjectName || "Untitled Project",
          Description: proj.Description || "No description available",
          HostName: proj.HostName || "You",
          owner: proj.HostName || "You",
          Role: proj.Role,
          Code: proj.Code,
          Status: proj.Status,
          createdAt: proj.TimeAgo || "Recently",
          color: proj.color || gradientColors[index % gradientColors.length]
        }));
        
        setProjects(projectsWithColor);
        
        // Fetch members for all projects
        await fetchAllProjectMembers(projectsWithColor);
      } else {
        setProjects([]);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinProject = async () => {
    if (!joinCode.trim()) {
      setWarning("Project code is required");
      return;
    }

    try {
      setIsLoading(true);
      
      const storedUser = localStorage.getItem("user");
      if (!storedUser) {
        setWarning("User not logged in");
        setIsLoading(false);
        return;
      }

      const userData = JSON.parse(storedUser);
      const UserID = userData.UserID || userData.user_id || userData.id;

      const response = await fetch(
        "https://accesspmt.bsit3a2025.com/api/general/join_project.php",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            UserID: UserID,
            Code: joinCode,
          }),
        }
      );

      const result = await response.json();

      if (result.status === "success") {
        closeModal();
        fetchProjects(); // Refresh the project list
        showCustomAlert("Successfully joined the project!", "success");
      } else {
        setWarning(result.message || "Failed to join project");
      }
    } catch (error) {
      console.error("Error joining project:", error);
      setWarning("Server error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="projects-bg">
      {/* Custom Alert Popup */}
      {showAlertPopup && (
        <div className="modern-popup-overlay">
          <div className="modern-popup" style={{ maxWidth: "400px" }}>
            <div className={`modern-popup-header ${alertType}`} style={{
              background: alertType === "success" 
                ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                : alertType === "error"
                ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
                : alertType === "warning"
                ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                : "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"
            }}>
              <h3>
                {alertType === "success" && "✓ Success"}
                {alertType === "error" && "✗ Error"}
                {alertType === "warning" && "⚠ Warning"}
                {alertType === "info" && "ℹ Information"}
              </h3>
            </div>
            <div className="modern-popup-content" style={{ textAlign: "center" }}>
              <p style={{ fontSize: "1rem", margin: "20px 0", color: "#374151" }}>
                {alertMessage}
              </p>
            </div>
            <div className="modern-popup-footer centered">
              <button 
                className="modern-btn modern-btn-primary" 
                onClick={() => setShowAlertPopup(false)}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="projects-page">

        <div className="projects-header-section">
          <h1 className="projects-title">Join a Project</h1>
          <p className="projects-desc">
            Enter a project code to join an existing project and start collaborating with your team.
          </p>

          <div className="projects-actions">
            <button className="btn join" onClick={openModal}>
              JOIN PROJECT
            </button>
          </div>
        </div>

        <div className="recent-projects-section">
          <div className="recent-projects-header">
            <h2 className="recent-projects-title">YOUR PROJECTS {isLoading && <span className="loading-text">(Loading...)</span>}</h2>

            <div className="search-bar">
              <input
                type="search"
                className="search-input"
                placeholder="Find your projects"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={projects.length === 0}
              />
              <button className="search-submit" disabled={projects.length === 0}>
                <i className="fa-solid fa-magnifying-glass"></i>
              </button>
            </div>
          </div>

          <div className="project-cards-scroll">
            {isLoading ? (
              <div className="projects-placeholder">
                <p>Loading projects...</p>
              </div>
            ) : projects.length === 0 ? (
              <div className="projects-placeholder">
                <img src={projectPlaceholder} alt="No projects" />
                <p>You haven't joined any projects yet. Click 'JOIN PROJECT' to get started!</p>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="projects-placeholder">
                <img src={projectPlaceholder} alt="No matching projects" />
                <p>No projects match your search.</p>
              </div>
            ) : (
              <div className="project-cards-container-new">
                {filteredProjects.map((proj) => (
                  <div
                    key={proj.ProjectID}
                    className="project-card-wrapper"
                    onClick={() => openProjectDashboard(proj)}
                  >
                    <div className="project-new-card">
                      {/* Colored header */}
                      <div 
                        className="project-new-header"
                        style={{ background: proj.color }}
                      >
                        {/* Owner badge */}
                        <div className="project-new-owner-badge">
                          <span title={proj.HostName || proj.owner || "You"}>
                            {truncateText(proj.HostName || proj.owner || "You", 15)}
                          </span>
                        </div>

                        {/* Time label */}
                        <div className="project-new-time" title={proj.createdAt}>
                          {truncateText(proj.createdAt, 10)}
                        </div>
                      </div>

                      {/* White content area */}
                      <div className="project-new-content">
                        {/* SVG notch cutout */}
                        <div className="project-new-notch">
                          <svg
                            viewBox="0 0 360 40"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            preserveAspectRatio="none"
                          >
                            <path
                              d="M0 0 L0 40 L260 40 C260 40 230 20 200 0 L0 0"
                              className="project-new-notch-fill"
                            />
                          </svg>
                        </div>

                        {/* Body text */}
                        <div className="project-new-body">
                          <h3 className="project-new-title" title={proj.ProjectName}>
                            {truncateText(proj.ProjectName, 20)}
                          </h3>
                          <p className="project-new-desc" title={proj.Description || "No description"}>
                            {truncateText(proj.Description || "No description", 35)}
                          </p>
                        </div>

                        {/* Footer with member avatars */}
                        <div className="project-new-footer">
                          <div className="project-new-avatars">
                            <div className="project-new-avatar-stack">
                              {projectMembers[proj.ProjectID]?.members?.slice(0, 3).map((member, idx) => (
                                <div 
                                  key={member.id} 
                                  className="project-new-avatar"
                                  style={{ 
                                    backgroundColor: `hsl(${(member.id * 30) % 360}, 70%, 35%)`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontSize: '10px',
                                    fontWeight: 'bold',
                                    marginLeft: idx > 0 ? '-8px' : '0',
                                    zIndex: 3 - idx
                                  }}
                                  title={member.name}
                                >
                                  {member.initials}
                                </div>
                              ))}
                            </div>
                            {projectMembers[proj.ProjectID]?.count > 3 && (
                              <span className="project-new-member-count">
                                +{projectMembers[proj.ProjectID].count - 3}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* JOIN PROJECT MODAL - Modern Design */}
        {modalOpen && (
          <div className="modern-popup-overlay" onClick={closeModal}>
            <div className="modern-popup" onClick={(e) => e.stopPropagation()}>
              <div className="modern-popup-header">
                <h3>🔗 Join Project</h3>
                <p>Enter the project code to join an existing project</p>
              </div>
              <div className="modern-popup-content">
                <div className="form-group">
                  <label>Project Code</label>
                  <input
                    type="text"
                    className={`${warning ? "input-error" : ""}`}
                    placeholder="Enter project code"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    disabled={isLoading}
                    autoFocus
                  />
                </div>
                {warning && (
                  <div className="info-box" style={{ background: "#fef3c7", borderLeftColor: "#f59e0b" }}>
                    <p style={{ color: "#92400e" }}>⚠ {warning}</p>
                  </div>
                )}
              </div>
              <div className="modern-popup-footer double-buttons">
                <button className="modern-btn modern-btn-secondary" onClick={closeModal} disabled={isLoading}>
                  Cancel
                </button>
                <button 
                  className="modern-btn modern-btn-primary" 
                  onClick={handleJoinProject} 
                  disabled={isLoading}
                >
                  {isLoading ? "Joining..." : "Join Project"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default Projects;