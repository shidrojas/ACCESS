import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./navbar.css";
import sidebaricon from "../img/sidebar-icon.png";


function Navbar2({ toggleSidebar, activePage }) {
  const [showPopup, setShowPopup] = useState(false);
  const [user, setUser] = useState(null);
  const [avatarKey, setAvatarKey] = useState(Date.now()); // 🔥 force refresh
  const popupRef = useRef(null);
  const navigate = useNavigate();

  const handleTogglePopup = () => setShowPopup(!showPopup);

  const handleLogout = async () => {
    setShowPopup(false);

    const storedUser = JSON.parse(localStorage.getItem("user"));
    const logID = localStorage.getItem("LogID");

    if (!storedUser) return alert("User not found");

    try {
      const response = await fetch(
        "https://accesspmt.bsit3a2025.com/api/landing_page/logout.php",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            UserID: storedUser.user_id,
            LogID: logID,
          }),
        }
      );

      const result = await response.json();
      console.log("Logout result:", result);

      localStorage.removeItem("user");
      localStorage.removeItem("LogID");
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
      alert("Server error during logout.");
    }
  };

  // Close popup if clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setShowPopup(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 🔥 Fetch user
  const fetchUser = async () => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser) return;

    try {
      const response = await fetch(
        "https://accesspmt.bsit3a2025.com/api/general/fetch_user.php",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ UserID: storedUser.user_id }),
        }
      );

      const result = await response.json();

      if (result.status === "success") {
        setUser(result.user);
        setAvatarKey(Date.now()); // 🔥 refresh avatar
      } else {
        console.error(result.message);
        setUser({ FullName: "User not found", Email: "" });
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
      setUser({ FullName: "Error fetching user", Email: "" });
    }
  };

  useEffect(() => {
    fetchUser();

    // 🔥 listen for profile updates
    const handleUserUpdate = () => {
      fetchUser();
    };

    window.addEventListener("userUpdated", handleUserUpdate);

    return () => {
      window.removeEventListener("userUpdated", handleUserUpdate);
    };
}, []);


  return (
    <nav className="navbar2">
      <button className="sidebar-btn" onClick={toggleSidebar}>
        <img
          src={sidebaricon}
          alt="sidebar-icon"
          style={{ width: "25px", height: "auto" }}
        />
      </button>

      <div className="vertical-line"></div>

      <div
        className="page-subtitle"
        style={{
          marginLeft: "15px",
          fontFamily: "'Rajdhani', sans-serif",
          fontSize: "18px",
          fontWeight: "600",
        }}
      >
        {activePage}
      </div>



      <div className="navbar-right" style={{ position: "relative" }}>
        
        {/* 🔥 Avatar */}
        <div className="user-placeholder" onClick={handleTogglePopup}>
          <img
            key={avatarKey} // forces refresh
            src={
              user && user.Photo
                ? `https://accesspmt.bsit3a2025.com/api/general/uploads/${user.Photo}?t=${avatarKey}`
                : "https://via.placeholder.com/40"
            }
            alt="avatar"
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "8px", // rounded square
              objectFit: "cover",
            }}
          />
        </div>

        <div className="user-info" onClick={handleTogglePopup}>
          <div className="user-name">{user ? user.FullName : "Loading..."}</div>
          <div className="user-email">{user ? user.Email : ""}</div>
        </div>

        {showPopup && (
          <div
            className="user-popup"
            ref={popupRef}
            style={{
              position: "absolute",
              top: "60px",
              right: 0,
              width: "200px",
              background: "#fff",
              border: "1px solid #ccc",
              borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              zIndex: 1000,
              fontFamily: "'Rajdhani', sans-serif",
            }}
          >
            <div
              style={{
                padding: "10px",
                borderBottom: "1px solid #eee",
                fontWeight: "600",
              }}
            >
              User Info
            </div>

            <div style={{ padding: "20px", minHeight: "50px" }}>
              {user ? (
                <>
                  <div>{user.FullName}</div>
                  <div style={{ fontSize: "12px", color: "#555" }}>
                    {user.Email}
                  </div>
                </>
              ) : (
                <div>Loading...</div>
              )}
            </div>

            <div
              style={{
                padding: "10px",
                borderTop: "1px solid #eee",
                cursor: "pointer",
                color: "black",
                fontWeight: "600",
              }}
              onClick={handleLogout}
            >
              Log Out
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar2;
