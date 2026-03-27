import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../pages/pages.css";
import projectPlaceholder from "../img/projectplaceholder.png";

function Archives() {
  const [archivedProjects, setArchivedProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [projectMembers, setProjectMembers] = useState({});
  const [userName, setUserName] = useState("");

  const navigate = useNavigate();

  const gradientColors = [
    "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
    "linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)",
    "linear-gradient(135deg, #fddb92 0%, #d1fdff 100%)",
    "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",
    "linear-gradient(135deg, #cfd9df 0%, #e2ebf0 100%)"
  ];

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

  // Fetch archived projects where user is a member
  useEffect(() => {
    const fetchArchivedProjects = async () => {
      setIsLoading(true);
      
      const storedUser = JSON.parse(localStorage.getItem("user"));
      if (!storedUser) {
        setIsLoading(false);
        return;
      }

      try {
        const UserID = storedUser.UserID || storedUser.user_id || storedUser.id;
        
        // First get user info
        const userResponse = await fetch(
          "https://accesspmt.bsit3a2025.com/api/general/fetch_user.php",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ UserID }),
          }
        );
        
        const userResult = await userResponse.json();
        if (userResult.status === "success") {
          setUserName(userResult.user.FullName);
        }

        // Fetch archived projects where user is a member
        const response = await fetch(
          `https://accesspmt.bsit3a2025.com/api/students/get_student_archives.php?UserID=${UserID}`
        );
        const result = await response.json();

        if (result.status === "success" && result.projects) {
          const formatted = result.projects.map((proj) => ({
            ProjectID: proj.ProjectID,
            ProjectName: proj.ProjectName || "Untitled Project",
            Description: proj.Description || "No description available",
            FullDescription: proj.FullDescription || proj.Description || "No description available",
            HostName: proj.HostName || "Unknown",
            owner: proj.HostName || "Unknown",
            Code: proj.Code,
            Status: proj.Status,
            archivedDate: proj.ArchivedDate || proj.UpdatedAt || proj.CreatedAt || "Recently",
            color: proj.color || gradientColors[Math.floor(Math.random() * gradientColors.length)],
            totalTasks: proj.total_tasks || 0,
            completedTasks: proj.completed_tasks || 0
          }));
          
          setArchivedProjects(formatted);
          
          // Fetch members for all archived projects
          await fetchAllProjectMembers(formatted);
        } else {
          setArchivedProjects([]);
        }

      } catch (error) {
        console.error("Error fetching archived projects:", error);
        setArchivedProjects([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchArchivedProjects();
  }, []);

  const filteredProjects = archivedProjects.filter(proj =>
    proj.ProjectName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    proj.Description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    proj.HostName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Navigate to student mainLayout with ProjectDashboard
  const handleProjectClick = (project) => {
    // Navigate to mainLayout (student) with page=ProjectDashboard and pass project data
    navigate("/mainLayout?page=ProjectDashboard", {
      state: { project: project },
    });
  };

  return (
    <div className="dashboard">
      {/* Archives Search Section */}
      <div className="dashboard-section">
        <div className="section-header" style={{ marginBottom: '20px' }}>
          <h4>ARCHIVED PROJECTS {isLoading && <span className="loading-text">(Loading...)</span>}</h4>
          <div className="search-bar" style={{ marginLeft: 'auto' }}>
            <input
              type="search"
              className="search-input"
              placeholder="Search archived projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={archivedProjects.length === 0}
            />
            <button className="search-submit" disabled={archivedProjects.length === 0}>
              <i className="fa-solid fa-magnifying-glass"></i>
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="projects-placeholder">
            <p>Loading archives...</p>
          </div>
        ) : (
          <>
            {/* ARCHIVED PROJECTS - Card Layout */}
            {filteredProjects.length === 0 ? (
              <div className="projects-placeholder">
                <img src={projectPlaceholder} alt="No archived projects" />
                <p>No archived projects found.</p>
              </div>
            ) : (
              <div className="project-cards-container-new">
                {filteredProjects.map((proj) => (
                  <div
                    key={proj.ProjectID}
                    className="project-card-wrapper"
                    onClick={() => handleProjectClick(proj)}
                  >
                    <div className="project-new-card" style={{ position: 'relative' }}>
                      {/* Colored header */}
                      <div 
                        className="project-new-header"
                        style={{ background: proj.color }}
                      >
                        {/* Owner badge */}
                        <div className="project-new-owner-badge">
                          <span title={proj.HostName}>
                            {truncateText(proj.HostName, 15)}
                          </span>
                        </div>

                        {/* Time label */}
                        <div className="project-new-time" title={proj.archivedDate}>
                          {truncateText(proj.archivedDate, 10)}
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

                        {/* Footer with member avatars and archived badge */}
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
                          <span className="archived-badge" style={{
                            fontSize: '10px',
                            color: '#888',
                            background: '#f0f0f0',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            marginLeft: 'auto'
                          }}>
                            Archived
                          </span>
                        </div>

                        {/* Optional: Show task completion stats */}
                        {proj.totalTasks > 0 && (
                          <div style={{
                            position: 'absolute',
                            bottom: '35px',
                            right: '10px',
                            fontSize: '10px',
                            color: '#666',
                            background: 'rgba(255,255,255,0.9)',
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}>
                            {proj.completedTasks}/{proj.totalTasks} tasks
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Archives;