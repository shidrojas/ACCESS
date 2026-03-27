import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../pages/pages.css";
import teacherPlaceholderImg from "../img/placeholder-projects.png";
import teacherProjectsIcon from "../img/prjctandtask.jpg";

function TeacherDashboard({ setActivePage, setSelectedProject }) {
  const [teacherActiveTopTab, setTeacherActiveTopTab] = useState("projects");
  const [teacherActiveTaskTab, setTeacherActiveTaskTab] = useState("assigned");
  const [activeDeadlineFilter, setActiveDeadlineFilter] = useState("all");
  const [teacherUserName, setTeacherUserName] = useState("");
  const [teacherUserEmail, setTeacherUserEmail] = useState("");
  const [teacherUserRole, setTeacherUserRole] = useState("");
  const [teacherProjects, setTeacherProjects] = useState([]);
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

  // Tasks states for tabs
  const [allTasks, setAllTasks] = useState([]);
  const [projectTasks, setProjectTasks] = useState([]);
  const [inProgressTasks, setInProgressTasks] = useState([]);
  const [forReviewTasks, setForReviewTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

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

  // Fetch tasks for a specific project
  const fetchProjectTasks = async (projectId) => {
    try {
      const response = await fetch(
        `https://accesspmt.bsit3a2025.com/api/general/get_tasks.php?ProjectID=${projectId}`
      );
      const result = await response.json();
      
      if (result.status === "success" && result.tasks) {
        return result.tasks;
      }
      return [];
    } catch (error) {
      console.error(`Error fetching tasks for project ${projectId}:`, error);
      return [];
    }
  };

  // Fetch all tasks from all projects and categorize them
  const fetchAllTasks = async (projects, userId) => {
    setLoadingTasks(true);
    let allTasksList = [];
    let projectTasksList = [];
    let inProgressList = [];
    let forReviewList = [];

    for (const project of projects) {
      const tasks = await fetchProjectTasks(project.ProjectID);
      
      // Add project info to each task
      const tasksWithProject = tasks.map(task => ({
        ...task,
        ProjectName: project.ProjectName,
        ProjectID: project.ProjectID,
        ProjectColor: project.color
      }));

      allTasksList = [...allTasksList, ...tasksWithProject];
    }

    // Filter tasks based on user's role and assignments
    for (const task of allTasksList) {
      // Check if user is assigned to this task
      const isAssigned = task.AssignedToIds?.includes(userId);
      
      // Add to project tasks if user is assigned OR if user is project host/co-host
      const project = projects.find(p => p.ProjectID === task.ProjectID);
      const isHostOrCoHost = project?.Role === 'Host' || project?.Role === 'Co-Host';
      
      if (isAssigned || isHostOrCoHost) {
        // Add to project tasks list (all tasks user has access to)
        projectTasksList.push(task);
        
        // Categorize by status
        if (task.Status === 'In Progress') {
          inProgressList.push(task);
        } else if (task.Status === 'For Review') {
          forReviewList.push(task);
        }
      }
    }

    setAllTasks(allTasksList);
    setProjectTasks(projectTasksList);
    setInProgressTasks(inProgressList);
    setForReviewTasks(forReviewList);
    setLoadingTasks(false);

    return { projectTasksList, inProgressList, forReviewList };
  };

  // Calculate overdue tasks count
  const calculateOverdueTasks = (tasks) => {
    let overdueCount = 0;
    
    tasks.forEach(task => {
      // Task is overdue if: not done AND due date is in the past
      if (task.Status !== 'Done' && task.isOverdue) {
        overdueCount++;
      }
    });
    
    return overdueCount;
  };

  // Fetch completed tasks count
  const fetchCompletedTasksCount = async (userId, projects) => {
    try {
      let totalCompleted = 0;
      
      // For each project, check tasks that are Done
      for (const project of projects) {
        const tasks = await fetchProjectTasks(project.ProjectID);
        
        tasks.forEach(task => {
          // Count if task is Done
          if (task.Status === 'Done') {
            totalCompleted++;
          }
        });
      }
      
      return totalCompleted;
    } catch (error) {
      console.error('Error fetching completed tasks:', error);
      return 0;
    }
  };

  // Filter deadlines based on active filter
  useEffect(() => {
    let filtered = upcomingDeadlines;
    
    // Get current date and time
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Today at midnight
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1); // Tomorrow at midnight
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1); // Day after tomorrow at midnight
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7); // 7 days from today at midnight
    
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

  // Fetch user data and projects
  useEffect(() => {
    const fetchUserData = async () => {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      
      if (!storedUser) {
        setIsLoading(false);
        return;
      }

      try {
        const userResponse = await fetch(
          "https://accesspmt.bsit3a2025.com/api/general/fetch_user.php",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ UserID: storedUser.user_id || storedUser.UserID || storedUser.id }),
          }
        );

        const userResult = await userResponse.json();
        const UserID = storedUser.UserID || storedUser.user_id || storedUser.id;

        if (userResult.status === "success") {
          setTeacherUserName(userResult.user.FullName || "JOHN JUAN DOE");
          setTeacherUserEmail(userResult.user.Email || "johndoe@gmail.com");
          
          const role = userResult.user.RoleUI || "";
          setTeacherUserRole(role === "Instructor" ? "Instructor" : role);
        } else {
          const fullName = storedUser.FirstName && storedUser.LastName 
            ? `${storedUser.FirstName} ${storedUser.LastName}`.toUpperCase()
            : storedUser.Name?.toUpperCase() || "JOHN JUAN DOE";
          
          setTeacherUserName(fullName);
          setTeacherUserEmail(storedUser.email || storedUser.Email || "johndoe@gmail.com");
          setTeacherUserRole("Teacher");
        }
        
        // Fetch projects
        const projectsResponse = await fetch(
          `https://accesspmt.bsit3a2025.com/api/general/get_my_projects.php?UserID=${UserID}`
        );
        const projectsResult = await projectsResponse.json();

        if (projectsResult.status === "success" && projectsResult.projects) {
          const formatted = projectsResult.projects.map((proj, index) => ({
            ...proj,
            color: proj.color || gradientColors[index % gradientColors.length],
          }));
          
          setTeacherProjects(formatted);
          await fetchAllProjectMembers(formatted);

          // Calculate project stats
          setProjectStats({
            total: formatted.length
          });

          // Fetch all tasks and categorize them
          const { projectTasksList } = await fetchAllTasks(formatted, UserID);
          
          // Calculate overdue tasks from all accessible tasks
          const overdueCount = calculateOverdueTasks(projectTasksList);
          
          // Calculate completed tasks count
          const completedCount = await fetchCompletedTasksCount(UserID, formatted);
          
          setTaskStats({
            completed: completedCount,
            overdue: overdueCount
          });

          // Fetch upcoming deadlines
          try {
            const deadlinesResponse = await fetch(
              `https://accesspmt.bsit3a2025.com/api/tasks/get_upcoming_deadlines.php?UserID=${UserID}`
            );
            
            if (deadlinesResponse.ok) {
              const deadlinesResult = await deadlinesResponse.json();
              
              if (deadlinesResult.status === "success" && deadlinesResult.deadlines) {
                setUpcomingDeadlines(deadlinesResult.deadlines);
                setFilteredDeadlines(deadlinesResult.deadlines);
              } else {
                setUpcomingDeadlines([]);
                setFilteredDeadlines([]);
              }
            } else {
              setUpcomingDeadlines([]);
              setFilteredDeadlines([]);
            }
          } catch (error) {
            console.error("Error fetching deadlines:", error);
            setUpcomingDeadlines([]);
            setFilteredDeadlines([]);
          }
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Get only first 4 projects for display
  const recentProjects = teacherProjects.slice(0, 4);

  const handleProjectClick = (project) => {
    if (setSelectedProject && setActivePage) {
      setSelectedProject(project);
      setActivePage("ProjectDashboard");
    }
  };

  const handleViewAllProjects = () => {
    setActivePage("Projects");
  };

  // Handle view task click
  const handleViewTask = (taskId, projectId) => {
    const project = teacherProjects.find(p => p.ProjectID === projectId);
    if (project && setSelectedProject && setActivePage) {
      setSelectedProject(project);
      setActivePage("ProjectDashboard");
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

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    });
  };

  // Get tasks based on active tab
  const getCurrentTabTasks = () => {
    if (loadingTasks) return [];
    
    switch(teacherActiveTaskTab) {
      case 'assigned':
        return projectTasks;
      case 'progress':
        return inProgressTasks;
      case 'review':
        return forReviewTasks;
      default:
        return [];
    }
  };

  return (
    <div className="teacher-dashboard">
      {/* USER HEADER */}
      <div className="teacher-dashboard-user">
        <h2>{teacherUserName || "Loading..."}</h2>
        <p>{teacherUserEmail} | {teacherUserRole}</p>
      </div>

      {/* MINI NAVBAR */}
      <div className="teacher-dashboard-mini-nav">
        <button
          className={teacherActiveTopTab === "projects" ? "active" : ""}
          onClick={() => setTeacherActiveTopTab("projects")}
        >
          <img
            src={teacherProjectsIcon}
            alt="Projects Icon"
            className="teacher-mini-nav-icon"
          />
          PROJECTS & TASKS
        </button>

        <button
          className={teacherActiveTopTab === "deadlines" ? "active" : ""}
          onClick={() => setTeacherActiveTopTab("deadlines")}
        >
          <img
            src={teacherProjectsIcon}
            alt="Deadlines Icon"
            className="teacher-mini-nav-icon"
          />
          UPCOMING DEADLINES
        </button>
      </div>

      {/* CONDITIONAL RENDERING */}
      {teacherActiveTopTab === "projects" ? (
        <>
          {/* RECENT PROJECTS */}
          <div className="teacher-dashboard-section">
            <div className="teacher-section-header">
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
              <div className="teacher-projects-placeholder">
                <p>Loading projects...</p>
              </div>
            ) : teacherProjects.length === 0 ? (
              <div className="teacher-projects-placeholder">
                <img src={teacherPlaceholderImg} alt="placeholder" />
                <p>No projects found. Join or create a project to get started.</p>
              </div>
            ) : (
              <div className="teacher-dashboard-project-grid">
                {recentProjects.map((proj) => (
                  <div
                    key={proj.ProjectID}
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

                        <div className="teacher-new-project-time" title={proj.TimeAgo || proj.createdAt || "Recently"}>
                          {truncateText(proj.TimeAgo || proj.createdAt || "Recently", 10)}
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
                ))}
              </div>
            )}
          </div>

          {/* TASK TABS */}
          <div className="teacher-task-tabs">
            <button
              className={teacherActiveTaskTab === "assigned" ? "active" : ""}
              onClick={() => setTeacherActiveTaskTab("assigned")}
            >
              PROJECT TASKS ({projectTasks.length})
            </button>
            <button
              className={teacherActiveTaskTab === "progress" ? "active" : ""}
              onClick={() => setTeacherActiveTaskTab("progress")}
            >
              IN PROGRESS ({inProgressTasks.length})
            </button>
            <button
              className={teacherActiveTaskTab === "review" ? "active" : ""}
              onClick={() => setTeacherActiveTaskTab("review")}
            >
              FOR REVIEW ({forReviewTasks.length})
            </button>
          </div>

          {/* TASK TABLE - with scrollable container showing 5 rows */}
          {loadingTasks ? (
            <div className="loading-spinner">Loading tasks...</div>
          ) : (
            <div className="teacher-task-table-container" style={{ 
              maxHeight: '260px', 
              overflowY: 'auto',
              border: '1px solid #eee',
              borderRadius: '8px',
              marginTop: '10px'
            }}>
              <table className="teacher-task-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#f6f6f6', zIndex: 1 }}>
                  <tr>
                    <th>TITLE</th>
                    <th>PROJECT</th>
                    <th>CREATION DATE</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {getCurrentTabTasks().length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>
                        No tasks found in this category.
                      </td>
                    </tr>
                  ) : (
                    getCurrentTabTasks().map((task) => (
                      <tr 
                        key={task.TaskID} 
                        onClick={() => handleViewTask(task.TaskID, task.ProjectID)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>{task.TaskName}</td>
                        <td>
                          <span className={`teacher-tag ${task.ProjectColor ? '' : 'orange'}`}>
                            {task.ProjectName}
                          </span>
                        </td>
                        <td>{formatDate(task.created_at)}</td>
                        <td>
                          <span className={`status-badge ${getStatusBadge(task.Status)}`}>
                            {getStatusText(task.Status)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        /* UPCOMING DEADLINES SECTION */
        <div className="deadlines-wrapper">
          {isLoading ? (
            <div className="loading-spinner">Loading deadlines...</div>
          ) : (
            <>
              {/* Quick Stats Cards */}
              <div className="deadlines-stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div className="stat-card highlight">
                  <div className="stat-number">{taskStats.completed}</div>
                  <div className="stat-label">COMPLETED TASKS</div>
                  <div className="stat-description">
                    Tasks completed across all projects
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">{projectStats.total}</div>
                  <div className="stat-label">ACTIVE PROJECTS</div>
                  <div className="stat-description">
                    Projects you're currently handling
                  </div>
                </div>
                <div className="stat-card warning">
                  <div className="stat-number">{taskStats.overdue}</div>
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
                  <div className="no-deadlines">
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
                              <span className={`due-date ${deadline.daysLeft === 0 ? 'urgent' : deadline.daysLeft === 1 ? 'warning' : deadline.daysLeft < 0 ? 'urgent' : ''}`}>
                                <i className="fa-solid fa-calendar"></i>
                                {deadline.dueDateFormatted}
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
  );
}

export default TeacherDashboard;