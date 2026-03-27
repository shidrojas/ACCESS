import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import "../pages/pages.css";

function SettingsPage() {
  const [showEdit, setShowEdit] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showOtp, setShowOtp] = useState(false);

  // Custom Alert Popup
  const [showAlertPopup, setShowAlertPopup] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState("info");

  const [settings, setSettings] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    avatar: null,
    password: "********",
  });

  const [editSettings, setEditSettings] = useState(settings);
  const [selectedFile, setSelectedFile] = useState(null);

  const [passwordData, setPasswordData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef([]);

  // Custom alert function
  const showCustomAlert = (message, type = "info") => {
    setAlertMessage(message);
    setAlertType(type);
    setShowAlertPopup(true);
  };

  // ✅ FETCH PROFILE FROM BACKEND
  useEffect(() => {
    const fetchProfile = async () => {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      if (!storedUser) return;

      try {
        const response = await fetch(
          "https://accesspmt.bsit3a2025.com/api/general/fetch_profile.php",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ UserID: storedUser.user_id }),
          }
        );

        const result = await response.json();

        if (result.status === "success") {
          const profile = result.profile;

          const data = {
            firstName: profile.FirstName,
            lastName: profile.LastName,
            email: profile.Email,
            phone: profile.Contact_num,
            avatar: profile.Photo
              ? `https://accesspmt.bsit3a2025.com/api/general/uploads/${profile.Photo}`
              : null,
            password: "********",
          };

          setSettings(data);
          setEditSettings(data);
        } else {
          console.error(result.message);
        }
      } catch (error) {
        console.error("Fetch profile error:", error);
        showCustomAlert("Failed to load profile data", "error");
      }
    };

    fetchProfile();
  }, []);

  // ✅ PROFILE EDIT FUNCTIONS
  const handleChange = (e) => {
    setEditSettings({ ...editSettings, [e.target.name]: e.target.value });
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);

    setEditSettings({
      ...editSettings,
      avatar: URL.createObjectURL(file),
    });
  };

  const handleSave = async () => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser) {
      showCustomAlert("User not logged in", "error");
      return;
    }

    if (!editSettings.firstName || !editSettings.lastName || !editSettings.email || !editSettings.phone) {
      showCustomAlert("Please fill all fields!", "warning");
      return;
    }

    const formData = new FormData();
    formData.append("UserID", storedUser.user_id);
    formData.append("FirstName", editSettings.firstName);
    formData.append("LastName", editSettings.lastName);
    formData.append("Email", editSettings.email);
    formData.append("Contact_num", editSettings.phone);

    if (selectedFile) {
      formData.append("Photo", selectedFile);
    }

    try {
      const response = await fetch(
        "https://accesspmt.bsit3a2025.com/api/general/update_profile.php",
        {
          method: "POST",
          body: formData,
        }
      );

      const result = await response.json();

      if (result.status === "success") {
        showCustomAlert("Profile updated successfully!", "success");

        const updatedData = {
          ...editSettings,
          avatar: selectedFile
            ? URL.createObjectURL(selectedFile)
            : settings.avatar,
        };

        setSettings(updatedData);
        setEditSettings(updatedData);
        setShowEdit(false);
        setSelectedFile(null);

        const event = new Event("userUpdated");
        window.dispatchEvent(event);
      } else {
        showCustomAlert(result.message || "Failed to update profile", "error");
      }
    } catch (error) {
      console.error("Update error:", error);
      showCustomAlert("Server error. Please try again.", "error");
    }
  };

  // ✅ PASSWORD & OTP FUNCTIONS
  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handlePasswordSave = async () => {
    // Validate old password is entered
    if (!passwordData.oldPassword) {
      showCustomAlert("Please enter your current password", "warning");
      return;
    }
    
    if (!passwordData.newPassword || !passwordData.confirmPassword) {
      showCustomAlert("Please fill in all password fields", "warning");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showCustomAlert("New passwords do not match!", "warning");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      showCustomAlert("Password must be at least 6 characters!", "warning");
      return;
    }

    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser) {
      showCustomAlert("User not logged in", "error");
      return;
    }

    try {
      // First, verify the old password
      const verifyResponse = await fetch(
        "https://accesspmt.bsit3a2025.com/api/authentication/verify_old_password.php",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            UserID: storedUser.user_id,
            OldPassword: passwordData.oldPassword
          }),
        }
      );

      const verifyResult = await verifyResponse.json();

      if (verifyResult.status !== "success") {
        showCustomAlert(verifyResult.message || "Current password is incorrect", "error");
        return;
      }

      // If old password is correct, send OTP
      const response = await fetch(
        "https://accesspmt.bsit3a2025.com/api/authentication/forgot_pass.php",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ Email: settings.email }),
        }
      );
      const result = await response.json();

      if (result.status === "success") {
        setShowPassword(false);
        setShowOtp(true);
        setOtp(["", "", "", "", "", ""]);
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
        showCustomAlert("OTP sent to your email!", "success");
      } else {
        showCustomAlert(result.message || "Failed to generate OTP", "error");
      }
    } catch (error) {
      console.error("Password verification error:", error);
      showCustomAlert("Server error. Please try again.", "error");
    }
  };

  const handleOtpChange = (e, index) => {
    const value = e.target.value.replace(/\D/g, "");
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (otp[index]) {
        const newOtp = [...otp];
        newOtp[index] = "";
        setOtp(newOtp);
      } else if (index > 0) {
        otpRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleConfirmOtp = async () => {
    const enteredOtp = otp.join("");
    if (enteredOtp.length !== 6) {
      showCustomAlert("Please enter the 6-digit OTP", "warning");
      return;
    }

    try {
      const response = await fetch(
        "https://accesspmt.bsit3a2025.com/api/authentication/verify_forgot_otp.php",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ Email: settings.email, OTP: enteredOtp }),
        }
      );
      const result = await response.json();

      if (result.status === "success") {
        // Update password
        const updateResp = await fetch(
          "https://accesspmt.bsit3a2025.com/api/authentication/reset_password.php",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              Email: settings.email,
              Password: passwordData.newPassword,
            }),
          }
        );
        const updateResult = await updateResp.json();
        if (updateResult.status === "success") {
          showCustomAlert("Password updated successfully!", "success");
          setSettings({ ...settings, password: "********" });
          setPasswordData({ oldPassword: "", newPassword: "", confirmPassword: "" });
          setShowOtp(false);
        } else {
          showCustomAlert(updateResult.message || "Failed to update password", "error");
        }
      } else {
        showCustomAlert(result.message || "Invalid or expired OTP", "error");
      }
    } catch (error) {
      console.error("OTP verification error:", error);
      showCustomAlert("Server error. Please try again.", "error");
    }
  };

  const handleCancelOtp = () => {
    setShowOtp(false);
    setOtp(["", "", "", "", "", ""]);
    setPasswordData({ oldPassword: "", newPassword: "", confirmPassword: "" });
  };

  const handleResendOtp = async () => {
    try {
      const response = await fetch(
        "https://accesspmt.bsit3a2025.com/api/authentication/resend_forgot_otp.php",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ Email: settings.email }),
        }
      );
      const result = await response.json();
      if (result.status === "success") {
        setOtp(["", "", "", "", "", ""]);
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
        showCustomAlert("OTP resent successfully!", "success");
      } else {
        showCustomAlert(result.message || "Failed to resend OTP", "error");
      }
    } catch (error) {
      console.error("Resend OTP error:", error);
      showCustomAlert("Server error. Please try again.", "error");
    }
  };

  return (
    <div className="admin-settings-wrapper">
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

      <main className="admin-settings-content">
        <h1 className="admin-section-title">ACCOUNT</h1>

        <div className="account-header">
          <div
            className="account-avatar"
            style={{
              backgroundImage: settings.avatar
                ? `url(${settings.avatar})`
                : "none",
              backgroundSize: "cover",
              backgroundPosition: "center"
            }}
          ></div>
          <div>
            <h2 className="account-name">
              {settings.firstName} {settings.lastName}
            </h2>
            <p className="account-email">{settings.email}</p>
          </div>
        </div>

        <h4 className="section-subtitle">PROFILE INFORMATION</h4>

        <div className="profile-grid">
          <div>
            <label>First Name</label>
            <p>{settings.firstName || "—"}</p>
          </div>
          <div>
            <label>Last Name</label>
            <p>{settings.lastName || "—"}</p>
          </div>
          <div>
            <label>Email Address</label>
            <p>{settings.email || "—"}</p>
          </div>
          <div>
            <label>Phone Number</label>
            <p>{settings.phone || "—"}</p>
          </div>
        </div>

        <div className="profile-actions">
          <button
            className="edit-adminprofile-change-btn"
            onClick={() => setShowEdit(true)}
          >
            EDIT
          </button>
        </div>

        <hr />

        <h4 className="section-subtitle">PASSWORD INFORMATION</h4>
        <p className="password-note">
          A secure password secures your account
        </p>

        <div className="password-row">
          <input type="password" value={settings.password} disabled />
          <button
            className="edit-change-btn"
            onClick={() => setShowPassword(true)}
          >
            CHANGE PASSWORD
          </button>
        </div>
      </main>

      {/* Edit Modal - Modern Design */}
      {showEdit && (
        <div className="modern-popup-overlay">
          <div className="modern-popup" style={{ maxWidth: "550px" }}>
            <div className="modern-popup-header">
              <h3>✏️ Edit Profile</h3>
              <p>Update your personal information</p>
            </div>
            <div className="modern-popup-content">
              <div className="avatar-upload-section">
                <label htmlFor="avatarUpload">
                  <div
                    className="modal-avatar-preview"
                    style={{
                      backgroundImage: editSettings.avatar
                        ? `url(${editSettings.avatar})`
                        : "none",
                      backgroundSize: "cover",
                      backgroundPosition: "center"
                    }}
                  ></div>
                </label>
                <input
                  id="avatarUpload"
                  type="file"
                  onChange={handlePhotoChange}
                  accept="image/*"
                />
                <p style={{ fontSize: "12px", marginTop: "8px", color: "#666" }}>
                  Click to change profile picture
                </p>
              </div>

              {/* 2 Column Form Layout */}
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: "1fr 1fr", 
                gap: "20px",
                marginTop: "20px"
              }}>
                <div className="form-group">
                  <label>First Name</label>
                  <input
                    name="firstName"
                    value={editSettings.firstName}
                    onChange={handleChange}
                    placeholder="Enter first name"
                  />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input
                    name="lastName"
                    value={editSettings.lastName}
                    onChange={handleChange}
                    placeholder="Enter last name"
                  />
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    name="email"
                    value={editSettings.email}
                    onChange={handleChange}
                    placeholder="Enter email address"
                    type="email"
                  />
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    name="phone"
                    value={editSettings.phone}
                    onChange={handleChange}
                    placeholder="Enter phone number"
                  />
                </div>
              </div>
            </div>
            <div className="modern-popup-footer double-buttons">
              <button
                className="modern-btn modern-btn-secondary"
                onClick={() => {
                  setShowEdit(false);
                  setSelectedFile(null);
                  setEditSettings(settings);
                }}
              >
                Cancel
              </button>
              <button className="modern-btn modern-btn-primary" onClick={handleSave}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Modal - Modern Design with Current Password */}
      {showPassword &&
        ReactDOM.createPortal(
          <div className="modern-popup-overlay">
            <div className="modern-popup">
              <div className="modern-popup-header">
                <h3>🔐 Change Password</h3>
                <p>Create a new secure password for your account</p>
              </div>
              <div className="modern-popup-content">
                <div className="form-group">
                  <label>Current Password</label>
                  <input
                    type="password"
                    name="oldPassword"
                    value={passwordData.oldPassword}
                    onChange={handlePasswordChange}
                    placeholder="Enter your current password"
                  />
                </div>
                <div className="form-group">
                  <label>New Password</label>
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    placeholder="Enter new password"
                  />
                </div>
                <div className="form-group">
                  <label>Confirm New Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    placeholder="Confirm new password"
                  />
                </div>
                <div className="info-box">
                  <p>📧 A verification code will be sent to {settings.email}</p>
                </div>
              </div>
              <div className="modern-popup-footer double-buttons">
                <button
                  className="modern-btn modern-btn-secondary"
                  onClick={() => setShowPassword(false)}
                >
                  Cancel
                </button>
                <button className="modern-btn modern-btn-primary" onClick={handlePasswordSave}>
                  Send OTP
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* OTP Modal - Modern Design */}
      {showOtp &&
        ReactDOM.createPortal(
          <div className="modern-popup-overlay">
            <div className="modern-popup">
              <div className="modern-popup-header">
                <h3>✉️ OTP Verification</h3>
                <p>Enter the 6-digit code sent to your email</p>
              </div>
              <div className="modern-popup-content">
                <div className="otp-container">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      type="text"
                      maxLength={1}
                      value={digit}
                      ref={(el) => (otpRefs.current[index] = el)}
                      onChange={(e) => handleOtpChange(e, index)}
                      onKeyDown={(e) => handleOtpKeyDown(e, index)}
                      className="otp-input"
                    />
                  ))}
                </div>

                <div style={{ textAlign: "center", marginTop: "12px" }}>
                  <button
                    className="modern-link-btn"
                    onClick={handleResendOtp}
                  >
                    Resend Verification Code
                  </button>
                </div>
              </div>
              <div className="modern-popup-footer double-buttons">
                <button className="modern-btn modern-btn-secondary" onClick={handleCancelOtp}>
                  Cancel
                </button>
                <button className="modern-btn modern-btn-primary" onClick={handleConfirmOtp}>
                  Verify & Update
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

export default SettingsPage;