import React, { useState, useEffect } from "react";
import "../AdminForm/admin.css";

function AdminUserManagement({ showMessage }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  // Popups
  const [showCreatePopup, setShowCreatePopup] = useState(false);
  const [showDeactivatePopup, setShowDeactivatePopup] = useState(false);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [showOtpPopup, setShowOtpPopup] = useState(false);
  
  // Custom Alert Popup
  const [showAlertPopup, setShowAlertPopup] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState("info"); // info, success, error, warning

  const [otp, setOtp] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [newInstructor, setNewInstructor] = useState({
    firstName: "",
    lastName: "",
    role: "Instructor",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [editUser, setEditUser] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });

  // Custom alert function
  const showCustomAlert = (message, type = "info") => {
    setAlertMessage(message);
    setAlertType(type);
    setShowAlertPopup(true);
  };

  // Fetch users from backend
  useEffect(() => {
    fetch("https://accesspmt.bsit3a2025.com/api/admin/usermanagement/fetch_all_users.php")
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "success") {
          setUsers(data.users);
        } else {
          showCustomAlert("Failed to fetch users!", "error");
        }
      })
      .catch((err) => {
        console.error(err);
        showCustomAlert("Server error while fetching users!", "error");
      });
  }, []);

  // Calculate statistics by role and status
  const getStatsByRole = (role) => {
    const roleUsers = users.filter(u => u.role === role);
    const active = roleUsers.filter(u => u.status === "Active").length;
    const deactivated = roleUsers.filter(u => u.status === "Deactivated").length;
    return { active, deactivated, total: roleUsers.length };
  };

  // Handlers
  const handleDeactivate = async () => {
    if (!selectedUser) return;
    try {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      if (!storedUser) return showCustomAlert("Admin not logged in", "error");

      const response = await fetch(
        "https://accesspmt.bsit3a2025.com/api/admin/usermanagement/toggle_user_status.php",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: selectedUser.id,
            adminId: storedUser.user_id
          }),
        }
      );

      const data = await response.json();

      if (data.status === "success") {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === selectedUser.id ? { ...u, status: data.newStatus } : u
          )
        );
        setShowDeactivatePopup(false);
        showCustomAlert(`User account ${data.newStatus.toLowerCase()} successfully!`, "success");
      } else {
        showCustomAlert(data.message, "error");
      }
    } catch (err) {
      console.error(err);
      showCustomAlert("Server error while toggling user status", "error");
    }
  };

  const handleEditSave = async () => {
    if (!editUser.firstName || !editUser.lastName || !editUser.email) {
      showCustomAlert("Please fill all fields!", "warning");
      return;
    }

    try {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      if (!storedUser) return showCustomAlert("Admin not logged in", "error");

      const response = await fetch(
        "https://accesspmt.bsit3a2025.com/api/admin/usermanagement/update_user.php",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: selectedUser.id,
            firstName: editUser.firstName,
            lastName: editUser.lastName,
            email: editUser.email,
            adminId: storedUser.user_id
          }),
        }
      );

      const data = await response.json();

      if (data.status === "success") {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === selectedUser.id ? { ...u, ...editUser } : u
          )
        );
        setShowEditPopup(false);
        showCustomAlert("User updated successfully!", "success");
      } else {
        showCustomAlert(data.message, "error");
      }
    } catch (err) {
      console.error(err);
      showCustomAlert("Server error.", "error");
    }
  };

  const logEvent = async (action, targetEmail) => {
    try {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      if (!storedUser) return;

      await fetch("https://accesspmt.bsit3a2025.com/api/admin/event_logs.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminId: storedUser.user_id,
          action: action,
          targetEmail: targetEmail
        }),
      });
    } catch (err) {
      console.error("Event log failed:", err);
    }
  };

  const handleAddInstructor = async () => {
    if (
      !newInstructor.firstName ||
      !newInstructor.lastName ||
      !newInstructor.email ||
      !newInstructor.password ||
      newInstructor.password !== newInstructor.confirmPassword
    ) {
      showCustomAlert("Please fill all fields correctly!", "warning");
      return;
    }

    if (newInstructor.password.length < 6) {
      showCustomAlert("Password must be at least 6 characters!", "warning");
      return;
    }

    try {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      if (!storedUser) return showCustomAlert("Admin not logged in", "error");

      const res = await fetch(
        "https://accesspmt.bsit3a2025.com/api/authentication/admin_create_user.php",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            FirstName: newInstructor.firstName,
            LastName: newInstructor.lastName,
            Email: newInstructor.email,
            Password: newInstructor.password,
            Role: newInstructor.role,
            AdminID: storedUser.user_id,
          }),
        }
      );

      const data = await res.json();

      if (data.status === "success") {
        setShowCreatePopup(false);
        setShowOtpPopup(true);
      } else {
        showCustomAlert(data.message, "error");
      }
    } catch (err) {
      console.error(err);
      showCustomAlert("Server error.", "error");
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      showCustomAlert("Enter a valid 6-digit OTP!", "warning");
      return;
    }

    try {
      const verifyRes = await fetch(
        "https://accesspmt.bsit3a2025.com/api/authentication/verify_otp.php",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            Email: newInstructor.email,
            OTP: otp,
          }),
        }
      );

      const verifyData = await verifyRes.json();

      if (verifyData.status === "success") {
        const refresh = await fetch(
          "https://accesspmt.bsit3a2025.com/api/admin/usermanagement/fetch_all_users.php"
        );
        const refreshData = await refresh.json();
        if (refreshData.status === "success") {
          setUsers(refreshData.users);
        }

        await logEvent("Created account", newInstructor.email);

        setShowOtpPopup(false);
        setOtp("");
        setNewInstructor({
          firstName: "",
          lastName: "",
          role: "Instructor",
          email: "",
          password: "",
          confirmPassword: "",
        });

        showCustomAlert("Account created successfully!", "success");
      } else {
        showCustomAlert(verifyData.message, "error");
      }
    } catch (err) {
      console.error(err);
      showCustomAlert("OTP verification failed.", "error");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewInstructor({ ...newInstructor, [name]: value });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditUser({ ...editUser, [name]: value });
  };

  const filteredUsers = users.filter((u) => {
    const matchesRole = roleFilter === "" || u.role === roleFilter;
    const matchesText =
      u.firstName.toLowerCase().includes(search.toLowerCase()) ||
      u.lastName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      u.status.toLowerCase().includes(search.toLowerCase());

    return matchesRole && (matchesText || matchesStatus);
  });

  const totalStats = {
    active: users.filter(u => u.status === "Active").length,
    deactivated: users.filter(u => u.status === "Deactivated").length,
    total: users.length
  };

  return (
    <div className="user-management-container">
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

      <h2>USER MANAGEMENT DASHBOARD</h2>
      <p>
        UMD allows administrators to efficiently manage system users in one centralized interface.
      </p>

      {/* Search */}
      <div className="recent-projects-header">
        <div className="search-bar">
          <input
            type="search"
            className="search-input"
            placeholder="Search by name, email or status..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="search-submit">
            <i className="fa-solid fa-magnifying-glass"></i>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats">
        <div className="stat-box total-users-clickable" onClick={() => setRoleFilter("")}>
          TOTAL USERS
          <div className="stat-number">{totalStats.total}</div>
          <div className="stat-breakdown">
            <span className="active-count">Active: {totalStats.active}</span>
            <span className="deactivated-count">Deactivated: {totalStats.deactivated}</span>
          </div>
        </div>

        <div className="stat-box students-clickable" onClick={() => setRoleFilter("Student")}>
          STUDENTS
          <div className="stat-number">{getStatsByRole("Student").total}</div>
          <div className="stat-breakdown">
            <span className="active-count">Active: {getStatsByRole("Student").active}</span>
            <span className="deactivated-count">Deactivated: {getStatsByRole("Student").deactivated}</span>
          </div>
        </div>

        <div className="stat-box instructors-clickable" onClick={() => setRoleFilter("Instructor")}>
          INSTRUCTORS
          <div className="stat-number">{getStatsByRole("Instructor").total}</div>
          <div className="stat-breakdown">
            <span className="active-count">Active: {getStatsByRole("Instructor").active}</span>
            <span className="deactivated-count">Deactivated: {getStatsByRole("Instructor").deactivated}</span>
          </div>
        </div>

        <div className="stat-box admins-clickable" onClick={() => setRoleFilter("Admin")}>
          ADMINS
          <div className="stat-number">{getStatsByRole("Admin").total}</div>
          <div className="stat-breakdown">
            <span className="active-count">Active: {getStatsByRole("Admin").active}</span>
            <span className="deactivated-count">Deactivated: {getStatsByRole("Admin").deactivated}</span>
          </div>
        </div>
      </div>

      {/* User Table */}
      <div className="user-list-section">
        <div className="table-scroll-wrapper">
          <table className="user-table">
            <thead>
              <tr>
                <th>FIRST NAME</th>
                <th>LAST NAME</th>
                <th>ROLE</th>
                <th>E-MAIL</th>
                <th>DATE</th>
                <th>STATUS</th>
                <th style={{ textAlign: "right" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className={user.status === "Deactivated" ? "deactivated-row" : ""}>
                  <td>{user.firstName}</td>
                  <td>{user.lastName}</td>
                  <td>{user.role}</td>
                  <td>{user.email}</td>
                  <td>{user.date}</td>
                  <td style={{ color: user.status === "Active" ? "#27ae60" : "#e74c3c", fontWeight: "500" }}>
                    {user.status === "Active" ? "Active" : "Deactivated"}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {(user.role === "Student" || user.role === "Instructor" || user.role === "Admin") && (
                      <i
                        className="fa-solid fa-pen-to-square edit-icon"
                        title="Edit User"
                        onClick={() => {
                          setSelectedUser(user);
                          setEditUser({
                            firstName: user.firstName,
                            lastName: user.lastName,
                            email: user.email,
                          });
                          setShowEditPopup(true);
                        }}
                      ></i>
                    )}
                    <i
                      className={`fa-solid ${user.status === "Active" ? "fa-user-slash deactivate-icon" : "fa-user-check activate-icon"}`}
                      title={user.status === "Active" ? "Deactivate User" : "Activate User"}
                      onClick={() => {
                        setSelectedUser(user);
                        setShowDeactivatePopup(true);
                      }}
                    ></i>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="create-btn-wrapper">
          <button className="create-btn" onClick={() => setShowCreatePopup(true)}>
            CREATE ACCOUNT
          </button>
        </div>
      </div>

      {/* CREATE POPUP */}
      {showCreatePopup && (
        <div className="modern-popup-overlay">
          <div className="modern-popup large">
            <div className="modern-popup-header">
              <h3>✨ Create New Account</h3>
              <p>Add a new instructor or admin to the system</p>
            </div>
            <div className="modern-popup-content">
              <div className="form-group">
                <label>First Name</label>
                <input type="text" name="firstName" placeholder="Enter first name" value={newInstructor.firstName} onChange={handleInputChange}/>
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input type="text" name="lastName" placeholder="Enter last name" value={newInstructor.lastName} onChange={handleInputChange}/>
              </div>
              <div className="form-group">
                <label>Role</label>
                <select name="role" value={newInstructor.role} onChange={handleInputChange}>
                  <option value="Instructor">Instructor</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" name="email" placeholder="Enter email address" value={newInstructor.email} onChange={handleInputChange}/>
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" name="password" placeholder="Create password" value={newInstructor.password} onChange={handleInputChange}/>
              </div>
              <div className="form-group">
                <label>Confirm Password</label>
                <input type="password" name="confirmPassword" placeholder="Confirm password" value={newInstructor.confirmPassword} onChange={handleInputChange}/>
              </div>
            </div>
            <div className="modern-popup-footer double-buttons">
              <button className="modern-btn modern-btn-secondary" onClick={() => setShowCreatePopup(false)}>
                Cancel
              </button>
              <button className="modern-btn modern-btn-primary" onClick={handleAddInstructor}>
                Create Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OTP VERIFICATION POPUP */}
      {showOtpPopup && (
        <div className="modern-popup-overlay">
          <div className="modern-popup">
            <div className="modern-popup-header">
              <h3>✉️ Email Verification</h3>
              <p>Enter the verification code sent to {newInstructor.email}</p>
            </div>
            <div className="modern-popup-content">
              <div className="otp-container">
                {otp.split("").concat(Array(6).fill("")).slice(0,6).map((digit, index) => (
                  <input
                    key={index}
                    type="text"
                    maxLength="1"
                    value={digit}
                    onChange={(e) => {
                      if (!/^\d?$/.test(e.target.value)) return;
                      const newOtp = otp.split("");
                      newOtp[index] = e.target.value;
                      setOtp(newOtp.join(""));
                      if (e.target.value && index < 5) {
                        const next = document.getElementById(`otp-input-${index + 1}`);
                        next && next.focus();
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace" && !otp[index] && index > 0) {
                        const prev = document.getElementById(`otp-input-${index - 1}`);
                        prev && prev.focus();
                      }
                    }}
                    id={`otp-input-${index}`}
                    className="otp-input"
                  />
                ))}
              </div>
              <div style={{ textAlign: "center", marginTop: "12px" }}>
                <button
                  className="modern-link-btn"
                  onClick={async () => {
                    try {
                      const res = await fetch(
                        "https://accesspmt.bsit3a2025.com/api/authentication/resend_admin_otp.php",
                        {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ Email: newInstructor.email }),
                        }
                      );
                      const data = await res.json();
                      if (data.status === "success") {
                        showCustomAlert("Verification code resent successfully!", "success");
                        setOtp("");
                      } else {
                        showCustomAlert(data.message || "Failed to resend code", "error");
                      }
                    } catch {
                      showCustomAlert("Failed to resend verification code.", "error");
                    }
                  }}
                >
                  Resend Verification Code
                </button>
              </div>
            </div>
            <div className="modern-popup-footer double-buttons">
              <button
                className="modern-btn modern-btn-secondary"
                onClick={async () => {
                  if (!newInstructor.email) return;
                  try {
                    const storedUser = JSON.parse(localStorage.getItem("user"));
                    const res = await fetch(
                      "https://accesspmt.bsit3a2025.com/api/authentication/cancel_admin_registration.php",
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          Email: newInstructor.email,
                          AdminID: storedUser.user_id,
                        }),
                      }
                    );
                    const data = await res.json();
                    if (data.status === "success") {
                      setShowOtpPopup(false);
                      setNewInstructor({
                        firstName: "",
                        lastName: "",
                        role: "Instructor",
                        email: "",
                        password: "",
                        confirmPassword: "",
                      });
                      setOtp("");
                      showCustomAlert("Account creation cancelled.", "info");
                    }
                  } catch (err) {
                    console.error(err);
                    showCustomAlert("Failed to cancel registration.", "error");
                  }
                }}
              >
                Cancel
              </button>
              <button className="modern-btn modern-btn-primary" onClick={handleVerifyOtp}>
                Verify & Complete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DEACTIVATE / ACTIVATE POPUP */}
      {showDeactivatePopup && selectedUser && (
        <div className="modern-popup-overlay">
          <div className="modern-popup">
            <div className="modern-popup-header" style={{
              background: selectedUser.status === "Active" 
                ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
                : "linear-gradient(135deg, #10b981 0%, #059669 100%)"
            }}>
              <h3>{selectedUser.status === "Active" ? "⚠️ Deactivate User" : "✅ Activate User"}</h3>
              <p>
                {selectedUser.status === "Active" 
                  ? "This action will suspend the user's account"
                  : "This action will restore the user's account"}
              </p>
            </div>
            <div className="modern-popup-content">
              <div className="user-info-display">
                <p><strong>Name:</strong> {selectedUser.firstName} {selectedUser.lastName}</p>
                <p><strong>Email:</strong> {selectedUser.email}</p>
                <p><strong>Role:</strong> {selectedUser.role}</p>
                <p><strong>Current Status:</strong> 
                  <span style={{ 
                    color: selectedUser.status === "Active" ? "#10b981" : "#ef4444",
                    fontWeight: "600",
                    marginLeft: "8px"
                  }}>
                    {selectedUser.status}
                  </span>
                </p>
              </div>
              <div className="info-box">
                <p>
                  {selectedUser.status === "Active" 
                    ? "⚠️ Deactivated users will lose access to the system until reactivated."
                    : "✅ Activated users will regain full access to the system."}
                </p>
              </div>
            </div>
            <div className="modern-popup-footer double-buttons">
              <button className="modern-btn modern-btn-secondary" onClick={() => setShowDeactivatePopup(false)}>
                Cancel
              </button>
              <button 
                className={`modern-btn ${selectedUser.status === "Active" ? "modern-btn-danger" : "modern-btn-success"}`}
                onClick={handleDeactivate}
              >
                {selectedUser.status === "Active" ? "Deactivate User" : "Activate User"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT POPUP */}
      {showEditPopup && selectedUser && (
        <div className="modern-popup-overlay">
          <div className="modern-popup">
            <div className="modern-popup-header">
              <h3>✏️ Edit User Information</h3>
              <p>Update user details</p>
            </div>
            <div className="modern-popup-content">
              <div className="form-group">
                <label>First Name</label>
                <input type="text" name="firstName" placeholder="First Name" value={editUser.firstName} onChange={handleEditChange} />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input type="text" name="lastName" placeholder="Last Name" value={editUser.lastName} onChange={handleEditChange} />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" name="email" placeholder="Email" value={editUser.email} onChange={handleEditChange} />
              </div>
            </div>
            <div className="modern-popup-footer double-buttons">
              <button className="modern-btn modern-btn-secondary" onClick={() => setShowEditPopup(false)}>
                Cancel
              </button>
              <button className="modern-btn modern-btn-primary" onClick={handleEditSave}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminUserManagement;