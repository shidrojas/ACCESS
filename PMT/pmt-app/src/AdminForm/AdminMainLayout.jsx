import React, { useState, useEffect } from "react";
import AdminSidebar from "../navigationbar/adminSidebar";
import Navbar2 from "../navigationbar/navbar2";
import "../pages/pages.css";

import AdminDashboard from "./AdminDashboard";
import AdminUserManagement from "./AdminUserManagement";
import AdminSettings from "./AdminSettings";
import AdminLogs from "../AdminForm/AdminLogs";

function AdminMainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activePage, setActivePage] = useState("Dashboard");
  const [message, setMessage] = useState("");
  const [logsTab, setLogsTab] = useState("user");
  const [showPasswordPopup, setShowPasswordPopup] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [adminId, setAdminId] = useState(null);
  
  // New state for password change flow
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showOtpPopup, setShowOtpPopup] = useState(false);
  const [otpInput, setOtpInput] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) {
      console.log("Stored user:", storedUser);
      setAdminId(Number(storedUser.user_id));
    } else {
      console.log("No user found in localStorage");
    }
  }, []);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const showMessageToast = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
  };

  const handleSetActivePage = (page) => {
    if (page === "User Management" && activePage !== "User Management") {
      setShowPasswordPopup(true);
    } else {
      setActivePage(page);
    }
  };

  // Verify admin password with backend
  const handlePasswordSubmit = async () => {
    if (!adminId) {
      alert("Admin not logged in");
      return;
    }

    if (!passwordInput) {
      alert("Please enter password");
      return;
    }

    setIsLoading(true);
    try {
      console.log("Verifying password for admin ID:", adminId);
      
      const response = await fetch("https://accesspmt.bsit3a2025.com/api/admin/verify_admin_password.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminId: adminId,
          password: passwordInput
        }),
      });

      const data = await response.json();
      console.log("Verification response:", data);

      if (data.status === "success") {
        setActivePage("User Management");
        setShowPasswordPopup(false);
        setPasswordInput("");
        showMessageToast("Access granted!");
      } else {
        alert(data.message || "Incorrect password!");
        setPasswordInput("");
      }
    } catch (err) {
      console.error("Password verification error:", err);
      alert("Server error. Please check console for details.");
    } finally {
      setIsLoading(false);
    }
  };

  // Send OTP for password change
  const handleSendOtp = async () => {
    console.log("Sending OTP for admin ID:", adminId);
    
    if (!adminId) {
      alert("Admin not logged in");
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch("https://accesspmt.bsit3a2025.com/api/admin/send_admin_password_otp.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId: adminId }),
      });

      const data = await response.json();
      console.log("OTP send response:", data);

      if (data.status === "success") {
        setShowChangePassword(false);
        setShowOtpPopup(true);
        showMessageToast("OTP sent to your email!");
      } else {
        alert(data.message || "Failed to send OTP");
      }
    } catch (err) {
      console.error("OTP send error:", err);
      alert("Server error. Please check console for details.");
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (!adminId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch("https://accesspmt.bsit3a2025.com/api/admin/resend_admin_password_otp.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId: adminId }),
      });

      const data = await response.json();

      if (data.status === "success") {
        showMessageToast("OTP resent successfully!");
        setOtpInput(["", "", "", "", "", ""]);
      } else {
        alert(data.message || "Failed to resend OTP");
      }
    } catch (err) {
      console.error("Resend OTP error:", err);
      alert("Server error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP input change
  const handleOtpChange = (e, index) => {
    const value = e.target.value.replace(/\D/g, "");
    const newOtp = [...otpInput];
    newOtp[index] = value;
    setOtpInput(newOtp);
    
    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (!otpInput[index] && index > 0) {
        const prevInput = document.getElementById(`otp-input-${index - 1}`);
        if (prevInput) prevInput.focus();
      }
    }
  };

  // Verify OTP and update password
  const handleVerifyOtpAndUpdate = async () => {
    const otpCode = otpInput.join("");
    if (otpCode.length !== 6) {
      alert("Please enter complete 6-digit OTP");
      return;
    }

    if (!newPassword || !confirmPassword) {
      alert("Please enter new password");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    if (newPassword.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    try {
      const verifyResponse = await fetch("https://accesspmt.bsit3a2025.com/api/admin/verify_admin_password_otp.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminId: adminId,
          otp: otpCode
        }),
      });

      const verifyData = await verifyResponse.json();
      console.log("OTP verification response:", verifyData);

      if (verifyData.status === "success") {
        const updateResponse = await fetch("https://accesspmt.bsit3a2025.com/api/admin/update_admin_password.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            adminId: adminId,
            newPassword: newPassword
          }),
        });

        const updateData = await updateResponse.json();
        console.log("Password update response:", updateData);

        if (updateData.status === "success") {
          alert("Password updated successfully!");
          setShowOtpPopup(false);
          setOtpInput(["", "", "", "", "", ""]);
          setNewPassword("");
          setConfirmPassword("");
          showMessageToast("Password updated successfully!");
        } else {
          alert(updateData.message || "Failed to update password");
        }
      } else {
        alert(verifyData.message || "Invalid OTP");
      }
    } catch (err) {
      console.error("Password update error:", err);
      alert("Server error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderPage = () => {
    switch (activePage) {
      case "Dashboard":
        return (
          <AdminDashboard
            showMessage={showMessageToast}
            setActivePage={setActivePage}
            setLogsTab={setLogsTab}
          />
        );
      case "User Management":
        return <AdminUserManagement showMessage={showMessageToast} />;
      case "Profile Settings":
        return <AdminSettings showMessage={showMessageToast} />;
      case "Logs":
        return <AdminLogs defaultTab={logsTab} />;
      default:
        return (
          <AdminDashboard
            showMessage={showMessageToast}
            setActivePage={setActivePage}
            setLogsTab={setLogsTab}
          />
        );
    }
  };

  return (
    <div className="dashboard-container" style={{ display: "flex", height: "100vh" }}>
      <AdminSidebar
        isOpen={sidebarOpen}
        setActivePage={handleSetActivePage}
        activePage={activePage}
      />

      <div className="main-content" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Navbar2 toggleSidebar={toggleSidebar} activePage={activePage} sidebarOpen={sidebarOpen} />

        {message && (
          <div
            style={{
              position: "fixed",
              top: 20,
              right: 20,
              background: "#4caf50",
              color: "#fff",
              padding: "10px 20px",
              borderRadius: "5px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
              zIndex: 1000,
            }}
          >
            {message}
          </div>
        )}

        {/* Modern Password Verification Popup */}
        {showPasswordPopup && (
          <div className="modern-popup-overlay">
            <div className="modern-popup">
              <div className="modern-popup-header">
                <h3>🔐 Admin Verification</h3>
                <p>Please verify your identity to access user management</p>
              </div>
              <div className="modern-popup-content">
                <div className="form-group">
                  <label>Enter Password</label>
                  <input
                    type="password"
                    placeholder="Enter your admin password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    disabled={isLoading}
                    autoFocus
                  />
                </div>

                {Number(adminId) === 1 && (
                  <div style={{ marginTop: "12px", textAlign: "right" }}>
                    <button
                      className="modern-link-btn"
                      onClick={() => {
                        setShowPasswordPopup(false);
                        setShowChangePassword(true);
                      }}
                      disabled={isLoading}
                    >
                      Forgot Password?
                    </button>
                  </div>
                )}
              </div>
              <div className="modern-popup-footer double-buttons">
                <button
                  className="modern-btn modern-btn-secondary"
                  onClick={() => {
                    setShowPasswordPopup(false);
                    setPasswordInput("");
                  }}
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button 
                  className="modern-btn modern-btn-primary" 
                  onClick={handlePasswordSubmit}
                  disabled={isLoading}
                >
                  {isLoading ? "Verifying..." : "Verify & Continue"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modern Change Password Popup */}
        {showChangePassword && (
          <div className="modern-popup-overlay">
            <div className="modern-popup">
              <div className="modern-popup-header">
                <h3>🔄 Change Password</h3>
                <p>Secure your account with a new password</p>
              </div>
              <div className="modern-popup-content">
                <div className="info-box">
                  <p>📧 A verification code will be sent to your registered email address</p>
                </div>
              </div>
              <div className="modern-popup-footer double-buttons">
                <button
                  className="modern-btn modern-btn-secondary"
                  onClick={() => setShowChangePassword(false)}
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button 
                  className="modern-btn modern-btn-primary" 
                  onClick={handleSendOtp}
                  disabled={isLoading}
                >
                  {isLoading ? "Sending..." : "Send Verification Code"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modern OTP Verification Popup */}
        {showOtpPopup && (
          <div className="modern-popup-overlay">
            <div className="modern-popup large">
              <div className="modern-popup-header">
                <h3>✉️ OTP Verification</h3>
                <p>Enter the 6-digit code sent to your email</p>
              </div>
              <div className="modern-popup-content">
                <div className="otp-container">
                  {otpInput.map((digit, index) => (
                    <input
                      key={index}
                      id={`otp-input-${index}`}
                      type="text"
                      maxLength="1"
                      value={digit}
                      onChange={(e) => handleOtpChange(e, index)}
                      onKeyDown={(e) => handleOtpKeyDown(e, index)}
                      className="otp-input"
                      disabled={isLoading}
                      autoFocus={index === 0}
                    />
                  ))}
                </div>

                <div className="form-group">
                  <label>New Password</label>
                  <input
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                
                <div className="form-group">
                  <label>Confirm New Password</label>
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div style={{ textAlign: "center", marginTop: "12px" }}>
                  <button
                    className="modern-link-btn"
                    onClick={handleResendOtp}
                    disabled={isLoading}
                  >
                    Resend Verification Code
                  </button>
                </div>
              </div>
              <div className="modern-popup-footer double-buttons">
                <button
                  className="modern-btn modern-btn-secondary"
                  onClick={() => {
                    setShowOtpPopup(false);
                    setOtpInput(["", "", "", "", "", ""]);
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button 
                  className="modern-btn modern-btn-primary" 
                  onClick={handleVerifyOtpAndUpdate}
                  disabled={isLoading}
                >
                  {isLoading ? "Updating..." : "Update Password"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div
          className="content-area"
          style={{
            flex: 1,
            padding: "20px",
            background: "#f5f5f5",
            overflow: "auto",
          }}
        >
          {renderPage()}
        </div>
      </div>
    </div>
  );
}

export default AdminMainLayout;