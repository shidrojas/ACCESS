import React, { useEffect, useState } from "react";
import "./admin.css";

function AdminLogs({ defaultTab = "user" }) {
  const [activeTab, setActiveTab] = useState(
    defaultTab === "event" ? "Event Logs" : "User Logs"
  );

  const [userLogs, setUserLogs] = useState([]);
  const [eventLogs, setEventLogs] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [eventSearch, setEventSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    fetch("https://accesspmt.bsit3a2025.com/api/admin/dashboard/fetch_user_logs.php")
      .then((res) => res.json())
      .then((data) => setUserLogs(data))
      .catch((err) => console.error("Error fetching user logs:", err));
  }, []);

  useEffect(() => {
    fetch("https://accesspmt.bsit3a2025.com/api/admin/dashboard/fetch_event_logs.php")
      .then((res) => res.json())
      .then((data) => setEventLogs(data))
      .catch((err) => console.error("Error fetching event logs:", err));
  }, []);

  // Format date for display
  const formatDisplayDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "2-digit",
    });
  };

  // Format date for filter input (YYYY-MM-DD)
  const formatDateForFilter = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Format datetime for display
  const formatDateTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  };

  const filteredUserLogs = userLogs.filter((log) => {
    const logDate = new Date(log.date).toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "2-digit",
    });
    
    const matchesText =
      log.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
      log.date?.toLowerCase().includes(userSearch.toLowerCase());
    
    const matchesDate = !dateFilter || logDate === formatDisplayDate(dateFilter);
    
    return matchesText && matchesDate;
  });

  const filteredEventLogs = eventLogs.filter((log) => {
    const logDate = new Date(log.date).toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "2-digit",
    });
    
    const matchesText =
      log.email?.toLowerCase().includes(eventSearch.toLowerCase()) ||
      log.action?.toLowerCase().includes(eventSearch.toLowerCase()) ||
      log.handler?.toLowerCase().includes(eventSearch.toLowerCase()) ||
      log.date?.toLowerCase().includes(eventSearch.toLowerCase());
    
    const matchesDate = !dateFilter || logDate === formatDisplayDate(dateFilter);
    
    return matchesText && matchesDate;
  });

  return (
    <div className="user-management-container">
      <div className="logs-header">
        <h2>Logs</h2>
        <p>Monitor system activities and user actions.</p>
      </div>

      <div className="logs-tabs">
        <button
          className={activeTab === "User Logs" ? "active-tab" : ""}
          onClick={() => setActiveTab("User Logs")}
        >
          User Logs
        </button>
        <button
          className={activeTab === "Event Logs" ? "active-tab" : ""}
          onClick={() => setActiveTab("Event Logs")}
        >
          Event Logs
        </button>
      </div>
      
      <div className="logs-search-wrapper">
        {activeTab === "User Logs" ? (
          <>
            <input
              type="search"
              placeholder="Search by email or date..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
            <input
              type="date"
              value={formatDateForFilter(dateFilter)}
              onChange={(e) => setDateFilter(e.target.value)}
              style={{
                marginLeft: "12px",
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #ccc",
              }}
            />
          </>
        ) : (
          <>
            <input
              type="search"
              placeholder="Search email, action, handler or date..."
              value={eventSearch}
              onChange={(e) => setEventSearch(e.target.value)}
            />
            <input
              type="date"
              value={formatDateForFilter(dateFilter)}
              onChange={(e) => setDateFilter(e.target.value)}
              style={{
                marginLeft: "12px",
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #ccc",
              }}
            />
          </>
        )}
      </div>

      <div className="table-shadow-wrapper">
        <div className="scrollable-table">
          <table>
            <thead>
              {activeTab === "User Logs" ? (
                <tr>
                  <th>E-MAIL</th>
                  <th>LOGIN IN</th>
                  <th>LOG OUT</th>
                  <th>DATE</th>
                </tr>
              ) : (
                <tr>
                  <th>E-MAIL</th>
                  <th>ACTION</th>
                  <th>USER</th>
                  <th>DATE AND TIME</th>
                </tr>
              )}
            </thead>

            <tbody>
              {activeTab === "User Logs"
                ? filteredUserLogs.map((log, i) => (
                    <tr key={i}>
                      <td>{log.email}</td>
                      <td>{log.timeIn}</td>
                      <td>{log.timeOut}</td>
                      <td>{formatDisplayDate(log.date)}</td>
                    </tr>
                  ))
                : filteredEventLogs.map((log, i) => (
                    <tr key={i}>
                      <td>{log.email}</td>
                      <td>{log.action}</td>
                      <td>{log.handler}</td>
                      <td>{formatDateTime(log.date)}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AdminLogs;