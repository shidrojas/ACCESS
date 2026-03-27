import React, { useState, useEffect } from 'react';
import '../pages/pages.css';
import projectPlaceholder from '../img/projectplaceholder.png';

function Projects({ setActivePage, setCurrentProject }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('');
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [password, setPassword] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [warning, setWarning] = useState('');

  const [projects, setProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [passwordPopup, setPasswordPopup] = useState(false);
  const [createdPopup, setCreatedPopup] = useState(false);

  const colors = ["card-green", "card-blue", "card-purple", "card-red", "card-yellow"];

  const openModal = (type) => {
    setModalType(type);
    setModalOpen(true);
    setWarning('');
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalType('');
    setProjectName('');
    setProjectDesc('');
    setPassword('');
    setJoinCode('');
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

  useEffect(() => {
    const fetchMyProjects = async () => {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      if (!storedUser) return;

      try {
        const response = await fetch(
          `http://localhost/PMT/api/get_my_projects.php?UserID=${storedUser.UserID}`
        );
        const result = await response.json();

        if (result.status === "success") {
          const projectsWithColor = result.projects.map(proj => ({
            ...proj,
            color: colors[Math.floor(Math.random() * colors.length)]
          }));
          setProjects(projectsWithColor);
        }
      } catch (error) {
        console.error(error);
      }
    };

    fetchMyProjects();
  }, []);

  const handleJoinProject = () => {
    if (!joinCode.trim()) {
      setWarning("Project code is required");
      return;
    }
    // API hook ready
    closeModal();
  };

  return (
    <div className="projects-bg">
      <div className="projects-page">

        <div className="projects-header-section">
          <h1 className="projects-title">Start a New Project</h1>
          <p className="projects-desc">
            Manage all your projects in one place. Create, organize, and track progress with ease.
          </p>

          <div className="projects-actions">
            <button className="btn join" onClick={() => openModal('join')}>
              JOIN PROJECT
            </button>

            {/* ADD NEW PROJECT hidden but logic preserved */}
            <button
              className="btn add"
              style={{ display: "none" }}
              onClick={() => openModal('add')}
            >
              ADD NEW PROJECT
            </button>
          </div>
        </div>

        <div className="recent-projects-section">
          <div
            className="recent-projects-header"
           
          >
            <h2>RECENT PROJECTS</h2>

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

          <div className="project-cards-scroll">
            {filteredProjects.length === 0 ? (
              <div className="projects-placeholder">
                <img src={projectPlaceholder} alt="No projects" />
                <p>"Oops! No projects yet or the one you're looking for doesn't exist."</p>
              </div>
            ) : (
              <div className="project-cards-container">
                {filteredProjects.map((proj, idx) => (
                  <div
                    key={idx}
                    className={`project-card ${proj.color}`}
                    onClick={() => openProjectDashboard(proj)}
                  >
                    <div className="project-owner">{proj.owner || proj.HostName}</div>
                    <div className="project-title">{proj.ProjectName}</div>
                    <div className="project-desc">
                      {proj.Description.length > 50
                        ? proj.Description.slice(0, 47) + "..."
                        : proj.Description}
                    </div>
                    <div className="project-divider"></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* JOIN PROJECT MODAL */}
        {modalOpen && modalType === "join" && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={closeModal}>×</button>

              <h2>JOIN PROJECT</h2>

              <label className="modal-label">Enter Code</label>
              <input
                type="text"
                className={`modal-input ${warning ? "input-error" : ""}`}
                placeholder="Project Code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
              />
              {warning && <p className="input-warning">⚠ {warning}</p>}

              <div className="modal-btn-row">
                <button className="btn cancel" onClick={closeModal}>Cancel</button>
                <button className="btn save" onClick={handleJoinProject}>Confirm</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default Projects;
