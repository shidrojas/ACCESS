import React, { useState } from "react";
import ReactDOM from "react-dom";
import "../pages/pages.css";

function SettingsPage() {
  const [showEdit, setShowEdit] = useState(false);
  const [activeSection, setActiveSection] = useState("Profile");

  const [settings, setSettings] = useState({
    firstName: "user",
    lastName: "user",
    email: "user@example.com",
    phone: "09458626548",
    avatar: null,
  });

  const [editSettings, setEditSettings] = useState(settings);

  const handleChange = (e) => {
    setEditSettings({ ...editSettings, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    setSettings(editSettings);
    setShowEdit(false);
  };

  const termsContent = (
    <div className="text-content">
      <h3>Terms and Conditions</h3>
      <p>
        Welcome to [Your Company]! By using this service, you agree to our terms and
        conditions. Users must be 18 years or older. Content, accounts, and services are
        governed by applicable laws. Violation may lead to suspension or termination.
      </p>
      <p>We may update these terms at any time. Continued use indicates acceptance.</p>
    </div>
  );

  const privacyContent = (
    <div className="text-content">
      <h3>Privacy Policy</h3>
      <p>
        We value your privacy. Any personal information collected is used solely for
        account management and improving our services. We do not share your data with
        third parties without consent unless required by law.
      </p>
      <p>Please review this policy periodically as updates may occur.</p>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case "Profile":
        return (
          <div>
            <h3 className="section-title">ACCOUNT</h3>
            <div className="account-header">
              <div
                className="account-avatar"
                style={{
                  backgroundImage: settings.avatar
                    ? `url(${settings.avatar})`
                    : "none",
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
                <p>{settings.firstName}</p>
              </div>
              <div>
                <label>Last Name</label>
                <p>{settings.lastName}</p>
              </div>
              <div>
                <label>Email Address</label>
                <p>{settings.email}</p>
              </div>
              <div>
                <label>Phone Number</label>
                <p>{settings.phone}</p>
              </div>
            </div>

            <div className="profile-actions">
              <button className="change-btn" onClick={() => setShowEdit(true)}>EDIT</button>
            </div>

            <hr />

            <h4 className="section-subtitle">PASSWORD INFORMATION</h4>
            <p className="password-note">A secure password protects your account</p>

            <div className="password-row">
              <input type="password" value="**********" disabled />
              <button className="change-btn">CHANGE PASSWORD</button>
            </div>
            <small className="password-date">Last change January 7, 2024</small>
          </div>
        );
      case "Terms":
        return termsContent;
      case "Privacy":
        return privacyContent;
      default:
        return null;
    }
  };

  return (
    <div className="settings-wrapper">
      <aside className="settings-sidebar">
        <h3 className="settings-title">SETTINGS</h3>
        <ul className="settings-menu">
          <li
            className={activeSection === "Profile" ? "active" : ""}
            onClick={() => setActiveSection("Profile")}
          >
            Profile Information
          </li>
          <li
            className={activeSection === "Terms" ? "active" : ""}
            onClick={() => setActiveSection("Terms")}
          >
            Terms and Conditions
          </li>
          <li
            className={activeSection === "Privacy" ? "active" : ""}
            onClick={() => setActiveSection("Privacy")}
          >
            Privacy Policy
          </li>
        </ul>
      </aside>

      <main className="settings-content">{renderContent()}</main>

      {showEdit &&
        ReactDOM.createPortal(
          <div className="modal-overlay">
            <div className="modal">
              <h3>Edit Profile</h3>

              <div className="avatar-upload-section">
                <label htmlFor="avatarUpload">
                  <div
                    className="modal-avatar-preview"
                    style={{
                      backgroundImage: editSettings.avatar
                        ? `url(${editSettings.avatar})`
                        : "none",
                    }}
                  ></div>
                </label>
                <input
                  id="avatarUpload"
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      setEditSettings({
                        ...editSettings,
                        avatar: URL.createObjectURL(file),
                      });
                    }
                  }}
                />
              </div>

              <div className="modal-grid">
                <input
                  name="firstName"
                  value={editSettings.firstName}
                  onChange={handleChange}
                  placeholder="First Name"
                />
                <input
                  name="lastName"
                  value={editSettings.lastName}
                  onChange={handleChange}
                  placeholder="Last Name"
                />
                <input
                  name="email"
                  value={editSettings.email}
                  onChange={handleChange}
                  placeholder="Email Address"
                />
                <input
                  name="phone"
                  value={editSettings.phone}
                  onChange={handleChange}
                  placeholder="Phone Number"
                />
              </div>

              <div className="modal-actions">
                <button className="cancel-btn" onClick={() => setShowEdit(false)}>Cancel</button>
                <button className="save-btn" onClick={handleSave}>Save</button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

export default SettingsPage;
