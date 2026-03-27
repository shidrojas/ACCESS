import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Silk from "../pages/Silk";
import logo2 from "../img/logo1.png";
import showIcon from "../img/show.png";
import hideIcon from "../img/hide.png";
import Navbar from '../navigationbar/navbar1';
import Footer from '../navigationbar/footer';

function Login() {
  const [showPass, setShowPass] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [warning, setWarning] = useState("");

  // Forgot password flow
  const [step, setStep] = useState("login"); // login | forgot | otp
  const [forgotEmail, setForgotEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changePassOtp, setChangePassOtp] = useState(["", "", "", "", "", ""]);
  const changePassOtpRefs = useRef([]);

  const navigate = useNavigate();

  /* ================= HELPERS ================= */
  const clearForgotFields = () => {
    setForgotEmail("");
    setNewPassword("");
    setChangePassOtp(["", "", "", "", "", ""]);
    setWarning("");
  };

  const redirectByRole = (role) => {
    switch (role) {
      case "admin":
        navigate("/AdminMainLayout"); 
        break;
      case "project_manager":
        navigate("/teacher"); // Teacher Dashboard
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
      const response = await fetch("http://localhost/PMT/api/login.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Email: email, Password: password }),
      });

      const result = await response.json();

      if (result.status === "success") {
        localStorage.setItem("user", JSON.stringify(result.user));
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
  const handleForgotConfirm = () => {
    if (!forgotEmail || !newPassword) {
      setWarning("Please fill out all fields!");
      return;
    }
    setWarning("");
    setStep("otp");
    setTimeout(() => changePassOtpRefs.current[0]?.focus(), 100);
  };

  const handleConfirmOtp = () => {
    const enteredOtp = changePassOtp.join("");
    if (enteredOtp.length !== 6) {
      setWarning("Please enter the 6-digit OTP");
      return;
    }
    alert("Password reset successful!");
    clearForgotFields();
    setStep("login");
  };

  const handleCancelOtp = () => {
    clearForgotFields();
    setStep("forgot");
  };

  const handleResendOtp = () => {
    alert(`OTP resent to ${forgotEmail}`);
    setChangePassOtp(["", "", "", "", "", ""]);
    setTimeout(() => changePassOtpRefs.current[0]?.focus(), 100);
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
                    <label><input type="checkbox" /> Remember me</label>
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

                  <div className="login-input-group">
                    <input
                      type="password"
                      placeholder="Enter New Password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
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
