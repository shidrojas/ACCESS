import React, { useState, useEffect } from 'react';
import '../pages/pages.css';
import projectPlaceholder from '../img/projectplaceholder.png';

function Projects({ setActivePage, setCurrentProject }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('');
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [password, setPassword] = useState('');
  const [warning, setWarning] = useState('');

  const [projects, setProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [passwordPopup, setPasswordPopup] = useState(false);
  const [createdPopup, setCreatedPopup] = useState(false);

  const colors = ["card-green", "card-blue", "card-purple", "card-red", "card-yellow"];

  // Open and close modal
  const openModal = (type) => {
    setModalType(type);
    setModalOpen(true);
    setPasswordPopup(false);
    setCreatedPopup(false);
    setWarning('');
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalType('');
    setProjectName('');
    setProjectDesc('');
    setPassword('');
    setWarning('');
    setPasswordPopup(false);
    setCreatedPopup(false);
  };

  const openProjectDashboard = (proj) => {
    if (setCurrentProject) setCurrentProject(proj);
    setActivePage("ProjectDashboard");
  };

  const filteredProjects = projects.filter(proj =>
    proj.ProjectName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Fetch all projects where user belongs
  useEffect(() => {
    const fetchMyProjects = async () => {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      if (!storedUser) return;

      try {
        const response = await fetch(`http://localhost/PMT/api/get_my_projects.php?UserID=${storedUser.UserID}`);
        const result = await response.json();

        if (result.status === "success") {
          // Assign random colors for cards
          const projectsWithColor = result.projects.map(proj => ({
            ...proj,
            color: colors[Math.floor(Math.random() * colors.length)]
          }));
          setProjects(projectsWithColor);
        } else {
          console.error("Error fetching projects:", result.message);
        }
      } catch (error) {
        console.error("Failed to fetch projects:", error);
      }
    };

    fetchMyProjects();
  }, []);

  // Create project API
  const createProject = async (usePassword = true) => {
    setWarning('');

    if (!projectName.trim()) return setWarning("Your New project must have a name!");
    if (!projectDesc.trim()) return setWarning("Project description is required!");

    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser) return setWarning("User not logged in!");

    try {
      const response = await fetch("http://localhost/PMT/api/create_project.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          UserID: storedUser.UserID,
          ProjectName: projectName,
          Description: projectDesc,
          Password: usePassword ? password : null
        }),
      });

      const result = await response.json();

      if (result.status === "success") {
        const newProject = {
          ProjectID: result.project.ProjectID,
          owner: storedUser.FullName || "You",
          ProjectName: result.project.ProjectName,
          Description: result.project.Description,
          members: 1,
          timeAgo: "Just now",
          color: colors[Math.floor(Math.random() * colors.length)],
        };

        setProjects([newProject, ...projects]);
        setCreatedPopup(true);
        setPasswordPopup(false);
      } else {
        setWarning(result.message || "Failed to create project");
      }
    } catch (error) {
      console.error("Create project error:", error);
      setWarning("Failed to create project. Try again later.");
    }
  };

  const handleSave = () => {
    if (!password.trim()) {
      setPasswordPopup(true);
    } else {
      createProject(true);
    }
  };

  const handleContinueWithoutPassword = () => {
    createProject(false);
  };

  return (
    <div className="projects-bg">
      <div className="projects-page">

        <h1 className="projects-title">Start a New Project</h1>
        <p className="projects-desc">
          Manage all your projects in one place. Create, organize, and track <br />progress with ease.
        </p>

        <div className="projects-actions">
          <button className="btn join" onClick={() => openModal('join')}>JOIN A PROJECT</button>
          <button className="btn add" onClick={() => openModal('add')}>ADD NEW PROJECT</button>
        </div>

        <div className="recent-projects-section">
          <div className="recent-projects-header">
            <span>RECENT PROJECTS</span>
            <div className="search-bar">
              <input
                type="search"
                className="search-input"
                placeholder="Find your projects"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button className="search-submit">
                <i className="fa-solid fa-magnifying-glass"></i>
              </button>
            </div>
          </div>

          <div className="section-divider2"></div>

          <div className="project-cards-scroll">
            {filteredProjects.length === 0 ? (
              <div className="projects-placeholder">
                <img src={projectPlaceholder} alt="No projects" className="projects-placeholder-img" />
                <p>"Oops! No projects yet or the one you’re looking for doesn’t exist."</p>
              </div>
            ) : (
              <div className="project-cards-container">
                {filteredProjects.map((proj, idx) => (
                  <div
                    className={`project-card ${proj.color}`}
                    key={idx}
                    onClick={() => openProjectDashboard(proj)}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="project-owner">{proj.owner || proj.HostName}</div>
                    <div className="project-title">{proj.ProjectName}</div>
                    <div className="project-desc">
                      {proj.Description.length > 50
                        ? proj.Description.slice(0, 47) + "..."
                        : proj.Description}
                    </div>
                    <div className="project-divider"></div>
                    <div className="project-footer">
                      <span className="project-time">{proj.timeAgo || "Just now"}</span>
                      <span className="project-members">
                        <svg width="45" height="28">
                          <circle cx="14" cy="14" r="10" fill="#cfd8dc" />
                          <circle cx="23" cy="14" r="10" fill="#b0bec5" />
                          <circle cx="32" cy="14" r="10" fill="#78909c" />
                        </svg>
                      </span>
                      <span className="project-folder">
                        <svg width="28" height="22">
                          <rect x="3" y="8" width="22" height="9" rx="2" fill="#23282D" />
                          <rect x="1" y="4" width="26" height="5" rx="2" fill="#23282D" />
                        </svg>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* MODALS */}
        {modalOpen && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={closeModal}>×</button>

              {modalType === "add" && (
                <>
                  <h2>CREATE PROJECT</h2>

                  <label className="modal-label">Project Name</label>
                  <input
                    type="text"
                    className={`modal-input ${warning.includes("name") ? "input-error" : ""}`}
                    placeholder="Enter the name of the project"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                  />
                  {warning.includes("name") && <p className="input-warning">⚠ {warning}</p>}

                  <label className="modal-label">Project Description</label>
                  <textarea
                    className={`modal-textarea ${warning.includes("description") ? "input-error" : ""}`}
                    placeholder="Enter the project description"
                    value={projectDesc}
                    onChange={(e) => setProjectDesc(e.target.value)}
                  />
                  {warning.includes("description") && <p className="input-warning">⚠ {warning}</p>}

                  <label className="modal-label">Password</label>
                  <input
                    type="password"
                    className="modal-input"
                    placeholder="*******************"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />

                  <div className="modal-btn-row">
                    <button className="btn cancel" onClick={closeModal}>CANCEL</button>
                    <button className="btn save" onClick={handleSave}>SAVE</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {passwordPopup && (
          <div className="modal-overlay">
            <div className="small-popup">
              <h3>No Password?</h3>
              <p>You're creating this project without a password. Continue?</p>
              <div className="popup-btn-row">
                <button className="btn cancel" onClick={() => setPasswordPopup(false)}>Cancel</button>
                <button className="btn save" onClick={handleContinueWithoutPassword}>Continue</button>
              </div>
            </div>
          </div>
        )}

        {createdPopup && (
          <div className="modal-overlay">
            <div className="small-popup">
              <h3>Project Created!</h3>
              <p>Your project has been successfully added.</p>
              <button className="btn save" onClick={closeModal}>OK</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default Projects;
