import React, { useEffect, useState } from "react";
import "../AdminForm/admin.css";

function DashboardCards({ setActivePage, setLogsTab }) {
  const [userLogs, setUserLogs] = useState([]);
  const [eventLogs, setEventLogs] = useState([]);
  const [userStats, setUserStats] = useState({
    total: 0,
    active: 0,
    deactivated: 0
  });

  // Fetch user logs
  useEffect(() => {
    fetch("https://accesspmt.bsit3a2025.com/api/admin/dashboard/fetch_user_logs.php")
      .then((res) => res.json())
      .then((data) => setUserLogs(data))
      .catch((err) => console.error("Error fetching user logs:", err));
  }, []);

  // Fetch event logs
  useEffect(() => {
    fetch("https://accesspmt.bsit3a2025.com/api/admin/dashboard/fetch_event_logs.php")
      .then((res) => res.json())
      .then((data) => setEventLogs(data))
      .catch((err) => console.error("Error fetching event logs:", err));
  }, []);

  // Fetch all users and calculate statistics
  useEffect(() => {
    fetch("https://accesspmt.bsit3a2025.com/api/admin/usermanagement/fetch_all_users.php")
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "success" && Array.isArray(data.users)) {
          // Calculate statistics from the users array
          const total = data.users.length;
          const active = data.users.filter(user => user.status === "Active").length;
          const deactivated = data.users.filter(user => user.status === "Deactivated").length;
          
          setUserStats({
            total: total,
            active: active,
            deactivated: deactivated
          });
          
          console.log("User stats calculated:", { total, active, deactivated });
        }
      })
      .catch((err) => console.error("Error fetching user stats:", err));
  }, []);

  const recentUserLogs = userLogs.slice(0, 5);
  const recentEventLogs = eventLogs.slice(0, 3);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "2-digit",
    });
  };

  return (
    <>
      {/* Overview Cards - Non-clickable with colors */}
      <div style={{ 
        maxWidth: "1200px", 
        margin: "0 auto -15px auto", 
        padding: "30px 20px",
        display: "flex",
        gap: "20px"
      }}>
        {/* Total Users Card - Non-clickable */}
        <div 
          className="dashboard-stat-box total-users"
          style={{ 
            flex: 1,
            padding: "20px",
            textAlign: "center",
            borderRadius: "8px",
            boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
            cursor: "default",
            transition: "none"
          }}
        >
          <h3 style={{ margin: "0 0 10px 0", fontSize: "12px", color: "rgba(255,255,255,0.9)" }}>TOTAL USERS</h3>
          <p style={{ margin: 0, fontSize: "24px", fontWeight: "bold", color: "#ffffff" }}>
            {userStats.total}
          </p>
        </div>

        {/* Active Users Card - Non-clickable */}
        <div 
          className="dashboard-stat-box active-users"
          style={{ 
            flex: 1,
            padding: "20px",
            textAlign: "center",
            borderRadius: "8px",
            boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
            cursor: "default",
            transition: "none"
          }}
        >
          <h3 style={{ margin: "0 0 10px 0", fontSize: "12px", color: "rgba(255,255,255,0.9)" }}>ACTIVE USERS</h3>
          <p style={{ margin: 0, fontSize: "24px", fontWeight: "bold", color: "#ffffff" }}>
            {userStats.active}
          </p>
        </div>

        {/* Deactivated Users Card - Non-clickable */}
        <div 
          className="dashboard-stat-box deactivated-users"
          style={{ 
            flex: 1,
            padding: "20px",
            textAlign: "center",
            borderRadius: "8px",
            boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
            cursor: "default",
            transition: "none"
          }}
        >
          <h3 style={{ margin: "0 0 10px 0", fontSize: "12px", color: "rgba(255,255,255,0.9)" }}>DEACTIVATED USERS</h3>
          <p style={{ margin: 0, fontSize: "24px", fontWeight: "bold", color: "#ffffff" }}>
            {userStats.deactivated}
          </p>
        </div>
      </div>

      {/* Logs Cards */}
      <div className="dashboard-cards-container">
        {/* USER LOGS */}
        <div className="card auto-height-card">
          <h3>User Logs</h3>
          <p>Recent login sessions of users</p>

          <div className="table-wrapper responsive-height">
            <table>
              <thead>
                <tr>
                  <th>E-MAIL</th>
                  <th>LOGIN IN</th>
                  <th>LOG OUT</th>
                  <th>DATE</th>
                </tr>
              </thead>
              <tbody>
                {recentUserLogs.map((log, i) => (
                  <tr key={i}>
                    <td>{log.email}</td>
                    <td>{log.timeIn}</td>
                    <td>{log.timeOut}</td>
                    <td>{formatDate(log.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="view-all-wrapper">
            <button
              className="modern-view-link"
              onClick={() => {
                setLogsTab("user");
                setActivePage("Logs");
              }}
            >
              View All <span className="arrow">→</span>
            </button>
          </div>
        </div>

        {/* EVENT LOGS */}
        <div className="card auto-height-card">
          <h3>Event Logs</h3>
          <p>Recent updates to the system and changes made</p>

          <div className="table-wrapper responsive-height">
            <table>
              <thead>
                <tr>
                  <th>E-MAIL</th>
                  <th>ACTION</th>
                  <th>USER</th>
                  <th>DATE</th>
                </tr>
              </thead>
              <tbody>
                {recentEventLogs.map((log, i) => (
                  <tr key={i}>
                    <td>{log.email}</td>
                    <td>{log.action}</td>
                    <td>{log.handler}</td>
                    <td>{formatDate(log.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="view-all-wrapper">
            <button
              className="modern-view-link"
              onClick={() => {
                setLogsTab("event");
                setActivePage("Logs");
              }}
            >
              View All <span className="arrow">→</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default DashboardCards;