import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Silk from "../pages/Silk";
import logo2 from "../img/logo1.png";
import showIcon from "../img/show.png";
import hideIcon from "../img/hide.png";
import Navbar from "../navigationbar/navbar1";
import "../pages/authentication.css";


function Register() {
  const [step, setStep] = useState("register"); // register | otp
  const [showPass1, setShowPass1] = useState(false);
  const [showPass2, setShowPass2] = useState(false);
  const [password1, setPassword1] = useState("");
  const [password2, setPassword2] = useState("");
  const [warning, setWarning] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef([]);
  const rightContainerRef = useRef(null);
  const [rightHeight, setRightHeight] = useState("auto");
  const navigate = useNavigate();
  
  // Custom Alert Popup
  const [showAlertPopup, setShowAlertPopup] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState("info");

  const showCustomAlert = (message, type = "info") => {
    setAlertMessage(message);
    setAlertType(type);
    setShowAlertPopup(true);
  };

  // Update right container height whenever content changes
  useEffect(() => {
    if (rightContainerRef.current) {
      setRightHeight(rightContainerRef.current.scrollHeight + "px");
    }
  }, [step, firstName, lastName, email, password1, password2, otp]);

  const handleRegister = async () => {
    if (!firstName || !lastName || !email || !password1 || !password2) {
      setWarning("Please fill out all fields!");
      return;
    }

    if (password1 !== password2) {
      setWarning("Passwords do not match!");
      return;
    }

    if (password1.length < 6) {
      setWarning("Password must be at least 6 characters!");
      return;
    }

    setWarning("");

    try {
      const res = await fetch("https://accesspmt.bsit3a2025.com/api/authentication/register.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          FirstName: firstName,
          LastName: lastName,
          Email: email,
          Password: password1,
        }),
      });

      const data = await res.json();

      if (data.status === "success") {
        setStep("otp");
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      } else {
        setWarning(data.message);
      }
    } catch (err) {
      setWarning("Server error. Please try again.");
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
      setWarning("Please enter the 6-digit OTP");
      return;
    }

    try {
      const res = await fetch("https://accesspmt.bsit3a2025.com/api/authentication/verify_otp.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Email: email,
          OTP: enteredOtp,
        }),
      });

      const data = await res.json();

      if (data.status === "success") {
        showCustomAlert("Account registered successfully!", "success");
        setTimeout(() => navigate("/login"), 2000);
      } else {
        setWarning(data.message);
      }
    } catch (err) {
      setWarning("OTP verification failed.");
    }
  };

  const handleCancelOtp = async () => {
    try {
      const res = await fetch("https://accesspmt.bsit3a2025.com/api/authentication/cancel_registration.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Email: email,
        }),
      });

      const data = await res.json();

      if (data.status !== "success") {
        console.warn("Cancel cleanup warning:", data.message);
      }

    } catch (err) {
      console.error("Cancel API failed:", err);
    }

    // Always reset UI even if API fails (prevents stuck screen)
    setStep("register");
    setOtp(["", "", "", "", "", ""]);
    setWarning("");

    // optional — clear register form too
    setPassword1("");
    setPassword2("");
  };

  const handleResendOtp = async () => {
    try {
      const res = await fetch("https://accesspmt.bsit3a2025.com/api/authentication/resend_otp.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Email: email,
        }),
      });

      const data = await res.json();

      if (data.status === "success") {
        showCustomAlert("OTP resent successfully!", "success");
        setOtp(["", "", "", "", "", ""]);
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      } else {
        setWarning(data.message || "Failed to resend OTP");
      }
    } catch (err) {
      setWarning("Failed to resend OTP.");
    }
  };

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

      <div className="auth-page register-page">
        <div className="auth-content">
          <div className="slide-in-left">
            <div className="register-container">

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
                    <div style={{
                      display: "flex",
                      flexDirection: "column",
                      lineHeight: 1,
                      alignItems: "flex-start"
                    }}>
                      <span style={{ fontWeight: "bold", fontSize: 24 }}>ACCESS V1.0</span>
                      <span style={{
                        fontWeight: "600",
                        fontSize: 14,
                        letterSpacing: 2
                      }}>PROJECT MANAGEMENT TOOL</span>
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
                  textAlign: "left",
                  lineHeight: 1.7,
                  letterSpacing: "0.02em"
                }}>
                  <p>
                    Streamline your projects with ACCESS — empowering your team to collaborate seamlessly,
                    track progress, and achieve goals efficiently.
                  </p>
                </div>
              </div>

              {/* RIGHT SIDE */}
              <div
                className="right-container"
                ref={rightContainerRef}
                style={{ height: rightHeight, transition: "height 0.3s ease" }}
              >
                {step === "register" && (
                  <>
                    <h1 className="register-title">REGISTER NOW</h1>

                    <div className="input-row">
                      <div className="input-group">
                        <input
                          placeholder="First Name"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="input-field"
                        />
                      </div>
                      <div className="input-group">
                        <input
                          placeholder="Last Name"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="input-field"
                        />
                      </div>
                    </div>

                    <div className="input-group">
                      <input
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="input-field"
                      />
                    </div>

                    <div className="input-group">
                      <input
                        type={showPass1 ? "text" : "password"}
                        placeholder="Password"
                        value={password1}
                        onChange={(e) => setPassword1(e.target.value)}
                        className="input-field"
                      />
                      <img
                        src={showPass1 ? showIcon : hideIcon}
                        alt="Toggle password visibility"
                        className="eye"
                        onClick={() => setShowPass1(!showPass1)}
                      />

                    </div>

                    <div className="input-group">
                      <input
                        type={showPass2 ? "text" : "password"}
                        placeholder="Confirm Password"
                        value={password2}
                        onChange={(e) => setPassword2(e.target.value)}
                        className="input-field"
                      />
                      <img
                        src={showPass2 ? showIcon : hideIcon}
                        alt="Toggle confirm password visibility"
                        className="eye"
                        onClick={() => setShowPass2(!showPass2)}
                      />

                    </div>

                    {warning && <p className="input-warning">⚠ {warning}</p>}
                    <button onClick={handleRegister}>REGISTER</button>
                  </>
                )}

                {step === "otp" && (
                  <>
                    <h1>OTP VERIFICATION</h1>
                    <p>
                      The OTP was sent to your Account: <b>{email}</b>
                    </p>

                    <div className="otp-inputs">
                      {otp.map((digit, index) => (
                        <input
                          key={index}
                          type="text"
                          inputMode="numeric"
                          pattern="\d*"
                          maxLength={1}
                          value={digit}
                          ref={(el) => (otpRefs.current[index] = el)}
                          onChange={(e) => handleOtpChange(e, index)}
                          onKeyDown={(e) => handleOtpKeyDown(e, index)}
                          className="otp-input"
                        />
                      ))}
                    </div>

                    {warning && <p className="input-warning">⚠ {warning}</p>}

                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        justifyContent: "center",
                        marginTop: 10,
                      }}
                    >
                      <button onClick={handleConfirmOtp}>CONFIRM OTP</button>
                      <button
                        onClick={handleCancelOtp}
                        style={{ backgroundColor: "gray" }}
                      >
                        CANCEL
                      </button>
                    </div>

                    <p style={{ marginTop: 15, textAlign: "center" }}>
                      Didn't receive OTP?{" "}
                      <button
                        onClick={handleResendOtp}
                        style={{
                          background: "none",
                          border: "none",
                          color: "blue",
                          cursor: "pointer",
                          textDecoration: "underline",
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
      </div>

    
    </>
  );
}

export default Register;