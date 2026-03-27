import React, { useRef, useState, useEffect } from "react";

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [profileImg, setProfileImg] = useState("/default-avatar.png"); // Default avatar path
  const [currentDateTime, setCurrentDateTime] = useState("");
  const fileInputRef = useRef();

  // Format Date Display
  const formatDate = (date) => {
    const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
    const dayName = days[date.getDay()];
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();

    let hour = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;

    return `TODAY IS ${dayName}, ${month}/${day}/${year}, ${hour}:${minutes} ${ampm}`;
  };

  useEffect(() => {
    // Update date and time every minute
    const updateDateTime = () => {
      setCurrentDateTime(formatDate(new Date()));
    };
    updateDateTime();
    const timer = setInterval(updateDateTime, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Fetch user profile from API
    const fetchProfile = async () => {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      if (!storedUser) return;

      try {
        const response = await fetch("https://accesspmt.bsit3a2025.com/api/general/fetch_profile.php", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ UserID: storedUser.user_id }),
        });

        const result = await response.json();
        if (result.status === "success") {
          setProfile(result.profile);
          setProfileImg(result.profile.Photo ? result.profile.Photo : "/default-avatar.png");
        } else {
          console.error(result.message);
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error);
      }
    };

    fetchProfile();
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImg(URL.createObjectURL(file));
    }
  };

  if (!profile) return <div>Loading profile...</div>;

  return (
    <div className="profile-container">
      <div className="profile-header">
        <img
          src={profileImg}
          alt="Profile"
          className="profile-avatar"
          onClick={() => fileInputRef.current.click()}
        />
        <input
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          ref={fileInputRef}
          onChange={handleImageChange}
        />
        <div>
          <h2 className="profile-name">{profile.FirstName} {profile.LastName}</h2>
        </div>
        <span className="profile-date">{currentDateTime}</span>
        <button className="edit-btn">EDIT</button>
      </div>

      <div className="profile-info-card">
        <div>
          <div className="info-title">CONTACT NUMBER</div>
          <div className="info-value">{profile.Contact_num}</div>
          <div className="info-title">ADDRESS</div>
          <div className="info-value">{profile.Address}</div>
        </div>
        <div>
          <div className="info-title">EMAIL ADDRESS</div>
          <div className="info-value">{profile.Email}</div>
          <div className="info-title">Name</div>
          <div className="info-value">{profile.FirstName} {profile.LastName}</div>
        </div>
      </div>

      <div className="profile-password-card">
        <div>
          <div className="info-title">PASSWORD</div>
          <div className="password-hint">A SECURE PASSWORD SECURES YOUR ACCOUNT</div>
          <div className="password-stars">***********</div>
          <div className="last-change">
            LAST CHANGE {new Date(profile.created_at).toLocaleDateString()}
          </div>
        </div>
        <button className="change-password-btn">CHANGE PASSWORD</button>
      </div>
    </div>
  );
};

export default Profile;
