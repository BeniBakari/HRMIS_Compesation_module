import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useParams, useNavigate } from "react-router-dom";
import { BadgeCheck, Shield, Loader2, AlertCircle, ArrowLeft, RefreshCw, UserX, UserCheck2 } from "lucide-react";
import { authApi } from "../services/api";
import {
  ConfirmAlert,
  SuccessAlert,
  ErrorAlert,
} from "../components/layout/confirmSweetAlert";

// ---------------------------------------------------------------------------
// Shared UI sub-components
// ---------------------------------------------------------------------------
function Avatar({ user }) {
  const initials = `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase();
  return (
    <div
      style={{
        width: "120px",
        height: "120px",
        borderRadius: "50%",
        background: "#e4e9f0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "48px",
        fontWeight: 500,
        color: "var(--neu-primary)",
        boxShadow: "10px 10px 20px rgba(163,177,198,0.4), -10px -10px 20px rgba(255,255,255,0.7)",
        border: "5px solid white",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {user.profile_photo ? (
        <img src={`data:image/png;base64,${user.profile_photo}`} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        initials || "?"
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #f1f5f9", gap: "12px" }}>
      <div style={{ fontSize: "11px", fontWeight: 500, color: "#94a3b8" }}>{label}</div>
      <div style={{ fontWeight: 500, color: "#1c236d", textAlign: "right", wordBreak: "break-word" }}>{value || "—"}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ProfileView — pure rendering
// ---------------------------------------------------------------------------
function ProfileView({ user, isOwnProfile, onBack, onSync, syncing, onToggleActive, toggling }) {
  const displayName = user.full_name || `${user.first_name || ""} ${user.last_name || ""}`.trim();
  const isActive = user.is_active !== false;

  return (
    <div className="template-container">

      {/* Back button */}
      {!isOwnProfile && (
        <button
          onClick={onBack}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: "#1c236d", fontWeight: 500, fontSize: "14px", cursor: "pointer", padding: "6px 0", marginBottom: "18px", opacity: 0.7 }}
        >
          <ArrowLeft size={16} /> Back to Users
        </button>
      )}

      {/* ── Header card ── */}
      <div
        style={{
          marginBottom: "25px",
          background: "white",
          borderRadius: "20px",
          padding: "40px",
          boxShadow: "var(--neu-shadow-raised)",
          border: "1px solid rgba(255,255,255,0.4)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* decorative blob */}
        <div style={{ position: "absolute", top: "-100px", left: "-100px", width: "300px", height: "300px", background: "var(--neu-primary)", opacity: 0.05, borderRadius: "50%", pointerEvents: "none" }} />

        {/* Viewing another user notice */}
        {!isOwnProfile && (
          <div style={{ marginBottom: "20px", padding: "10px 16px", background: "rgba(28,35,109,0.06)", borderRadius: "10px", display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "12px", fontWeight: 500, color: "#1c236d" }}>
            <Shield size={13} /> Viewing another officer's profile
          </div>
        )}

        {/* Avatar + Info + Action buttons — one row */}
        <div style={{ display: "flex", alignItems: "center", gap: "35px", position: "relative", zIndex: 2, flexWrap: "wrap" }}>
          <Avatar user={user} />

          {/* Name / rank — grows to fill space */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--neu-primary)", background: "rgba(28,35,109,0.05)", padding: "5px 12px", borderRadius: "20px", letterSpacing: "1px" }}>
                {isOwnProfile ? "SYSTEM USER PROFILE" : "OFFICER PROFILE"}
              </span>
              <span style={{ fontSize: "11px", fontWeight: 500, color: "white", background: "#1c236d", padding: "6px 16px", borderRadius: "20px", letterSpacing: "0.5px", boxShadow: "0 4px 10px rgba(28,35,109,0.2)", display: "inline-flex", alignItems: "center", textTransform: "uppercase" }}>
                {user.role?.replace(/_/g, " ")}
              </span>
              {/* Active / Inactive badge */}
              <span style={{ fontSize: "11px", fontWeight: 500, color: isActive ? "#166534" : "#991b1b", background: isActive ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)", padding: "5px 12px", borderRadius: "20px", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: isActive ? "#22c55e" : "#ef4444", display: "inline-block" }} />
                {isActive ? "ACTIVE" : "INACTIVE"}
              </span>
            </div>

            <h1 style={{ fontSize: "36px", fontWeight: 500, color: "#1c236d", margin: "0 0 10px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {displayName || "Unknown User"}
            </h1>

            <div style={{ display: "flex", gap: "20px", opacity: 0.7, fontWeight: 500, fontSize: "15px", flexWrap: "wrap" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "8px" }}><BadgeCheck size={16} /> {user.rank || "OFFICER"}</span>
              <span style={{ display: "flex", alignItems: "center", gap: "8px" }}><Shield size={16} /> {user.force_number || "ID NOT SET"}</span>
            </div>
          </div>

          {/* ── Action buttons — one row, compact ── */}
          <div style={{ display: "flex", flexDirection: "row", gap: "8px", flexShrink: 0, alignItems: "center", flexWrap: "wrap" }}>
            {/* Sync button */}
            <button
              onClick={onSync}
              disabled={syncing || toggling}
              title="Sync from HRMIS"
              style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                background: "#1c236d", color: "white", border: "none",
                borderRadius: "8px", padding: "8px 14px",
                fontWeight: 500, fontSize: "12px",
                cursor: (syncing || toggling) ? "not-allowed" : "pointer",
                opacity: (syncing || toggling) ? 0.7 : 1,
                boxShadow: "0 3px 8px rgba(28,35,109,0.2)",
                letterSpacing: "0.4px", whiteSpace: "nowrap",
              }}
            >
              <RefreshCw size={13} style={{ animation: syncing ? "spin 1s linear infinite" : "none" }} />
              {syncing ? "SYNCING..." : "SYNC HRMIS"}
            </button>

            {/* Deactivate / Activate — hidden on own profile */}
            {!isOwnProfile && (
              <button
                onClick={onToggleActive}
                disabled={toggling || syncing}
                title={isActive ? "Deactivate account" : "Activate account"}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "6px",
                  background: isActive ? "rgba(220,38,38,0.07)" : "rgba(22,163,74,0.07)",
                  color: isActive ? "#dc2626" : "#16a34a",
                  border: `1.5px solid ${isActive ? "rgba(220,38,38,0.3)" : "rgba(22,163,74,0.3)"}`,
                  borderRadius: "8px", padding: "8px 14px",
                  fontWeight: 500, fontSize: "12px",
                  cursor: (toggling || syncing) ? "not-allowed" : "pointer",
                  opacity: (toggling || syncing) ? 0.7 : 1,
                  letterSpacing: "0.4px", whiteSpace: "nowrap",
                }}
              >
                {toggling
                  ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
                  : isActive ? <UserX size={13} /> : <UserCheck2 size={13} />}
                {toggling
                  ? isActive ? "DEACTIVATING..." : "ACTIVATING..."
                  : isActive ? "DEACTIVATE" : "ACTIVATE"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Detail cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "25px" }}>
        {/* Identity */}
        <div className="results-card" style={{ padding: "30px" }}>
          <h3 className="section-title" style={{ marginBottom: "25px" }}>IDENTITY INFORMATION</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <InfoRow label="OFFICIAL EMAIL" value={user.email} />
            <InfoRow label="PHONE NUMBER" value={user.phone} />
            <InfoRow label="SYSTEM ACCESS ROLE" value={user.role?.replace(/_/g, " ")} />
            <InfoRow label="CHECK NUMBER" value={user.check_number} />
            <InfoRow label="NIN" value={user.nin} />
          </div>
        </div>

        {/* Service */}
        <div className="results-card" style={{ padding: "30px" }}>
          <h3 className="section-title" style={{ marginBottom: "25px" }}>SERVICE & DEPLOYMENT</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ padding: "20px", background: "rgba(28,35,109,0.03)", borderRadius: "15px", textAlign: "center" }}>
              <div style={{ fontSize: "10px", fontWeight: 500, color: "#94a3b8", marginBottom: "8px" }}>POSTED STATION</div>
              <div style={{ fontWeight: 500, color: "#1c236d", fontSize: "18px" }}>{user.station || "—"}</div>
            </div>
            <InfoRow label="UNIT / DEPARTMENT" value={user.unit} />
            <div style={{ padding: "20px", background: "#f8fafc", borderRadius: "15px", border: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: "11px", fontWeight: 500, color: "#94a3b8", marginBottom: "10px" }}>SERVICE STATUS</div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: isActive ? "#22c55e" : "#ef4444" }} />
                <span style={{ fontWeight: 500, color: isActive ? "#166534" : "#991b1b" }}>
                  {isActive ? "Currently Active in Registry" : "Inactive"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg); } }` }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root export
