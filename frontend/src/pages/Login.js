import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEnvelope,
  faLock,
  faEye,
  faEyeSlash,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import { library } from "@fortawesome/fontawesome-svg-core";
import "../App.css";

library.add(faEnvelope, faLock, faEye, faEyeSlash, faSpinner);

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      // Try every common Django/DRF error shape, then fall back gracefully
      const data = err.response?.data;
      const status = err.response?.status;

      const msg =
        data?.detail ||
        data?.message ||
        data?.non_field_errors?.[0] ||
        data?.error ||
        (typeof data === "string" && data.length < 200 ? data : null) ||
        (status === 400 || status === 401
          ? "Invalid email or password."
          : null) ||
        err.message ||
        "Something went wrong. Please try again.";

      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundImage: "url(/background.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundAttachment: "fixed",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          padding: "20px",
          overflow: "auto",
          zIndex: 0,
        }}
      >
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(228, 233, 240, 0.3)",
            zIndex: 1,
          }}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            width: "100%",
            maxWidth: "400px",
            zIndex: 2,
            position: "relative",
          }}
          className="login-card-container"
        >
          <div
            style={{
              background: "rgba(228, 233, 240, 0.85)",
              borderRadius: "25px",
              boxShadow:
                "15px 15px 30px rgba(163, 177, 198, 0.7), -15px -15px 30px rgba(255, 255, 255, 0.7)",
              padding: "2.5rem 2rem",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255, 255, 255, 0.4)",
              maxWidth: "420px",
              margin: "0 auto",
            }}
          >
            {/* Logo + title */}
            <div
              style={{
                textAlign: "center",
                marginBottom: "30px",
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  margin: "0 auto 1.5rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  width: "130px",
                  height: "130px",
                }}
              >
                <img
                  src="/police_logo.png"
                  alt="Tanzania Police Force Logo"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    filter: "drop-shadow(2px 2px 4px rgba(0,0,0,0.1))",
                  }}
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              </div>
              <h1
                style={{
                  fontSize: "1.8rem",
                  fontWeight: 500,
                  color: "#1c236d",
                  marginBottom: "0.5rem",
                  lineHeight: 1.2,
                  letterSpacing: "1px",
                  textShadow: "2px 2px 4px rgba(163, 177, 198, 0.3)",
                }}
              >
                Compensation Management
              </h1>
              <p
                style={{
                  color: "#1c236d",
                  fontSize: "0.9rem",
                  marginBottom: 0,
                  fontWeight: 500,
                  opacity: 0.8,
                }}
              >
                Sign in to start your session
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div
                style={{
                  borderRadius: "16px",
                  marginBottom: "1.5rem",
                  padding: "14px 18px",
                  fontSize: "0.85rem",
                  background: "rgba(255, 212, 212, 0.9)",
                  color: "#721c24",
                  boxShadow:
                    "inset 4px 4px 8px rgba(255, 82, 82, 0.3), inset -4px -4px 8px rgba(255, 255, 255, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  fontWeight: 500,
                  width: "100%",
                  maxWidth: "320px",
                  backdropFilter: "blur(5px)",
                  animation: "shake 0.4s ease",
                }}
              >
                <svg
                  style={{ width: "16px", height: "16px", flexShrink: 0 }}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                {error}
              </div>
            )}

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              style={{
                width: "100%",
                maxWidth: "320px",
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem",
                margin: "0 auto",
              }}
            >
              {/* Email */}
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label
                  htmlFor="email"
                  style={{
                    fontWeight: 500,
                    color: "#1c236d",
                    fontSize: "0.85rem",
                    marginBottom: "8px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Email
                </label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    background: "rgba(228, 233, 240, 0.7)",
                    borderRadius: "12px",
                    padding: "12px 16px",
                    boxShadow:
                      "inset 5px 5px 10px rgba(163, 177, 198, 0.5), inset -5px -5px 10px rgba(255, 255, 255, 0.5)",
                    backdropFilter: "blur(5px)",
                  }}
                  className="neumorphic-input-wrapper"
                >
                  <FontAwesomeIcon
                    icon={faEnvelope}
                    style={{
                      color: "#1c236d",
                      fontSize: "1rem",
                      marginRight: "12px",
                      width: "18px",
                      flexShrink: 0,
                    }}
                  />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    style={{
                      flex: 1,
                      border: "none",
                      background: "transparent",
                      padding: 0,
                      fontSize: "0.9rem",
                      color: "#1c236d",
                      fontWeight: 500,
                      outline: "none",
                    }}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password */}
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label
                  htmlFor="password"
                  style={{
                    fontWeight: 500,
                    color: "#1c236d",
                    fontSize: "0.85rem",
                    marginBottom: "8px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Password
                </label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    background: "rgba(228, 233, 240, 0.7)",
                    borderRadius: "12px",
                    padding: "12px 16px",
                    boxShadow:
                      "inset 5px 5px 10px rgba(163, 177, 198, 0.5), inset -5px -5px 10px rgba(255, 255, 255, 0.5)",
                    backdropFilter: "blur(5px)",
                  }}
                  className="neumorphic-input-wrapper"
                >
                  <FontAwesomeIcon
                    icon={faLock}
                    style={{
                      color: "#1c236d",
                      fontSize: "1rem",
                      marginRight: "12px",
                      width: "18px",
                      flexShrink: 0,
                    }}
                  />
                  <input
                    type={showPwd ? "text" : "password"}
                    id="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    style={{
                      flex: 1,
                      border: "none",
                      background: "transparent",
                      padding: 0,
                      fontSize: "0.9rem",
                      color: "#1c236d",
                      fontWeight: 500,
                      outline: "none",
                    }}
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    style={{
                      background: "rgba(228, 233, 240, 0.7)",
                      border: "none",
                      padding: "6px",
                      marginLeft: "8px",
                      cursor: "pointer",
                      color: "#1c236d",
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      boxShadow:
                        "4px 4px 8px rgba(163, 177, 198, 0.5), -4px -4px 8px rgba(255, 255, 255, 0.5)",
                    }}
                    className="neumorphic-eye-toggle"
                  >
                    <FontAwesomeIcon icon={showPwd ? faEyeSlash : faEye} />
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate("/forgot-password")}
                style={{
                  background: "none",
                  border: "none",
                  color: "#1c236d", // Bootstrap primary blue
                  textDecoration: "underline",
                  cursor: "pointer",
                  padding: 0,
                  fontSize: "0.9rem",
                }}
              >
                Forgot Password?
              </button>

              {/* Submit */}
              <button
                type="submit"
                id="login-submit-button"
                className="neumorphic-submit-btn"
                disabled={loading}
                style={{
                  width: "100%",
                  background: "#1c236d",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "12px",
                  padding: "1.25rem 2rem",
                  fontSize: "1.1rem",
                  fontWeight: 500,
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "all 0.3s ease",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  marginTop: "0.5rem",
                  boxShadow: "0 8px 20px rgba(28, 35, 109, 0.3)",
                  textTransform: "uppercase",
                  letterSpacing: "1.5px",
                }}
              >
                {loading ? (
                  <>
                    <FontAwesomeIcon
                      icon={faSpinner}
                      spin
                      style={{ marginRight: "8px" }}
                    />{" "}
                    Logging in...
                  </>
                ) : (
                  "LOGIN"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        #login-submit-button {
          color: #ffffff !important;
          font-weight: 500 !important;
          visibility: visible !important;
          opacity: 1 !important;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: 100%; height: 100%; overflow-x: hidden; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        .neumorphic-input-wrapper:focus-within {
          box-shadow: inset 6px 6px 12px rgba(163,177,198,0.6), inset -6px -6px 12px rgba(255,255,255,0.6) !important;
          background: rgba(228,233,240,0.9) !important;
        }
        .neumorphic-eye-toggle:hover { box-shadow: inset 3px 3px 6px rgba(163,177,198,0.5), inset -3px -3px 6px rgba(255,255,255,0.5) !important; }
        .neumorphic-submit-btn { color: #ffffff !important; }
        .neumorphic-submit-btn:hover:not(:disabled) { background: #2d3a8c; transform: translateY(-2px); box-shadow: 0 12px 24px rgba(28,35,109,0.35) !important; }
        .neumorphic-submit-btn:active:not(:disabled) { transform: translateY(0); background: #0f1441; }
        .neumorphic-submit-btn:disabled { background: #1c236d !important; color: #ffffff !important; opacity: 0.85 !important; transform: none; }
        input::placeholder { color: rgba(28,35,109,0.4); font-weight: 500; }
        body > div { background-image: url(/background.jpg) !important; background-size: cover !important; background-position: center !important; background-repeat: no-repeat !important; background-attachment: fixed !important; width: 100vw !important; height: 100vh !important; position: fixed !important; top: 0 !important; left: 0 !important; }
        body { background: none !important; margin: 0 !important; padding: 0 !important; }
        @media (max-width: 768px) { .login-card-container { max-width: 95% !important; padding: 10px !important; } }
        @media (max-width: 480px) { .neumorphic-submit-btn { padding: 12px 16px; font-size: 0.85rem; } }
        @media (max-height: 700px) { body > div { align-items: flex-start !important; padding-top: 40px !important; overflow-y: auto !important; } }
        @media (prefers-reduced-motion: reduce) { * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }
      `,
        }}
      />
    </>
  );
}
