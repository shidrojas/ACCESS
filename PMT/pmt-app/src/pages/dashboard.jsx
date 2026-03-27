import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../pages/pages.css";
import placeholderImg from "../img/placeholder-projects.png";
import analyticsIcon from "../img/analyticsicon.jpg";
import projectsIcon from "../img/prjctandtask.jpg";

function Dashboard({ setActivePage }) {
  const [activeTopTab, setActiveTopTab] = useState("projects");
  const [activeTaskTab, setActiveTaskTab] = useState("assigned");
  const [activeDeadlineFilter, setActiveDeadlineFilter] = useState("all");

  // ✅ USER STATES FROM BACKEND
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("");
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [projectMembers, setProjectMembers] = useState({});

  // Stats states
  const [projectStats, setProjectStats] = useState({
    total: 0
  });
  
  const [taskStats, setTaskStats] = useState({
    completed: 0,
    overdue: 0
  });

  // Upcoming deadlines state
  const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);
  const [filteredDeadlines, setFilteredDeadlines] = useState([]);

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

  // Fetch student deadlines data
  const fetchStudentDeadlines = async (userId) => {
    try {
      console.log('Fetching deadlines for user:', userId);
      const response = await fetch(
        `https://accesspmt.bsit3a2025.com/api/students/get_student_deadlines.php?UserID=${userId}`
      );
      const result = await response.json();
      
      console.log('Deadlines API response:', result);
      
      if (result.status === "success") {
        // Update stats
        setTaskStats({
          completed: result.stats?.completed_tasks || 0,
          overdue: result.stats?.overdue_tasks || 0
        });
        
        // Update deadlines - ensure it's an array
        const deadlines = Array.isArray(result.deadlines) ? result.deadlines : [];
        setUpcomingDeadlines(deadlines);
        setFilteredDeadlines(deadlines);
        
        console.log("Student deadlines loaded:", deadlines.length);
      } else {
        console.error("Failed to fetch student deadlines:", result.message);
        setUpcomingDeadlines([]);
        setFilteredDeadlines([]);
      }
    } catch (error) {
      console.error("Error fetching student deadlines:", error);
      setUpcomingDeadlines([]);
      setFilteredDeadlines([]);
    }
  };

  // Fetch user data on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      if (!storedUser) {
        setIsLoading(false);
        return;
      }

      try {
        // Fetch user details
        const response = await fetch(
          "https://accesspmt.bsit3a2025.com/api/general/fetch_user.php",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ UserID: storedUser.user_id || storedUser.UserID || storedUser.id }),
          }
        );

        const result = await response.json();

        if (result.status === "success") {
          setUserName(result.user.FullName);
          setUserEmail(result.user.Email);
          setUserRole(result.user.RoleUI);
        }

        const UserID = storedUser.UserID || storedUser.user_id || storedUser.id;
        
        // Fetch projects
        const projectsResponse = await fetch(
          `https://accesspmt.bsit3a2025.com/api/general/get_my_projects.php?UserID=${UserID}`
        );
        const projectsResult = await projectsResponse.json();

        if (projectsResult.status === "success" && projectsResult.projects) {
          // Format projects with colors
          const formatted = projectsResult.projects.map((proj, index) => ({
            ...proj,
            color: proj.color || gradientColors[index % gradientColors.length],
            createdAt: proj.TimeAgo || "Recently"
          }));
          
          setProjects(formatted);
          await fetchAllProjectMembers(formatted);
          
          // Calculate project stats
          setProjectStats({
            total: formatted.length
          });

          // Fetch student deadlines
          await fetchStudentDeadlines(UserID);
        } else {
          // Still try to fetch deadlines even if no projects
          await fetchStudentDeadlines(UserID);
        }

      } catch (error) {
        console.error("Failed to fetch data:", error);
        setUpcomingDeadlines([]);
        setFilteredDeadlines([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Filter deadlines based on active filter
  useEffect(() => {
    if (!upcomingDeadlines || upcomingDeadlines.length === 0) {
      setFilteredDeadlines([]);
      return;
    }
    
    let filtered = upcomingDeadlines;
    
    // Get current date and time
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    switch(activeDeadlineFilter) {
      case 'today':
        filtered = upcomingDeadlines.filter(d => {
          if (!d.dueDate) return false;
          const dueDate = new Date(d.dueDate);
          return dueDate >= now && dueDate < tomorrow;
        });
        break;
      case 'tomorrow':
        filtered = upcomingDeadlines.filter(d => {
          if (!d.dueDate) return false;
          const dueDate = new Date(d.dueDate);
          return dueDate >= tomorrow && dueDate < dayAfterTomorrow;
        });
        break;
      case 'week':
        filtered = upcomingDeadlines.filter(d => {
          if (!d.dueDate) return false;
          const dueDate = new Date(d.dueDate);
          return dueDate >= now && dueDate < nextWeek;
        });
        break;
      default:
        filtered = upcomingDeadlines;
    }
    
    setFilteredDeadlines(filtered);
  }, [activeDeadlineFilter, upcomingDeadlines]);

  // Get only first 4 projects for display
  const recentProjects = projects.slice(0, 4);

  const handleViewAllProjects = () => {
    if (setActivePage) {
      setActivePage("Projects");
    } else {
      navigate("/mainLayout?page=Projects");
    }
  };

  const handleProjectClick = (proj) => {
    // Navigate to mainLayout with ProjectDashboard and pass project in state
    navigate("/mainLayout?page=ProjectDashboard", {
      state: { project: proj },
    });
  };

  const handleViewTask = (taskId, projectId) => {
    const project = projects.find(p => p.ProjectID === projectId);
    if (project) {
      navigate("/mainLayout?page=ProjectDashboard", {
        state: { project: project },
      });
    } else {
      navigate("/mainLayout?page=ProjectDashboard", {
        state: { projectId: projectId },
      });
    }
  };

  // Get status badge text
  const getStatusBadge = (status) => {
    switch(status) {
      case 'In Progress': return 'status-progress';
      case 'For Review': return 'status-pending';
      case 'To Do': return 'status-not-started';
      case 'Done': return 'status-completed';
      default: return '';
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'In Progress': return 'In Progress';
      case 'For Review': return 'For Review';
      case 'To Do': return 'To Do';
      case 'Done': return 'Done';
      default: return status;
    }
  };

  // Render task table based on active tab
  const renderTaskTable = () => {
    let filteredTasks = [];
    
    if (upcomingDeadlines && upcomingDeadlines.length > 0) {
      switch(activeTaskTab) {
        case 'assigned':
          filteredTasks = upcomingDeadlines.filter(t => t.isAssigned !== false);
          break;
        case 'progress':
          filteredTasks = upcomingDeadlines.filter(t => t.status === 'In Progress');
          break;
        case 'review':
          filteredTasks = upcomingDeadlines.filter(t => t.status === 'For Review');
          break;
        default:
          filteredTasks = upcomingDeadlines;
      }
    }

    if (isLoading) {
      return (
        <tr>
          <td colSpan="4" style={{ textAlign: 'center', padding: '30px', color: '#666' }}>
            Loading tasks...
          </td>
        </tr>
      );
    }

    if (filteredTasks.length === 0) {
      return (
        <tr>
          <td colSpan="4" style={{ textAlign: 'center', padding: '30px', color: '#666' }}>
            No tasks found. Join a project to get started!
          </td>
        </tr>
      );
    }

    return filteredTasks.slice(0, 3).map((deadline) => (
      <tr 
        key={deadline.id} 
        onClick={() => handleViewTask(deadline.id, deadline.projectId)} 
        style={{ cursor: 'pointer' }}
      >
        <td>{truncateText(deadline.task, 30)}</td>
        <td className={deadline.status === 'In Progress' ? 'tag orange' : 'tag green'}>
          {truncateText(deadline.project, 20)}
        </td>
        <td>{deadline.createdAt ? new Date(deadline.createdAt).toLocaleDateString() : 'N/A'}</td>
        <td>{deadline.createdBy || userName || 'Unknown'}</td>
      </tr>
    ));
  };

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard">
        {/* USER HEADER */}
        <div className="dashboard-user">
          <h2>{userName || "Welcome to Dashboard"}</h2>
          <p>{userEmail} | {userRole || 'Student'}</p>
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
            className={activeTopTab === "deadlines" ? "active" : ""}
            onClick={() => setActiveTopTab("deadlines")}
          >
            <img src={analyticsIcon} alt="Deadlines Icon" className="mini-nav-icon" />
            UPCOMING DEADLINES
          </button>
        </div>

        {/* CONDITIONAL RENDERING */}
        {activeTopTab === "projects" ? (
          <>
            {/* RECENT PROJECTS */}
            <div className="dashboard-section">
              <div className="section-header">
                <h4>RECENT PROJECTS {isLoading && <span className="loading-text">(Loading...)</span>}</h4>
                <div className="view-all-wrapper">
                  <button
                    className="modern-view-link"
                    onClick={handleViewAllProjects}
                  >
                    View All <span className="arrow">→</span>
                  </button>
                </div>
              </div>

              {isLoading ? (
                <div className="projects-placeholder">
                  <p>Loading projects...</p>
                </div>
              ) : projects.length === 0 ? (
                <div className="projects-placeholder">
                  <img src={placeholderImg} alt="placeholder" />
                  <p>No projects found. Join a project to get started.</p>
                </div>
              ) : (
                <div className="project-cards-container-new">
                  {recentProjects.map((proj) => (
                    <div
                      key={proj.ProjectID}
                      className="project-card-wrapper"
                      onClick={() => handleProjectClick(proj)}
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

            {/* TASK TABS */}
            <div className="task-tabs-container">
              <div className="task-tabs">
                {["assigned", "progress", "review"].map((tab) => (
                  <button
                    key={tab}
                    className={activeTaskTab === tab ? "active" : ""}
                    onClick={() => setActiveTaskTab(tab)}
                  >
                    {tab === "assigned" && "ASSIGNED TO YOU"}
                    {tab === "progress" && "IN PROGRESS"}
                    {tab === "review" && "FOR REVIEW"}
                  </button>
                ))}
              </div>
            </div>

            {/* TASK TABLE */}
            <div className="table-responsive">
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
                  {renderTaskTable()}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          /* UPCOMING DEADLINES SECTION */
          <div className="deadlines-wrapper">
            {isLoading ? (
              <div className="loading-spinner" style={{ textAlign: 'center', padding: '40px' }}>
                Loading deadlines...
              </div>
            ) : (
              <>
                {/* Quick Stats Cards - Only 3 cards */}
                <div className="deadlines-stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                  <div className="stat-card highlight">
                    <div className="stat-number">{taskStats.completed || 0}</div>
                    <div className="stat-label">COMPLETED TASKS</div>
                    <div className="stat-description">
                      Tasks completed across all projects
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-number">{projectStats.total || 0}</div>
                    <div className="stat-label">ACTIVE PROJECTS</div>
                    <div className="stat-description">
                      Projects you're currently involved in
                    </div>
                  </div>
                  <div className="stat-card warning">
                    <div className="stat-number">{taskStats.overdue || 0}</div>
                    <div className="stat-label">OVERDUE</div>
                    <div className="stat-description">Tasks past their deadline</div>
                  </div>
                </div>

                {/* Upcoming Deadlines Section */}
                <div className="deadlines-section">
                  <div className="deadline-header">
                    <h3 className="deadline-title">Upcoming Deadlines</h3>
                    <span className="deadline-badge">{filteredDeadlines.length} tasks</span>
                  </div>

                  {/* Deadline Summary Tabs */}
                  <div className="deadline-tabs">
                    <button 
                      className={`deadline-tab ${activeDeadlineFilter === 'all' ? 'active' : ''}`}
                      onClick={() => setActiveDeadlineFilter('all')}
                    >
                      All Deadlines
                      <span className="tab-count">{upcomingDeadlines.length}</span>
                    </button>
                    <button 
                      className={`deadline-tab ${activeDeadlineFilter === 'today' ? 'active' : ''}`}
                      onClick={() => setActiveDeadlineFilter('today')}
                    >
                      Due Today
                      <span className="tab-count urgent">
                        {upcomingDeadlines.filter(d => {
                          if (!d.dueDate) return false;
                          const now = new Date();
                          const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                          tomorrow.setDate(tomorrow.getDate() + 1);
                          const dueDate = new Date(d.dueDate);
                          return dueDate >= now && dueDate < tomorrow;
                        }).length}
                      </span>
                    </button>
                    <button 
                      className={`deadline-tab ${activeDeadlineFilter === 'tomorrow' ? 'active' : ''}`}
                      onClick={() => setActiveDeadlineFilter('tomorrow')}
                    >
                      Due Tomorrow
                      <span className="tab-count warning">
                        {upcomingDeadlines.filter(d => {
                          if (!d.dueDate) return false;
                          const now = new Date();
                          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                          const tomorrow = new Date(today);
                          tomorrow.setDate(tomorrow.getDate() + 1);
                          const dayAfterTomorrow = new Date(tomorrow);
                          dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
                          const dueDate = new Date(d.dueDate);
                          return dueDate >= tomorrow && dueDate < dayAfterTomorrow;
                        }).length}
                      </span>
                    </button>
                    <button 
                      className={`deadline-tab ${activeDeadlineFilter === 'week' ? 'active' : ''}`}
                      onClick={() => setActiveDeadlineFilter('week')}
                    >
                      This Week
                      <span className="tab-count info">
                        {upcomingDeadlines.filter(d => {
                          if (!d.dueDate) return false;
                          const now = new Date();
                          const nextWeek = new Date(now);
                          nextWeek.setDate(nextWeek.getDate() + 7);
                          const dueDate = new Date(d.dueDate);
                          return dueDate >= now && dueDate < nextWeek;
                        }).length}
                      </span>
                    </button>
                  </div>

                  {/* Deadlines Table */}
                  {filteredDeadlines.length === 0 ? (
                    <div className="no-deadlines" style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                      <p>No deadlines found for this period.</p>
                    </div>
                  ) : (
                    <div className="deadlines-table-container">
                      <table className="deadlines-table">
                        <thead>
                          <tr>
                            <th>TASK</th>
                            <th>PROJECT</th>
                            <th>DUE DATE</th>
                            <th>STATUS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredDeadlines.map((deadline) => (
                            <tr 
                              key={deadline.id} 
                              className="deadline-row" 
                              onClick={() => handleViewTask(deadline.id, deadline.projectId)} 
                              style={{ cursor: 'pointer' }}
                            >
                              <td className="deadline-task-cell">
                                <span className="deadline-task-title" title={deadline.task}>
                                  {truncateText(deadline.task, 25)}
                                </span>
                              </td>
                              <td>
                                <span className="project-name">
                                  {truncateText(deadline.project, 20)}
                                </span>
                              </td>
                              <td>
                                <span className={`due-date ${deadline.daysLeft < 0 ? 'urgent' : deadline.daysLeft === 0 ? 'urgent' : deadline.daysLeft === 1 ? 'warning' : ''}`}>
                                  <i className="fa-solid fa-calendar"></i>
                                  {deadline.dueDateFormatted || new Date(deadline.dueDate).toLocaleDateString()}
                                  {deadline.daysLeft === 0 && <span className="due-badge">Today</span>}
                                  {deadline.daysLeft === 1 && <span className="due-badge">Tomorrow</span>}
                                  {deadline.daysLeft < 0 && <span className="due-badge">Overdue</span>}
                                </span>
                              </td>
                              <td>
                                <span className={`status-badge ${getStatusBadge(deadline.status)}`}>
                                  {getStatusText(deadline.status)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;