// ---------------------------------------------------------------------------
export default function Profile({ userId: userIdProp }) {
  const { user: currentUser } = useAuth();
  const { userId: userIdParam } = useParams();
  const navigate = useNavigate();

  const targetId = userIdProp || userIdParam || null;
  const isOwnProfile =
    !targetId ||
    String(targetId) === String(currentUser?.id) ||
    String(targetId) === String(currentUser?.uid);

  const [targetUser, setTargetUser] = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [syncing, setSyncing]       = useState(false);
  const [toggling, setToggling]     = useState(false);

  const loadTargetUser = (id) => {
    setLoading(true);
    setError(null);
    setTargetUser(null);
    authApi
      .get_user(id)
      .then((data) => setTargetUser(data))
      .catch((err) => setError(err.message || "Failed to load user."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isOwnProfile) { setTargetUser(null); setLoading(false); setError(null); return; }
    loadTargetUser(targetId);
  }, [targetId, isOwnProfile]);

  // ── Sync ──────────────────────────────────────────────────────────────────
  const handleSync = async () => {
    const userId = isOwnProfile ? currentUser?.id || currentUser?.uid : targetId;
    const result = await ConfirmAlert({
      title: "Update from HRMIS?",
      text: "Are you sure you want to refresh data from HRMIS?",
      confirmButtonText: "Yes, update",
      cancelButtonText: "Cancel",
      icon: "question",
    });
    if (!result.isConfirmed) return;
    setSyncing(true);
    try {
      const response = await authApi.syncHRMIS(userId);
      await SuccessAlert({ title: "Updated!", text: response?.message || "Data has been refreshed from HRMIS.", confirmButtonText: "Great!", timer: 3000 });
      if (!isOwnProfile) loadTargetUser(targetId);
    } catch (err) {
      await ErrorAlert({ title: "Failed!", text: err?.response?.data?.message || "Could not refresh data from HRMIS.", confirmButtonText: "OK" });
    } finally {
      setSyncing(false);
    }
  };

  // ── Toggle active / inactive ──────────────────────────────────────────────
  const handleToggleActive = async () => {
    const user = targetUser;
    if (!user) return;
    const isActive = user.is_active !== false;
    const result = await ConfirmAlert({
      title: isActive ? "Deactivate Account?" : "Activate Account?",
      text: isActive
        ? `This will prevent ${user.full_name || user.first_name} from logging in.`
        : `This will restore access for ${user.full_name || user.first_name}.`,
      confirmButtonText: isActive ? "Yes, deactivate" : "Yes, activate",
      cancelButtonText: "Cancel",
      icon: "warning",
    });
    if (!result.isConfirmed) return;
    setToggling(true);
    try {
      const response = await authApi.toggleUserActive(user.id);
      await SuccessAlert({
        title: isActive ? "Deactivated!" : "Activated!",
        text: response?.message || `Account has been ${isActive ? "deactivated" : "activated"}.`,
        confirmButtonText: "OK",
        timer: 3000,
      });
      loadTargetUser(targetId);
    } catch (err) {
      await ErrorAlert({ title: "Failed!", text: err?.response?.data?.message || "Could not update account status.", confirmButtonText: "OK" });
    } finally {
      setToggling(false);
    }
  };

  if (!currentUser) return null;

  if (loading) {
    return (
      <div className="template-container" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "300px", gap: "12px", color: "#1c236d", opacity: 0.6, fontWeight: 500 }}>
        <Loader2 size={22} style={{ animation: "spin 1s linear infinite" }} />
        Loading officer profile…
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="template-container" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "300px", gap: "12px", color: "#dc2626" }}>
        <AlertCircle size={32} />
        <p style={{ fontWeight: 500, margin: 0 }}>Could not load profile</p>
        <p style={{ fontSize: "13px", opacity: 0.7, margin: 0 }}>{error}</p>
        <button onClick={() => navigate("/users")} style={{ marginTop: "10px", background: "none", border: "1px solid #dc2626", color: "#dc2626", borderRadius: "8px", padding: "8px 20px", cursor: "pointer", fontWeight: 500 }}>← Back to Users</button>
      </div>
    );
  }

  const userToShow = isOwnProfile ? currentUser : targetUser;
  if (!userToShow) return null;

  return (
    <ProfileView
      user={userToShow}
      isOwnProfile={isOwnProfile}
      onBack={() => navigate("/users")}
      onSync={handleSync}
      syncing={syncing}
      onToggleActive={handleToggleActive}
      toggling={toggling}
    />
  );
}