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
  const [projectMembers, setProjectMembers] = useState({});
  
  // Custom Alert Popup
  const [showAlertPopup, setShowAlertPopup] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState("info");

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
        `https://accesspmt.bsit3a2025.com/api/general/get_my_projects.php?UserID=${UserID}`
      );
      const result = await response.json();

      if (result.status === "success" && result.projects) {
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
          color: proj.color || gradientColors[Math.floor(Math.random() * gradientColors.length)]
        }));
        
        setTeacherProjects(projectsWithColor);
        await fetchAllProjectMembers(projectsWithColor);
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
        "https://accesspmt.bsit3a2025.com/api/general/join_project.php",
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
        fetchTeacherProjects();
        showCustomAlert("Successfully joined the project!", "success");
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
        "https://accesspmt.bsit3a2025.com/api/instructors/create_project.php",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            UserID: UserID,
            ProjectName: teacherProjectName,
            Description: teacherProjectDesc,
            Password: teacherPassword,
            color: teacherProjectColor
          }),
        }
      );

      const result = await response.json();

      if (result.status === "success") {
        closeTeacherModal();
        fetchTeacherProjects();
        showCustomAlert("Project created successfully!", "success");
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
    if (setSelectedProject && setActivePage) {
      setSelectedProject(project);
      setActivePage("ProjectDashboard");
    }
  };

  return (
    <div className="teacher-projects-wrapper">
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
              <h2>RECENT PROJECTS {isLoading && <span className="loading-text">(Loading...)</span>}</h2>

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
                      className="teacher-new-project-card-wrapper"
                      onClick={() => handleProjectClick(proj)}
                    >
                      <div className="teacher-new-project-card">
                        <div 
                          className="teacher-new-project-header"
                          style={{ background: proj.color }}
                        >
                          <div className="teacher-new-project-owner-badge">
                            <span title={proj.HostName || proj.owner || "You"}>
                              {truncateText(proj.HostName || proj.owner || "You", 15)}
                            </span>
                          </div>

                          <div className="teacher-new-project-time" title={proj.createdAt}>
                            {truncateText(proj.createdAt, 10)}
                          </div>
                        </div>

                        <div className="teacher-new-project-content">
                          <div className="teacher-new-project-notch">
                            <svg
                              viewBox="0 0 360 40"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                              preserveAspectRatio="none"
                            >
                              <path
                                d="M0 0 L0 40 L260 40 C260 40 230 20 200 0 L0 0"
                                className="teacher-new-project-notch-fill"
                              />
                            </svg>
                          </div>

                          <div className="teacher-new-project-body">
                            <h3 className="teacher-new-project-title" title={proj.ProjectName}>
                              {truncateText(proj.ProjectName, 20)}
                            </h3>
                            <p className="teacher-new-project-desc" title={proj.Description || "No description"}>
                              {truncateText(proj.Description || "No description", 35)}
                            </p>
                          </div>

                          <div className="teacher-new-project-footer">
                            <div className="teacher-new-project-avatars">
                              <div className="teacher-new-project-avatar-stack">
                                {projectMembers[proj.ProjectID]?.members?.slice(0, 3).map((member, idx) => (
                                  <div 
                                    key={member.id} 
                                    className="teacher-new-project-avatar"
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
                                <span className="teacher-new-project-member-count">
                                  +{projectMembers[proj.ProjectID].count - 3}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* JOIN MODAL - Modern Design */}
          {teacherModalOpen && teacherModalType === "join" && (
            <div className="modern-popup-overlay" onClick={closeTeacherModal}>
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
                      className={`${teacherWarning ? "input-error" : ""}`}
                      placeholder="Enter project code"
                      value={teacherJoinCode}
                      onChange={(e) => setTeacherJoinCode(e.target.value)}
                      disabled={isLoading}
                      autoFocus
                    />
                  </div>
                  {teacherWarning && (
                    <div className="info-box" style={{ background: "#fef3c7", borderLeftColor: "#f59e0b" }}>
                      <p style={{ color: "#92400e" }}>⚠ {teacherWarning}</p>
                    </div>
                  )}
                </div>
                <div className="modern-popup-footer double-buttons">
                  <button className="modern-btn modern-btn-secondary" onClick={closeTeacherModal} disabled={isLoading}>
                    Cancel
                  </button>
                  <button 
                    className="modern-btn modern-btn-primary" 
                    onClick={handleTeacherJoinProject} 
                    disabled={isLoading}
                  >
                    {isLoading ? "Joining..." : "Join Project"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* CREATE MODAL - Modern Design */}
          {teacherModalOpen && teacherModalType === "create" && (
            <div className="modern-popup-overlay" onClick={closeTeacherModal}>
              <div className="modern-popup large" onClick={(e) => e.stopPropagation()}>
                <div className="modern-popup-header">
                  <h3>✨ Create New Project</h3>
                  <p>Set up a new project for your team</p>
                </div>
                <div className="modern-popup-content">
                  <div className="form-group">
                    <label>Project Name</label>
                    <input
                      type="text"
                      value={teacherProjectName}
                      onChange={(e) => setTeacherProjectName(e.target.value)}
                      placeholder="Enter project name"
                    />
                  </div>

                  <div className="form-group">
                    <label>Project Description</label>
                    <textarea
                      value={teacherProjectDesc}
                      onChange={(e) => setTeacherProjectDesc(e.target.value)}
                      rows="4"
                      placeholder="Enter project description"
                      style={{ width: '100%', padding: '10px', borderRadius: '12px', border: '1.5px solid #e2e8f0' }}
                    ></textarea>
                  </div>

                  <div className="form-group">
                    <label>Project Password</label>
                    <input
                      type="password"
                      value={teacherPassword}
                      onChange={(e) => setTeacherPassword(e.target.value)}
                      placeholder="Enter project password"
                    />
                  </div>

                  <div className="form-group">
                    <label>Project Color</label>
                    <div className="color-options-row" style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                      {gradientColors.map((color, idx) => (
                        <div
                          key={idx}
                          className={`color-circle ${teacherProjectColor === color ? 'selected' : ''}`}
                          style={{ 
                            background: color, 
                            width: '35px', 
                            height: '35px', 
                            borderRadius: '50%', 
                            cursor: 'pointer',
                            border: teacherProjectColor === color ? '2px solid #000' : '2px solid transparent'
                          }}
                          onClick={() => setTeacherProjectColor(color)}
                          title={`Color ${idx + 1}`}
                        ></div>
                      ))}
                    </div>
                  </div>

                  {teacherWarning && (
                    <div className="info-box" style={{ background: "#fef3c7", borderLeftColor: "#f59e0b" }}>
                      <p style={{ color: "#92400e" }}>⚠ {teacherWarning}</p>
                    </div>
                  )}
                </div>
                <div className="modern-popup-footer double-buttons">
                  <button className="modern-btn modern-btn-secondary" onClick={closeTeacherModal} disabled={isLoading}>
                    Cancel
                  </button>
                  <button 
                    className="modern-btn modern-btn-primary" 
                    onClick={handleTeacherCreateProject} 
                    disabled={isLoading}
                  >
                    {isLoading ? "Creating..." : "Create Project"}
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