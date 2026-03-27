import React, { useState, useEffect } from 'react';
import '../TeacherForms/teacher.css';
import projectPlaceholder from '../img/projectplaceholder.png';

function TeacherProjects({ setActivePage, setSelectedProject }) {
  const [teacherModalOpen, setTeacherModalOpen] = useState(false);
  const [teacherModalType, setTeacherModalType] = useState('');
  const [teacherProjectName, setTeacherProjectName] = useState('');
  const [teacherProjectDesc, setTeacherProjectDesc] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');
  const [teacherJoinCode, setTeacherJoinCode] = useState('');
  const [teacherWarning, setTeacherWarning] = useState('');
  const [teacherProjectColor, setTeacherProjectColor] = useState(
    'linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [teacherProjects, setTeacherProjects] = useState([]);
  const [teacherSearchQuery, setTeacherSearchQuery] = useState('');

  const gradientColors = [
    "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
    "linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)",
    "linear-gradient(135deg, #fddb92 0%, #d1fdff 100%)",
    "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",
    "linear-gradient(135deg, #cfd9df 0%, #e2ebf0 100%)"
  ];

  // Fetch projects on component mount
  useEffect(() => {
    fetchTeacherProjects();
  }, []);

  const openTeacherModal = (type) => {
    setTeacherModalType(type);
    setTeacherModalOpen(true);
    setTeacherWarning('');
  };

  const closeTeacherModal = () => {
    setTeacherModalOpen(false);
    setTeacherModalType('');
    setTeacherProjectName('');
    setTeacherProjectDesc('');
    setTeacherPassword('');
    setTeacherJoinCode('');
    setTeacherWarning('');
    setTeacherProjectColor(gradientColors[0]);
  };

  const filteredTeacherProjects = teacherProjects.filter(proj =>
    proj.ProjectName && proj.ProjectName.toLowerCase().includes(teacherSearchQuery.toLowerCase())
  );

    const fetchTeacherProjects = async () => {
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
          `http://localhost/PMT/api/general/get_my_projects.php?UserID=${UserID}`
        );
        const result = await response.json();

        if (result.status === "success" && result.projects) {
          // Use the color from database, no need to assign locally
          const projectsWithColor = result.projects.map((proj) => ({
            ProjectID: proj.ProjectID,
            ProjectName: proj.ProjectName || "Untitled Project",
            Description: proj.Description || "No description available",
            HostName: proj.HostName || "You",
            owner: proj.HostName || "You",
            Role: proj.Role,
            Code: proj.Code,
            Status: proj.Status,
            createdAt: proj.TimeAgo || "Recently",
            color: proj.color || gradientColors[0] // Use color from DB or fallback to first gradient
          }));
          
          setTeacherProjects(projectsWithColor);
        } else {
          setTeacherProjects([]);
        }
      } catch (error) {
        console.error("Error fetching projects:", error);
        setTeacherProjects([]);
      } finally {
        setIsLoading(false);
      }
    };

  const handleTeacherJoinProject = async () => {
    if (!teacherJoinCode.trim()) {
      setTeacherWarning("Project code is required");
      return;
    }

    try {
      setIsLoading(true);
      
      const storedUser = localStorage.getItem("user");
      if (!storedUser) {
        setTeacherWarning("User not logged in");
        setIsLoading(false);
        return;
      }

      const userData = JSON.parse(storedUser);
      const UserID = userData.UserID || userData.user_id || userData.id;

      const response = await fetch(
        "http://localhost/PMT/api/general/join_project.php",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            UserID: UserID,
            Code: teacherJoinCode,
          }),
        }
      );

      const result = await response.json();

      if (result.status === "success") {
        closeTeacherModal();
        fetchTeacherProjects(); // Refresh the project list
      } else {
        setTeacherWarning(result.message || "Failed to join project");
      }
    } catch (error) {
      console.error("Error joining project:", error);
      setTeacherWarning("Server error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

    const handleTeacherCreateProject = async () => {
      if (!teacherProjectName.trim()) {
        setTeacherWarning("Project Name is required");
        return;
      }
      if (!teacherProjectDesc.trim()) {
        setTeacherWarning("Project Description is required");
        return;
      }
      if (!teacherPassword.trim()) {
        setTeacherWarning("Project Password is required");
        return;
      }

      try {
        setIsLoading(true);
        
        const storedUser = localStorage.getItem("user");
        if (!storedUser) {
          setTeacherWarning("User not logged in");
          setIsLoading(false);
          return;
        }

        const userData = JSON.parse(storedUser);
        const UserID = userData.UserID || userData.user_id || userData.id;
        
        const response = await fetch(
          "http://localhost/PMT/api/instructors/create_project.php",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              UserID: UserID,
              ProjectName: teacherProjectName,
              Description: teacherProjectDesc,
              Password: teacherPassword,
              color: teacherProjectColor // Send the selected color to backend
            }),
          }
        );

        const result = await response.json();

        if (result.status === "success") {
          closeTeacherModal();
          fetchTeacherProjects(); // Refresh the project list
        } else {
          setTeacherWarning(result.message || "Failed to create project");
        }

      } catch (error) {
        console.error("Error creating project:", error);
        setTeacherWarning("Server error. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

  const handleProjectClick = (project) => {
    setSelectedProject(project);
    setActivePage("ProjectDashboard");
  };

  return (
    <div className="teacher-projects-wrapper">
      <div className="teacher-projects-bg">
        <div className="teacher-projects-page">

          {/* HEADER */}
          <div className="teacher-projects-header-section">
            <h1 className="teacher-projects-title">Start a New Project</h1>
            <p className="teacher-projects-desc">
              Manage all your projects in one place. Create, organize, and track progress with ease.
            </p>

            <div className="teacher-projects-actions">
              <button className="teacher-btn join" onClick={() => openTeacherModal('join')}>
                JOIN PROJECT
              </button>

              <button className="teacher-btn add" onClick={() => openTeacherModal('create')}>
                CREATE PROJECT
              </button>
            </div>
          </div>

          {/* RECENT PROJECTS */}
          <div className="teacher-recent-projects-section">
            <div className="teacher-recent-projects-header">
              <h2>RECENT PROJECTS {isLoading && <span style={{ fontSize: '14px', color: '#666' }}>(Loading...)</span>}</h2>

              <div className="teacher-search-bar">
                <input
                  type="search"
                  className="teacher-search-input"
                  placeholder="Find your projects"
                  value={teacherSearchQuery}
                  onChange={(e) => setTeacherSearchQuery(e.target.value)}
                  disabled={teacherProjects.length === 0}
                />
                <button className="teacher-search-submit" disabled={teacherProjects.length === 0}>
                  <i className="fa-solid fa-magnifying-glass"></i>
                </button>
              </div>
            </div>

            <div className="teacher-project-cards-scrollable">
              <div className="teacher-project-cards-container">
                {isLoading ? (
                  <div className="teacher-projects-placeholder">
                    <p>Loading projects...</p>
                  </div>
                ) : teacherProjects.length === 0 ? (
                  <div className="teacher-projects-placeholder">
                    <img src={projectPlaceholder} alt="No projects" />
                    <p>No projects yet. Click 'CREATE PROJECT' to get started!</p>
                  </div>
                ) : (
                  filteredTeacherProjects.map((proj, index) => (
                    <div
                      key={proj.ProjectID || index}
                      className="teacher-project-card"
                      style={{ background: proj.color }}
                      onClick={() => handleProjectClick(proj)}
                    >
                      <div className="teacher-project-owner">{proj.HostName || proj.owner || "You"}</div>
                      <div className="teacher-project-title">{proj.ProjectName}</div>
                      <div className="teacher-project-desc">
                        {proj.Description && proj.Description.length > 80
                          ? proj.Description.slice(0, 77) + "..."
                          : proj.Description}
                      </div>
                      <div className="teacher-project-time">{proj.createdAt}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* JOIN MODAL */}
          {teacherModalOpen && teacherModalType === "join" && (
            <div className="teacher-modal-overlay" onClick={closeTeacherModal}>
              <div className="teacher-modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="teacher-modal-close" onClick={closeTeacherModal}>×</button>

                <h2>JOIN PROJECT</h2>

                <label className="teacher-modal-label">Enter Code</label>
                <input
                  type="text"
                  className={`teacher-modal-input ${teacherWarning ? "teacher-input-error" : ""}`}
                  placeholder="Project Code"
                  value={teacherJoinCode}
                  onChange={(e) => setTeacherJoinCode(e.target.value)}
                />

                {teacherWarning && <p className="teacher-input-warning">⚠ {teacherWarning}</p>}

                <div className="teacher-modal-btn-row">
                  <button className="teacher-btn cancel" onClick={closeTeacherModal}>Cancel</button>
                  <button className="teacher-btn save" onClick={handleTeacherJoinProject} disabled={isLoading}>
                    {isLoading ? "Joining..." : "Confirm"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* CREATE MODAL */}
          {teacherModalOpen && teacherModalType === "create" && (
            <div className="teacher-modal-overlay" onClick={closeTeacherModal}>
              <div className="teacher-modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="teacher-modal-close" onClick={closeTeacherModal}>×</button>

                <h2>CREATE PROJECT</h2>

                <label className="teacher-modal-label">Project Name</label>
                <input
                  type="text"
                  className="teacher-modal-input"
                  value={teacherProjectName}
                  onChange={(e) => setTeacherProjectName(e.target.value)}
                  placeholder="Enter project name"
                />

                <label className="teacher-modal-label">Project Description</label>
                <textarea
                  className="teacher-modal-input"
                  value={teacherProjectDesc}
                  onChange={(e) => setTeacherProjectDesc(e.target.value)}
                  rows="4"
                  placeholder="Enter project description"
                ></textarea>

                <label className="teacher-modal-label">Project Password</label>
                <input
                  type="password"
                  className="teacher-modal-input"
                  value={teacherPassword}
                  onChange={(e) => setTeacherPassword(e.target.value)}
                  placeholder="Enter project password"
                />

                <label className="teacher-modal-label">Project Color</label>
                <div className="color-options-row">
                  {gradientColors.map((color, idx) => (
                    <div
                      key={idx}
                      className={`color-circle ${teacherProjectColor === color ? 'selected' : ''}`}
                      style={{ background: color }}
                      onClick={() => setTeacherProjectColor(color)}
                    ></div>
                  ))}
                </div>

                {teacherWarning && <p className="teacher-input-warning">⚠ {teacherWarning}</p>}

                <div className="teacher-modal-btn-row">
                  <button className="teacher-btn cancel" onClick={closeTeacherModal}>Cancel</button>
                  <button className="teacher-btn save" onClick={handleTeacherCreateProject} disabled={isLoading}>
                    {isLoading ? "Creating..." : "Create"}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default TeacherProjects;