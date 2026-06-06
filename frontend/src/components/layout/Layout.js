import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { usePermissions } from "../../hooks/usePermissions";
import { notifApi, authApi } from "../../services/api";
import Footer from "./Footer";
import ChangePasswordModal1 from "../../pages/ChangePasswordModal";
import {
  Menu,
  X,
  Search,
  Bell,
  ChevronDown,
  ChevronRight,
  LogOut,
  LayoutDashboard,
  FolderOpen,
  PlusCircle,
  ClipboardCheck,
  BarChart3,
  Users,
  Settings,
  Calculator,
  User,
  Shield,
  FileText,
  KeyRound,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import "./Layout.css";

// ─────────────────────────────────────────────────────────────────────────────
// Change Password Modal
// ─────────────────────────────────────────────────────────────────────────────
function ChangePasswordModal({ user, onClose }) {
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const strength = (() => {
    if (!newPwd) return null;
    let score = 0;
    if (newPwd.length >= 8) score++;
    if (/[A-Z]/.test(newPwd)) score++;
    if (/[0-9]/.test(newPwd)) score++;
    if (/[^A-Za-z0-9]/.test(newPwd)) score++;
    if (score <= 1) return { label: "Weak", color: "#ef4444", width: "25%" };
    if (score === 2) return { label: "Fair", color: "#f59e0b", width: "50%" };
    if (score === 3) return { label: "Good", color: "#3b82f6", width: "75%" };
    return { label: "Strong", color: "#22c55e", width: "100%" };
  })();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentPwd || !newPwd || !confirmPwd)
      return setError("All fields are required.");
    if (newPwd.length < 8)
      return setError("New password must be at least 8 characters.");
    if (newPwd !== confirmPwd) return setError("New passwords do not match.");
    setSaving(true);
    try {
      await authApi.changePassword(user.id, {
        current_password: currentPwd,
        new_password: newPwd,
      });

      onClose("success");
    } catch (err) {
      const d = err?.response?.data;
      setError(
        d?.current_password?.[0] ||
          d?.new_password?.[0] ||
          d?.detail ||
          d?.message ||
          d?.error ||
          "Failed to change password.",
      );
    } finally {
      setSaving(false);
    }
  };

  const fieldWrapStyle = {
    display: "flex",
    alignItems: "center",
    background: "#f8fafc",
    borderRadius: "12px",
    border: "1.5px solid #e2e8f0",
    padding: "0 14px",
    transition: "border-color 0.2s, box-shadow 0.2s",
  };
  const inputStyle = {
    flex: 1,
    border: "none",
    background: "transparent",
    padding: "12px 0",
    fontSize: "14px",
    color: "#1c236d",
    fontWeight: 500,
    outline: "none",
    width: "100%",
  };
  const eyeBtnStyle = {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#94a3b8",
    padding: "4px",
    display: "flex",
    alignItems: "center",
    borderRadius: "6px",
    flexShrink: 0,
  };
  const labelStyle = {
    fontSize: "11px",
    fontWeight: 600,
    color: "#94a3b8",
    letterSpacing: "0.8px",
    textTransform: "uppercase",
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(15,20,50,0.45)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        animation: "fadeIn 0.15s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white",
          borderRadius: "24px",
          width: "100%",
          maxWidth: "440px",
          boxShadow: "0 32px 80px rgba(0,0,0,0.2)",
          animation: "slideUp 0.2s ease",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: "linear-gradient(135deg, #1c236d 0%, #2d3a8c 100%)",
            padding: "28px 32px 24px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "-40px",
              right: "-40px",
              width: "120px",
              height: "120px",
              borderRadius: "50%",
              background: "rgba(255,255,255,0.05)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              position: "relative",
              zIndex: 1,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "14px",
                  background: "rgba(255,255,255,0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <KeyRound size={20} color="white" />
              </div>
              <div style={{ textAlign: "center" }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "17px",
                    fontWeight: 600,
                    color: "white",
                  }}
                >
                  Change Password
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: "12px",
                    color: "rgba(255,255,255,0.65)",
                    marginTop: "4px",
                  }}
                >
                  Enter your current and new password below.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.1)",
                border: "none",
                cursor: "pointer",
                color: "rgba(255,255,255,0.8)",
                width: "32px",
                height: "32px",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "28px 32px 32px" }}>
          {error && (
            <div
              style={{
                background: "rgba(220,38,38,0.06)",
                border: "1.5px solid rgba(220,38,38,0.2)",
                borderRadius: "12px",
                padding: "12px 16px",
                marginBottom: "22px",
                fontSize: "13px",
                color: "#dc2626",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: "9px",
                animation: "shake 0.35s ease",
              }}
            >
              <Shield size={14} style={{ flexShrink: 0 }} /> {error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "18px" }}
          >
            {/* Current Password */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "6px" }}
            >
              <label style={labelStyle}>Current Password</label>
              <div style={fieldWrapStyle} className="pwd-field-wrapper">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPwd}
                  onChange={(e) => {
                    setCurrentPwd(e.target.value);
                    setError("");
                  }}
                  placeholder="Enter your current password"
                  disabled={saving}
                  style={inputStyle}
                />
                <button
                  type="button"
                  style={eyeBtnStyle}
                  onClick={() => setShowCurrent((v) => !v)}
                >
                  {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "6px" }}
            >
              <label style={labelStyle}>New Password</label>
              <div style={fieldWrapStyle} className="pwd-field-wrapper">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPwd}
                  onChange={(e) => {
                    setNewPwd(e.target.value);
                    setError("");
                  }}
                  placeholder="Enter new password"
                  disabled={saving}
                  style={inputStyle}
                />
                <button
                  type="button"
                  style={eyeBtnStyle}
                  onClick={() => setShowNew((v) => !v)}
                >
                  {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Strength bar */}
            {newPwd && strength && (
              <div style={{ marginTop: "-8px" }}>
                <div
                  style={{
                    height: "4px",
                    background: "#e2e8f0",
                    borderRadius: "99px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: strength.width,
                      background: strength.color,
                      borderRadius: "99px",
                      transition: "width 0.3s ease, background 0.3s ease",
                    }}
                  />
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: strength.color,
                    fontWeight: 600,
                    marginTop: "5px",
                  }}
                >
                  {strength.label} password
                </div>
              </div>
            )}

            {/* Confirm Password */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "6px" }}
            >
              <label style={labelStyle}>Confirm New Password</label>
              <div style={fieldWrapStyle} className="pwd-field-wrapper">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPwd}
                  onChange={(e) => {
                    setConfirmPwd(e.target.value);
                    setError("");
                  }}
                  placeholder="Re-enter new password"
                  disabled={saving}
                  style={inputStyle}
                />
                <button
                  type="button"
                  style={eyeBtnStyle}
                  onClick={() => setShowConfirm((v) => !v)}
                >
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Match indicator */}
            {confirmPwd && (
              <div
                style={{
                  marginTop: "-10px",
                  fontSize: "12px",
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  color: newPwd === confirmPwd ? "#16a34a" : "#ef4444",
                }}
              >
                {newPwd === confirmPwd ? (
                  <>
                    <CheckCircle2 size={13} /> Passwords match
                  </>
                ) : (
                  <>
                    <X size={13} /> Passwords do not match
                  </>
                )}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  flex: 1,
                  background: saving ? "#94a3b8" : "#1c236d",
                  color: "white",
                  border: "none",
                  borderRadius: "12px",
                  padding: "13px",
                  fontWeight: 600,
                  fontSize: "13px",
                  cursor: saving ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  letterSpacing: "0.5px",
                  boxShadow: saving ? "none" : "0 4px 14px rgba(28,35,109,0.3)",
                }}
              >
                {saving ? (
                  <>
                    <Loader2
                      size={15}
                      style={{ animation: "spin 1s linear infinite" }}
                    />{" "}
                    UPDATING...
                  </>
                ) : (
                  <>
                    <KeyRound size={14} /> UPDATE PASSWORD
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                style={{
                  flex: "0 0 100px",
                  background: "none",
                  border: "1.5px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "13px",
                  fontWeight: 500,
                  fontSize: "13px",
                  cursor: "pointer",
                  color: "#64748b",
                }}
              >
                CANCEL
              </button>
            </div>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shake   { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        @keyframes spin    { to { transform: rotate(360deg); } }
        .pwd-field-wrapper:focus-within {
          border-color: #1c236d !important;
          box-shadow: 0 0 0 3px rgba(28,35,109,0.08) !important;
          background: white !important;
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Layout
// ─────────────────────────────────────────────────────────────────────────────
export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const perms = usePermissions();
  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState("");
  const [activeDesktopMenu, setActiveDesktopMenu] = useState(null);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  const [searchOpen, setSearchOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [changePwdUser, setChangePwdUser] = useState(null); // null = closed, user object = open
  const [pwdSuccessBanner, setPwdSuccessBanner] = useState(false);

  const searchInputRef = useRef(null);
  const userMenuRef = useRef(null);
  const desktopSubmenuRef = useRef(null);
  const sidebarRef = useRef(null);
  const submenuTimerRef = useRef(null);

  useEffect(() => {
    notifApi
      .list()
      .then((data) => setUnreadCount(data.filter((n) => !n.is_read).length))
      .catch(() => {});
    const interval = setInterval(() => {
      notifApi
        .list()
        .then((data) => setUnreadCount(data.filter((n) => !n.is_read).length))
        .catch(() => {});
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 1024;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        userDropdownOpen &&
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target)
      )
        setUserDropdownOpen(false);
      if (
        notifDropdownOpen &&
        !event.target.closest(".notifications-header-container")
      )
        setNotifDropdownOpen(false);
      if (
        activeDesktopMenu &&
        desktopSubmenuRef.current &&
        !desktopSubmenuRef.current.contains(event.target) &&
        !event.target.closest(".desktop-nav-link")
      )
        setActiveDesktopMenu(null);
      if (searchOpen && !event.target.closest(".search-container"))
        setSearchOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (submenuTimerRef.current) clearTimeout(submenuTimerRef.current);
    };
  }, [userDropdownOpen, activeDesktopMenu, searchOpen, notifDropdownOpen]);

  const allMenuSections = useMemo(
    () => [
      {
        title: "Navigation",
        items: [
          {
            id: "dashboard",
            name: "Dashboard",
            icon: LayoutDashboard,
            path: "/dashboard",
            single: true,
          },
          {
            id: "cases-menu",
            name: "Cases Management",
            icon: FolderOpen,
            permission: "canViewAllCases",
            subItems: [
              {
                name: "All Cases",
                path: "/cases",
                icon: FileText,
                permission: "canViewAllCases",
              },
              {
                name: "New Case",
                path: "/cases/new",
                icon: PlusCircle,
                permission: "canSubmitCases",
              },
              {
                name: "My Assignments",
                path: "/cases/assigned",
                icon: ClipboardCheck,
                permission: "canSubmitAssessment",
              },
            ],
          },
          {
            id: "reports",
            name: "Reports Center",
            icon: BarChart3,
            path: "/reports",
            single: true,
            permission: "canViewReports",
          },
        ],
      },
      {
        title: "System Configuration",
        items: [
          {
            id: "system-menu",
            name: "Configuration",
            icon: Settings,
            permission: "canManageUsers",
            subItems: [
              {
                name: "User Directory",
                path: "/users",
                icon: Users,
                permission: "canManageUsers",
              },
              {
                name: "Calculation Formulas",
                path: "/formulas",
                icon: Calculator,
                permission: "canManageFormulas",
              },
            ],
          },
        ],
      },
    ],
    [],
  );

  const menuSections = useMemo(() => {
    return allMenuSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          if (item.permission && !perms[item.permission]) return false;
          if (item.subItems) {
            item.subItems = item.subItems.filter(
              (sub) => !sub.permission || perms[sub.permission],
            );
            return item.subItems.length > 0;
          }
          return true;
        }),
      }))
      .filter((s) => s.items.length > 0);
  }, [allMenuSections, perms]);

  const activeDesktopMenuItem = useMemo(() => {
    if (!activeDesktopMenu) return null;
    for (const section of menuSections)
      for (const item of section.items)
        if (item.id === activeDesktopMenu) return item;
    return null;
  }, [activeDesktopMenu, menuSections]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const getUserInitials = () => {
    if (user?.full_name) {
      const parts = user.full_name.split(" ");
      return (
        parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0].substring(0, 2)
      ).toUpperCase();
    }
    return "U";
  };

  const fetchNotifications = useCallback(async () => {
    setLoadingNotifs(true);
    try {
      const data = await notifApi.list();
      setNotifications(data.slice(0, 5));
      setUnreadCount(data.filter((n) => !n.is_read).length);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingNotifs(false);
    }
  }, []);

  const handleToggleNotifs = () => {
    if (!notifDropdownOpen) fetchNotifications();
    setNotifDropdownOpen(!notifDropdownOpen);
  };

  const handleMarkRead = async (id) => {
    try {
      await notifApi.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {}
  };

  const handlePwdModalClose = (result) => {
    setChangePwdUser(null);
    if (result === "success") {
      setPwdSuccessBanner(true);
      setTimeout(() => setPwdSuccessBanner(false), 4000);
    }
  };

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);
  const closeDesktopMenu = () => setActiveDesktopMenu(null);

  return (
    <div className="layout">
      {/* Change Password Modal */}
      {changePwdUser && (
        <ChangePasswordModal
          user={changePwdUser}
          onClose={handlePwdModalClose}
        />
      )}

      {/* Success toast banner */}
      {pwdSuccessBanner && (
        <div
          style={{
            position: "fixed",
            top: "80px",
            right: "24px",
            zIndex: 9998,
            background: "#1c236d",
            color: "white",
            padding: "14px 20px",
            borderRadius: "14px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "13px",
            fontWeight: 500,
            boxShadow: "0 8px 24px rgba(28,35,109,0.35)",
            animation: "slideDown 0.3s ease",
          }}
        >
          <CheckCircle2 size={16} color="#4ade80" />
          Password updated successfully!
          <button
            onClick={() => setPwdSuccessBanner(false)}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.6)",
              cursor: "pointer",
              padding: "0 0 0 8px",
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Top Navbar */}
      <nav className="top-navbar visible">
        <div className="navbar-content">
          <div className="left-section">
            {isMobile && (
              <button className="mobile-menu-btn" onClick={toggleSidebar}>
                <Menu size={20} />
              </button>
            )}
            <div
              className="logo-text-container"
              onClick={() => navigate("/dashboard")}
              style={{ cursor: "pointer" }}
            >
              <img src="/police_logo.png" alt="Logo" className="police-logo" />
              <div className="brand-divider">|</div>
              <span className="brand-text">Compensation Management</span>
            </div>
          </div>

          <div className="right-section">
            {/* Search */}
            <div className="search-container">
              {searchOpen ? (
                <div className="search-bar">
                  <Search size={16} className="search-icon" />
                  <input
                    ref={searchInputRef}
                    className="search-input"
                    placeholder="Quick Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                  <button
                    className="search-close-btn"
                    onClick={() => setSearchOpen(false)}
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  className="search-btn"
                  onClick={() => {
                    setSearchOpen(true);
                    setTimeout(() => searchInputRef.current?.focus(), 100);
                  }}
                >
                  <Search size={20} />
                </button>
              )}
            </div>

            {/* Notifications */}
            <div className="notifications-header-container">
              <button
                className="notifications-header-btn"
                onClick={handleToggleNotifs}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="notification-badge-header">
                    {unreadCount}
                  </span>
                )}
              </button>
              {notifDropdownOpen && (
                <div className="notif-dropdown-popup">
                  <div className="notif-dropdown-header">
                    <span>Recent Notifications</span>
                    {unreadCount > 0 && (
                      <span className="notif-unread-tag">
                        {unreadCount} New
                      </span>
                    )}
                  </div>
                  <div className="notif-dropdown-list">
                    {loadingNotifs ? (
                      <div className="notif-empty-state">Loading...</div>
                    ) : notifications.length > 0 ? (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`notif-item ${!n.is_read ? "unread" : ""}`}
                          onClick={() => {
                            if (!n.is_read) handleMarkRead(n.id);
                            const caseId = n.corresponding_case?.case_id;
                            if (caseId) navigate(`/cases/${caseId}`);
                            else if (n.link) navigate(n.link);
                            setNotifDropdownOpen(false);
                          }}
                        >
                          <div className="notif-icon-circle">
                            <Bell size={14} />
                          </div>
                          <div className="notif-content">
                            <div className="notif-title">{n.title}</div>
                            <div className="notif-message">{n.message}</div>
                            <div className="notif-time">
                              {new Date(n.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          {!n.is_read && <div className="unread-dot" />}
                        </div>
                      ))
                    ) : (
                      <div className="notif-empty-state">
                        No notifications found
                      </div>
                    )}
                  </div>
                  <div className="notif-dropdown-footer">
                    <button
                      onClick={() => {
                        navigate("/notifications");
                        setNotifDropdownOpen(false);
                      }}
                    >
                      View All Notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Profile dropdown */}
            <div className="profile-avatar-container" ref={userMenuRef}>
              <button
                className="profile-avatar-btn"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              >
                {user?.profile_photo && user.profile_photo.trim() !== "" ? (
                  <img
                    src={`data:image/png;base64,${user.profile_photo}`}
                    alt="Profile"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      borderRadius: "50%",
                      padding: "4px",
                      boxSizing: "border-box",
                    }}
                  />
                ) : (
                  <span className="profile-dropdown-initials">
                    {getUserInitials()}
                  </span>
                )}
              </button>

              {userDropdownOpen && (
                <div className="profile-dropdown-popup">
                  <div className="profile-dropdown-header">
                    <div className="profile-dropdown-avatar">
                      {user?.profile_photo &&
                      user.profile_photo.trim() !== "" ? (
                        <img
                          src={`data:image/png;base64,${user.profile_photo}`}
                          alt="Profile"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            borderRadius: "50%",
                            padding: "4px",
                            boxSizing: "border-box",
                          }}
                        />
                      ) : (
                        <span
                          className="profile-dropdown-initials"
                          style={{
                            color: "#fff",
                            fontWeight: "700",
                            fontSize: "100%",
                          }}
                        >
                          {getUserInitials()}
                        </span>
                      )}
                    </div>
                    <div className="profile-dropdown-info">
                      <div className="profile-dropdown-name">
                        {user?.full_name}
                      </div>
                      <div className="profile-dropdown-role">
                        {user?.rank || "System User"}
                      </div>
                    </div>
                  </div>
                  <div className="profile-dropdown-menu">
                    <button
                      className="profile-dropdown-item"
                      onClick={() => {
                        navigate("/profile");
                        setUserDropdownOpen(false);
                      }}
                    >
                      <User size={16} /> Profile
                    </button>
                    <button
                      className="profile-dropdown-item"
                      onClick={() => {
                        setChangePwdUser(user);
                        setUserDropdownOpen(false);
                      }}
                    >
                      <KeyRound size={16} /> Change Password
                    </button>
                    <button
                      className="profile-dropdown-item logout-item"
                      onClick={handleLogout}
                    >
                      <LogOut size={16} /> Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Sidebar */}
      {isMobile && sidebarOpen && (
        <div className="sidebar-overlay" onClick={closeSidebar}>
          <aside
            className="mobile-sidebar open"
            onClick={(e) => e.stopPropagation()}
            ref={sidebarRef}
          >
            <div className="sidebar-header">
              <div className="sidebar-brand">
                <img
                  src="/police_logo.png"
                  className="sidebar-logo"
                  alt="Logo"
                />
                <h2 className="sidebar-title">Compensation Management</h2>
              </div>
              <button className="sidebar-close-btn" onClick={closeSidebar}>
                <X size={18} />
              </button>
            </div>
            <nav className="sidebar-nav">
              {menuSections.map((section, idx) => (
                <div key={idx} className="nav-section">
                  <div className="section-title">{section.title}</div>
                  <div className="nav-items">
                    {section.items.map((item, i) => (
                      <div key={i} className="nav-item-wrapper">
                        {item.single ? (
                          <Link
                            to={item.path}
                            className={`sidebar-nav-item ${location.pathname === item.path ? "active" : ""}`}
                            onClick={closeSidebar}
                          >
                            <div className="nav-item-icon">
                              <item.icon size={16} />
                            </div>
                            <span className="nav-item-text">{item.name}</span>
                          </Link>
                        ) : (
                          <>
                            <button
                              className={`sidebar-nav-item nav-toggle ${activeMenu === item.name ? "active" : ""}`}
                              onClick={() =>
                                setActiveMenu(
                                  activeMenu === item.name ? "" : item.name,
                                )
                              }
                            >
                              <div className="nav-item-icon">
                                <item.icon size={16} />
                              </div>
                              <span className="nav-item-text">{item.name}</span>
                              <ChevronDown
                                size={12}
                                className={`nav-arrow ${activeMenu === item.name ? "rotate" : ""}`}
                              />
                            </button>
                            <div
                              className={`nav-submenu ${activeMenu === item.name ? "show" : ""}`}
                            >
                              {item.subItems.map((sub, j) => (
                                <Link
                                  key={j}
                                  to={sub.path}
                                  className={`nav-sublink ${location.pathname === sub.path ? "active" : ""}`}
                                  onClick={closeSidebar}
                                >
                                  <div className="nav-item-icon">
                                    <sub.icon size={14} />
                                  </div>
                                  <span className="nav-item-text">
                                    {sub.name}
                                  </span>
                                </Link>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
            <div className="sidebar-footer">
              <button className="logout-btn-sidebar" onClick={handleLogout}>
                <LogOut size={14} /> <span>Logout</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop Sidebar */}
      {!isMobile && (
        <>
          <aside className="desktop-sidebar">
            <nav className="desktop-sidebar-nav">
              <div className="desktop-nav-item">
                <button
                  className={`desktop-nav-link ${location.pathname === "/dashboard" ? "active" : ""}`}
                  onClick={() => {
                    navigate("/dashboard");
                    setActiveDesktopMenu(null);
                  }}
                  aria-label="Dashboard"
                >
                  <LayoutDashboard size={18} />
                </button>
              </div>
              {menuSections.map((section) =>
                section.items.map(
                  (item) =>
                    !item.single && (
                      <div key={item.id} className="desktop-nav-item">
                        <button
                          className={`desktop-nav-link ${activeDesktopMenu === item.id ? "active" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDesktopMenu(
                              activeDesktopMenu === item.id ? null : item.id,
                            );
                          }}
                        >
                          <item.icon size={18} />
                        </button>
                      </div>
                    ),
                ),
              )}
              {menuSections.some((s) =>
                s.items.some((i) => i.id === "reports"),
              ) && (
                <div className="desktop-nav-item">
                  <button
                    className={`desktop-nav-link ${location.pathname === "/reports" ? "active" : ""}`}
                    onClick={() => {
                      navigate("/reports");
                      closeDesktopMenu();
                    }}
                  >
                    <BarChart3 size={18} />
                  </button>
                </div>
              )}
              <div className="sidebar-divider" />
              <div className="desktop-nav-item">
                <button
                  className="desktop-nav-link"
                  onClick={() => {
                    navigate("/profile");
                    closeDesktopMenu();
                  }}
                >
                  <User size={18} />
                </button>
              </div>
              <div className="desktop-nav-item">
                <button
                  className="desktop-nav-link logout-desktop"
                  onClick={() => {
                    handleLogout();
                    closeDesktopMenu();
                  }}
                >
                  <LogOut size={18} />
                </button>
              </div>
            </nav>
          </aside>

          {activeDesktopMenu && activeDesktopMenuItem && (
            <div
              ref={desktopSubmenuRef}
              className="desktop-submenu show"
              style={{ left: "80px" }}
            >
              <div className="submenu-header">
                <div className="submenu-title">
                  <activeDesktopMenuItem.icon
                    size={16}
                    className="submenu-title-icon"
                  />
                  <h3>{activeDesktopMenuItem.name}</h3>
                </div>
              </div>
              <div className="submenu-content">
                <div className="submenu-items">
                  {activeDesktopMenuItem.subItems.map((sub, idx) => (
                    <button
                      key={idx}
                      className={`submenu-item ${location.pathname === sub.path ? "active" : ""}`}
                      onClick={() => {
                        navigate(sub.path);
                        closeDesktopMenu();
                      }}
                    >
                      <div className="submenu-item-icon">
                        <sub.icon size={14} />
                      </div>
                      <span className="submenu-item-text">{sub.name}</span>
                      {location.pathname === sub.path && (
                        <ChevronRight size={12} className="active-indicator" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Main Content */}
      <main className={`main-content ${isMobile ? "mobile-view" : ""}`}>
        <div className="content-wrapper">{children}</div>
        <Footer />
      </main>

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
