import React, { useState, useEffect } from "react";
import "../pages/pages.css";
import "../TeacherForms/teacher.css";
import projectPlaceholder from "../img/projectplaceholder.png";

const TeacherArchives = ({ setActivePage, setSelectedProject }) => {
  const [archivedProjects, setArchivedProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [projectMembers, setProjectMembers] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  
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

  // Fetch archived projects and user data
  useEffect(() => {
    const fetchArchivedProjects = async () => {
      setIsLoading(true);
      
      const storedUser = JSON.parse(localStorage.getItem("user"));
      if (!storedUser) {
        setIsLoading(false);
        return;
      }

      setCurrentUser(storedUser);

      try {
        const UserID = storedUser.UserID || storedUser.user_id || storedUser.id;
        
        const response = await fetch(
          `https://accesspmt.bsit3a2025.com/api/general/get_archived_projects.php?UserID=${UserID}&status=Archived`
        );
        const result = await response.json();

        if (result.status === "success" && result.projects) {
          const formatted = result.projects.map((proj) => ({
            ProjectID: proj.ProjectID,
            ProjectName: proj.ProjectName || "Untitled Project",
            Description: proj.Description || "No description available",
            FullDescription: proj.FullDescription || proj.Description || "No description available",
            HostName: proj.HostName || "You",
            owner: proj.HostName || "You",
            Role: proj.Role,
            Code: proj.Code,
            Status: proj.Status,
            createdAt: proj.TimeAgo || proj.CreatedAt || "Recently",
            color: proj.color || gradientColors[Math.floor(Math.random() * gradientColors.length)],
            archivedDate: proj.UpdatedAt || proj.CreatedAt || "Recently"
          }));
          
          setArchivedProjects(formatted);
          await fetchAllProjectMembers(formatted);
        } else {
          setArchivedProjects([]);
        }

      } catch (error) {
        console.error("Error fetching archived projects:", error);
        setArchivedProjects([]);
        showCustomAlert("Failed to load archived projects", "error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchArchivedProjects();
  }, []);

  const handleRestore = async () => {
    if (!selectedItem) return;
    setIsLoading(true);
    
    try {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      const UserID = storedUser.UserID || storedUser.user_id || storedUser.id;

      const response = await fetch("https://accesspmt.bsit3a2025.com/api/instructors/restore_project.php", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ProjectID: selectedItem.id,
          UserID: UserID
        }),
      });

      const result = await response.json();

      if (result.status === "success") {
        setArchivedProjects(prev => prev.filter(p => p.ProjectID !== selectedItem.id));
        setShowModal(false);
        setSelectedItem(null);
        showCustomAlert("Project restored successfully!", "success");
      } else {
        showCustomAlert(result.message || "Failed to restore project", "error");
      }
    } catch (error) {
      console.error("Error restoring project:", error);
      showCustomAlert("Failed to restore project. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePermanentDelete = async () => {
    if (!selectedItem) return;
    setIsLoading(true);
    
    try {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      const UserID = storedUser.UserID || storedUser.user_id || storedUser.id;

      const response = await fetch("https://accesspmt.bsit3a2025.com/api/instructors/delete_project.php", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ProjectID: selectedItem.id,
          UserID: UserID
        }),
      });

      const result = await response.json();

      if (result.status === "success") {
        setArchivedProjects(prev => prev.filter(p => p.ProjectID !== selectedItem.id));
        setShowModal(false);
        setSelectedItem(null);
        showCustomAlert("Project permanently deleted!", "success");
      } else {
        showCustomAlert(result.message || "Failed to delete project", "error");
      }
    } catch (error) {
      console.error("Error deleting project:", error);
      showCustomAlert("Failed to delete project. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const openRestoreModal = (item, e) => {
    e.stopPropagation();
    setSelectedItem(item);
    setModalType("restore");
    setShowModal(true);
    setOpenMenuId(null);
  };

  const openDeleteModal = (item, e) => {
    e.stopPropagation();
    setSelectedItem(item);
    setModalType("delete");
    setShowModal(true);
    setOpenMenuId(null);
  };

  const toggleMenu = (id, e) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === id ? null : id);
  };

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const filteredProjects = archivedProjects.filter(proj =>
    proj.ProjectName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    proj.Description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    proj.HostName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleProjectClick = (project) => {
    if (setSelectedProject && setActivePage) {
      setSelectedProject(project);
      setActivePage("ProjectDashboard");
    } else {
      console.error("setSelectedProject or setActivePage is not a function");
    }
  };

  const isUserHost = (project) => {
    return project.Role === 'Host';
  };

  return (
    <div className="teacher-dashboard archives-dashboard">
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

      {/* Archives Search Section */}
      <div className="teacher-dashboard-section archives-section">
        <div className="teacher-section-header archives-section-header">
          <h4 className="archives-section-title">
            ARCHIVED PROJECTS {isLoading && <span className="loading-text">(Loading...)</span>}
          </h4>
          <div className="teacher-section-actions archives-actions">
            <div className="teacher-search-bar archives-search">
              <input
                type="search"
                className="teacher-search-input archives-search-input"
                placeholder="Search archived projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={archivedProjects.length === 0}
              />
              <button className="teacher-search-submit archives-search-btn" disabled={archivedProjects.length === 0}>
                <i className="fa-solid fa-magnifying-glass"></i>
              </button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="teacher-projects-placeholder archives-placeholder">
            <p>Loading archives...</p>
          </div>
        ) : (
          <>
            {filteredProjects.length === 0 ? (
              <div className="teacher-projects-placeholder archives-placeholder">
                <img src={projectPlaceholder} alt="No archived projects" />
                <p className="archives-empty-text">No archived projects found.</p>
              </div>
            ) : (
              <div className="archives-project-grid">
                {filteredProjects.map((proj) => (
                  <div
                    key={proj.ProjectID}
                    className="teacher-new-project-card-wrapper"
                    onClick={() => handleProjectClick(proj)}
                  >
                    <div className="teacher-new-project-card" style={{ position: 'relative' }}>
                      {isUserHost(proj) && (
                        <div className="archives-menu-container" style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 10 }}>
                          <button 
                            onClick={(e) => toggleMenu(`project-${proj.ProjectID}`, e)}
                            className="archives-menu-btn"
                            style={{
                              background: 'rgba(255, 255, 255, 0.3)',
                              border: 'none',
                              borderRadius: '50%',
                              width: '30px',
                              height: '30px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontSize: '18px',
                              fontWeight: 'bold'
                            }}
                          >
                            ⋮
                          </button>
                          
                          {openMenuId === `project-${proj.ProjectID}` && (
                            <div className="archives-menu-dropdown" style={{
                              position: 'absolute',
                              top: '35px',
                              right: 0,
                              background: 'white',
                              borderRadius: '8px',
                              boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                              width: '150px',
                              zIndex: 20,
                              overflow: 'hidden'
                            }}>
                              <button
                                onClick={(e) => openRestoreModal({ id: proj.ProjectID, name: proj.ProjectName }, e)}
                                className="archives-menu-item restore-item"
                                style={{
                                  width: '100%',
                                  padding: '10px',
                                  border: 'none',
                                  background: 'none',
                                  textAlign: 'left',
                                  cursor: 'pointer',
                                  color: '#28a745',
                                  borderBottom: '1px solid #eee'
                                }}
                              >
                                🔄 Restore
                              </button>
                              <button
                                onClick={(e) => openDeleteModal({ id: proj.ProjectID, name: proj.ProjectName }, e)}
                                className="archives-menu-item delete-item"
                                style={{
                                  width: '100%',
                                  padding: '10px',
                                  border: 'none',
                                  background: 'none',
                                  textAlign: 'left',
                                  cursor: 'pointer',
                                  color: '#dc3545'
                                }}
                              >
                                🗑️ Delete Permanently
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      <div 
                        className="teacher-new-project-header"
                        style={{ background: proj.color }}
                      >
                        <div className="teacher-new-project-owner-badge">
                          <span title={proj.HostName || proj.owner || "You"}>
                            {truncateText(proj.HostName || proj.owner || "You", 15)}
                          </span>
                        </div>

                        <div className="teacher-new-project-time" title={proj.archivedDate}>
                          {truncateText(proj.archivedDate, 10)}
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
                          <span className="archives-archived-badge" style={{
                            fontSize: '10px',
                            color: '#888',
                            background: '#f0f0f0',
                            padding: '2px 8px',
                            borderRadius: '12px'
                          }}>
                            Archived
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Confirmation Modal - Modern Design */}
      {showModal && (
        <div className="modern-popup-overlay" onClick={() => setShowModal(false)}>
          <div className="modern-popup" onClick={(e) => e.stopPropagation()}>
            <div className="modern-popup-header" style={{
              background: modalType === "delete" 
                ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
                : "linear-gradient(135deg, #10b981 0%, #059669 100%)"
            }}>
              <h3>
                {modalType === "restore" ? "🔄 Restore Project" : "⚠️ Permanently Delete"}
              </h3>
              {modalType === "delete" && (
                <p>⚠️ Warning: This action cannot be undone!</p>
              )}
              {modalType === "restore" && (
                <p>This will restore the project to active status</p>
              )}
            </div>
            <div className="modern-popup-content" style={{ textAlign: "center" }}>
              <p style={{ fontSize: "1rem", margin: "20px 0", color: "#374151" }}>
                Are you sure you want to {modalType === "restore" ? "restore" : "permanently delete"}{" "}
                <strong>"{selectedItem?.name}"</strong>?
              </p>
            </div>
            <div className="modern-popup-footer double-buttons">
              <button 
                className="modern-btn modern-btn-secondary" 
                onClick={() => setShowModal(false)}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button 
                className={`modern-btn ${modalType === "restore" ? "modern-btn-success" : "modern-btn-danger"}`}
                onClick={modalType === "restore" ? handleRestore : handlePermanentDelete}
                disabled={isLoading}
              >
                {isLoading ? "Processing..." : (modalType === "restore" ? "Restore Project" : "Delete Permanently")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherArchives;