import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Silk from "../pages/Silk";
import logo2 from "../img/logo1.png";
import showIcon from "../img/show.png";
import hideIcon from "../img/hide.png";
import Navbar from '../navigationbar/navbar1';


function Login() {
  const [showPass, setShowPass] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [warning, setWarning] = useState("");

  // Forgot password flow
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showResetPass, setShowResetPass] = useState(false);
  const [step, setStep] = useState("login"); // login | forgot | otp
  const [forgotEmail, setForgotEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changePassOtp, setChangePassOtp] = useState(["", "", "", "", "", ""]);
  const changePassOtpRefs = useRef([]);
  
  // Custom Alert Popup
  const [showAlertPopup, setShowAlertPopup] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState("info");

  const navigate = useNavigate();

  const showCustomAlert = (message, type = "info") => {
    setAlertMessage(message);
    setAlertType(type);
    setShowAlertPopup(true);
  };

  /* ================= HELPERS ================= */
  const clearForgotFields = () => {
    setForgotEmail("");
    setNewPassword("");
    setConfirmNewPassword("");
    setChangePassOtp(["", "", "", "", "", ""]);
    setWarning("");
  };

  const redirectByRole = (role) => {
    switch (role) {
      case "admin":
        navigate("/AdminMainLayout"); 
        break;
      case "project_manager":
        navigate("/TeacherMainLayout"); // Teacher Dashboard
        break;
      case "member":
        navigate("/mainLayout"); 
        break;
      default:
        setWarning("Unknown role. Cannot redirect.");
        break;
    }
  };

  /* ================= LOGIN FUNCTION ================= */
  const handleLogin = async () => {
    if (!email || !password) {
      setWarning("Please fill out all fields!");
      return;
    }

    setWarning("");

    try {
      const response = await fetch("https://accesspmt.bsit3a2025.com/api/landing_page/login.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Email: email, Password: password }),
      });

      const result = await response.json();

      if (result.status === "success") {
        localStorage.setItem("user", JSON.stringify(result.user));
        localStorage.setItem("LogID", result.LogID);
        redirectByRole(result.user.role);
      } else {
        setWarning(result.message);
      }
    } catch {
      setWarning("Unable to connect to the server.");
    }
  };

  /* ================= OTP LOGIC ================= */
  const handleOtpChange = (e, index) => {
    const value = e.target.value.replace(/\D/g, "");
    const newOtp = [...changePassOtp];
    newOtp[index] = value;
    setChangePassOtp(newOtp);

    if (value && index < 5) {
      changePassOtpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (changePassOtp[index]) {
        const newOtp = [...changePassOtp];
        newOtp[index] = "";
        setChangePassOtp(newOtp);
      } else if (index > 0) {
        changePassOtpRefs.current[index - 1]?.focus();
      }
    }
  };

  /* ================= FORGOT PASSWORD ================= */
  const handleForgotConfirm = async () => {
    if (!forgotEmail || !newPassword || !confirmNewPassword) {
      setWarning("Please fill out all fields!");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setWarning("Passwords do not match!");
      return;
    }

    if (newPassword.length < 6) {
      setWarning("Password must be at least 6 characters!");
      return;
    }

    try {
      const response = await fetch(
        "https://accesspmt.bsit3a2025.com/api/authentication/forgot_pass.php",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ Email: forgotEmail }),
        }
      );

      const result = await response.json();

      if (result.status === "success") {
        setWarning("");
        setStep("otp");
        setTimeout(() => changePassOtpRefs.current[0]?.focus(), 100);
      } else {
        setWarning(result.message);
      }
    } catch {
      setWarning("Server error. Please try again.");
    }
  };

  const handleConfirmOtp = async () => {
    const enteredOtp = changePassOtp.join("");

    if (enteredOtp.length !== 6) {
      setWarning("Please enter the 6-digit OTP");
      return;
    }

    try {
      // 1️⃣ Verify OTP
      const verifyRes = await fetch(
        "https://accesspmt.bsit3a2025.com/api/authentication/verify_forgot_otp.php",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            Email: forgotEmail,
            OTP: enteredOtp,
          }),
        }
      );

      const verifyResult = await verifyRes.json();

      if (verifyResult.status !== "success") {
        setWarning(verifyResult.message);
        return;
      }

      // 2️⃣ Reset Password
      const resetRes = await fetch(
        "https://accesspmt.bsit3a2025.com/api/authentication/reset_password.php",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            Email: forgotEmail,
            Password: newPassword,
          }),
        }
      );

      const resetResult = await resetRes.json();

      if (resetResult.status === "success") {
        showCustomAlert("Password reset successful!", "success");
        clearForgotFields();
        setTimeout(() => setStep("login"), 2000);
      } else {
        setWarning(resetResult.message);
      }
    } catch {
      setWarning("Server error. Please try again.");
    }
  };

  const handleCancelOtp = () => {
    clearForgotFields();
    setStep("forgot");
  };

  const handleResendOtp = async () => {
    try {
      const response = await fetch(
        "https://accesspmt.bsit3a2025.com/api/authentication/resend_forgot_otp.php",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ Email: forgotEmail }),
        }
      );

      const result = await response.json();

      if (result.status === "success") {
        showCustomAlert("OTP resent successfully!", "success");
        setChangePassOtp(["", "", "", "", "", ""]);
        setTimeout(() => changePassOtpRefs.current[0]?.focus(), 100);
      } else {
        setWarning(result.message);
      }
    } catch {
      setWarning("Unable to resend OTP.");
    }
  };

  /* ================= WARNING AUTO CLEAR ================= */
  useEffect(() => {
    if (warning) {
      const timer = setTimeout(() => setWarning(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [warning]);

  return (
    <>
      <Navbar />

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

      <div className="auth-page login-page">
        <div className="slide-in-left">
          <div className="login-container">

            {/* LEFT SIDE */}
            <div className="login-left-container" style={{ position: "relative" }}>
              <Silk speed={5} scale={1.2} color="#7a7777ff" noiseIntensity={1.5} rotation={1} />

              {/* Logo */}
              <div style={{
                position: "absolute",
                top: 20,
                left: 20,
                display: "flex",
                flexDirection: "column",
                gap: 5,
                fontFamily: "'Rajdhani', sans-serif",
                color: "#fff"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <img src={logo2} alt="Company Logo" style={{ height: 40 }} />
                  <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
                    <span style={{ fontWeight: "bold", fontSize: 24 }}>ACCESS V1.0</span>
                    <span style={{ fontWeight: "600", fontSize: 14, letterSpacing: 2 }}>
                      PROJECT MANAGEMENT TOOL
                    </span>
                  </div>
                </div>
              </div>

              {/* Left Text */}
              <div style={{
                position: "absolute",
                bottom: 20,
                left: 20,
                maxWidth: 450,
                color: "#eee",
                fontSize: 14,
                fontFamily: "'Rajdhani', sans-serif",
                lineHeight: 1.7
              }}>
                <p>
                  Streamline your projects with ACCESS — empowering your team to collaborate seamlessly,
                  track progress, and achieve goals efficiently.
                </p>
              </div>
            </div>

            {/* RIGHT SIDE */}
            <div className="login-right-container">
              <h1>
                {step === "login" && "SIGN IN"}
                {step === "forgot" && "RESET PASSWORD"}
                {step === "otp" && "OTP VERIFICATION"}
              </h1>

              {/* LOGIN */}
              {step === "login" && (
                <>
                  <div className="login-input-group">
                    <input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div className="login-input-group" style={{ position: "relative" }}>
                    <input
                      type={showPass ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <img
                      src={showPass ? showIcon : hideIcon}
                      className="login-eye"
                      alt="toggle password"
                      onClick={() => setShowPass(!showPass)}
                    />
                  </div>

                  {warning && <p className="login-input-warning">⚠ {warning}</p>}

                  <div className="login-options">
                    <span
                      style={{ cursor: "pointer" }}
                      onClick={() => {
                        clearForgotFields();
                        setStep("forgot");
                      }}
                    >
                      Forgot Password?
                    </span>
                  </div>

                  <button className="login-button" onClick={handleLogin} style={{ marginTop: 20 }}>
                    LOGIN
                  </button>
                </>
              )}

              {/* FORGOT PASSWORD */}
              {step === "forgot" && (
                <>
                  <div className="login-input-group">
                    <input
                      type="email"
                      placeholder="Enter your email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                    />
                  </div>

                  {/* New Password */}
                  <div className="login-input-group" style={{ position: "relative" }}>
                    <input
                      type={showResetPass ? "text" : "password"}
                      placeholder="Enter New Password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <img
                      src={showResetPass ? showIcon : hideIcon}
                      className="login-eye"
                      alt="toggle password"
                      onClick={() => setShowResetPass(!showResetPass)}
                    />
                  </div>

                  {/* Confirm New Password */}
                  <div className="login-input-group" style={{ position: "relative" }}>
                    <input
                      type={showResetPass ? "text" : "password"}
                      placeholder="Confirm New Password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                    />
                    <img
                      src={showResetPass ? showIcon : hideIcon}
                      className="login-eye"
                      alt="toggle password"
                      onClick={() => setShowResetPass(!showResetPass)}
                    />
                  </div>

                  {warning && <p className="login-input-warning">⚠ {warning}</p>}

                  <div style={{ display: "flex", gap: 10 }}>
                    <button className="login-button" onClick={handleForgotConfirm}>
                      CONFIRM
                    </button>
                    <button
                      className="login-button"
                      onClick={() => {
                        clearForgotFields();
                        setStep("login");
                      }}
                    >
                      CANCEL
                    </button>
                  </div>
                </>
              )}

              {/* OTP */}
              {step === "otp" && (
                <>
                  <p>The OTP was sent to your Account: <b>{forgotEmail}</b></p>

                  <div className="otp-inputs">
                    {changePassOtp.map((digit, index) => (
                      <input
                        key={index}
                        type="text"
                        maxLength={1}
                        value={digit}
                        ref={(el) => (changePassOtpRefs.current[index] = el)}
                        onChange={(e) => handleOtpChange(e, index)}
                        onKeyDown={(e) => handleOtpKeyDown(e, index)}
                        className="otp-input"
                      />
                    ))}
                  </div>

                  {warning && <p className="login-input-warning">⚠ {warning}</p>}

                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={handleConfirmOtp}>CONFIRM OTP</button>
                    <button onClick={handleCancelOtp}>CANCEL</button>
                  </div>

                  <p style={{ marginTop: 15 }}>
                    Didn't receive OTP?{" "}
                    <button
                      onClick={handleResendOtp}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        textDecoration: "underline",
                        color: "#000"
                      }}
                    >
                      Resend OTP
                    </button>
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Login;