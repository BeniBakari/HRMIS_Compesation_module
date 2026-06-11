import React, { useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash, faPencilAlt, faTimes, faSpinner } from "@fortawesome/free-solid-svg-icons";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

export default function ChangePasswordModal() {
  const { mustChangePassword, clearMustChangePassword } = useAuth();

  const [form, setForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [show, setShow] = useState({ current: false, new: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (!mustChangePassword) return null;

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError("");
    setSuccess("");
  };

  const toggleShow = (field) => setShow((s) => ({ ...s, [field]: !s[field] }));

  const handleSubmit = async () => {
    if (!form.current_password || !form.new_password || !form.confirm_password) {
      setError("Tafadhali jaza sehemu zote.");
      return;
    }
    if (form.new_password !== form.confirm_password) {
      setError("New passwords do not match.");
      return;
    }
    if (form.new_password.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }
    if (form.new_password === form.current_password) {
      setError("New password must be different from the current password.");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/api/auth/users/change-password/`, {
        current_password: form.current_password,
        new_password: form.new_password,
        confirm_password: form.confirm_password,
      });
      setSuccess("Password changed successfully!");
      setTimeout(() => {
        clearMustChangePassword();
      }, 1500);
    } catch (err) {
      const data = err.response?.data;
      setError(
        data?.detail ||
        data?.current_password?.[0] ||
        data?.new_password?.[0] ||
        "Failed to change password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0,
      backgroundColor: "rgba(0,0,0,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 9999,
    }}>
      <div style={{
        background: "#fff",
        borderRadius: "12px",
        width: "100%",
        maxWidth: "480px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        overflow: "hidden",
        margin: "16px",
      }}>

        {/* Header */}
        <div style={{
          background: "#1c236d", color: "#fff",
          padding: "18px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontWeight: 600, fontSize: "1.05rem" }}>
            Please Change Default Password
          </span>
          <button disabled style={{
            background: "rgba(255,255,255,0.15)", border: "none",
            borderRadius: "6px", color: "#fff", cursor: "not-allowed",
            width: "30px", height: "30px",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "28px 28px 20px" }}>
          <p style={{ color: "#1c236d", fontWeight: 600, fontSize: "1rem", marginBottom: "20px" }}>
            User Password setup
          </p>

          {error && (
            <div style={{
              background: "#fde8e8", border: "1px solid #f5c6cb",
              color: "#721c24", borderRadius: "8px",
              padding: "10px 14px", marginBottom: "16px", fontSize: "0.88rem",
            }}>{error}</div>
          )}
          {success && (
            <div style={{
              background: "#d4edda", border: "1px solid #c3e6cb",
              color: "#155724", borderRadius: "8px",
              padding: "10px 14px", marginBottom: "16px", fontSize: "0.88rem",
            }}>{success}</div>
          )}

          {[
            { label: "Enter Current Password", name: "current_password", showKey: "current" },
            { label: "Enter New Password", name: "new_password", showKey: "new" },
            { label: "Confirm Password", name: "confirm_password", showKey: "confirm" },
          ].map(({ label, name, showKey }) => (
            <div key={name} style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "0.82rem", color: "#555", display: "block", marginBottom: "6px" }}>
                {label}
              </label>
              <div style={{
                display: "flex", alignItems: "center",
                border: "1px solid #ccc", borderRadius: "8px",
                padding: "10px 14px", background: "#f9f9f9",
              }}>
                <input
                  type={show[showKey] ? "text" : "password"}
                  name={name}
                  value={form[name]}
                  onChange={handleChange}
                  disabled={loading}
                  style={{
                    flex: 1, border: "none", background: "transparent",
                    fontSize: "0.95rem", outline: "none", color: "#333",
                  }}
                />
                <button type="button" onClick={() => toggleShow(showKey)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#888" }}>
                  <FontAwesomeIcon icon={show[showKey] ? faEyeSlash : faEye} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: "0 28px 24px", display: "flex", gap: "12px", justifyContent: "flex-end" }}>
          <button disabled style={{
            background: "#dc3545", color: "#fff", border: "none",
            borderRadius: "8px", padding: "10px 22px", fontWeight: 500,
            cursor: "not-allowed", opacity: 0.6,
            display: "flex", alignItems: "center", gap: "6px",
          }}>
            <FontAwesomeIcon icon={faTimes} /> Close
          </button>
          <button type="button" onClick={handleSubmit} disabled={loading} style={{
            background: "#1c236d", color: "#fff", border: "none",
            borderRadius: "8px", padding: "10px 22px", fontWeight: 500,
            cursor: loading ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", gap: "6px",
            opacity: loading ? 0.8 : 1,
          }}>
            {loading
              ? <><FontAwesomeIcon icon={faSpinner} spin /> Changing...</>
              : <><FontAwesomeIcon icon={faPencilAlt} /> Change Password</>
            }
          </button>
        </div>

      </div>
    </div>
  );
}