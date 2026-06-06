import { useState, useEffect } from "react";
import { authApi } from "../services/api";
import { useNavigate } from "react-router-dom";
import "./CaseList.css";
import "./CaseSubmission.css";
import { FaEye, FaPencilAlt, FaShield } from "react-icons/fa";
import {
  ConfirmAlert,
  SuccessAlert,
  ErrorAlert,
} from "../components/layout/confirmSweetAlert";
import {
  Users,
  UserPlus,
  X,
  UserCheck,
  ChevronDown,
  Loader,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  UserX,
  UserCheck2,
  Shield,
} from "lucide-react";

const ROLES = [
  { value: "ADMIN", label: "Administrator" },
  { value: "RPC", label: "RPC / Unit Commander" },
  { value: "COMPENSATION_HQ", label: "Compensation HQ" },
  { value: "COMPENSATION__HQ_CO", label: "Compensation HQ - CO" },
  { value: "COMPENSATION__HQ_SO", label: "Compensation HQ - SO" },
  { value: "COMPENSATION_HQ_CHIEF", label: "Compensation HQ - Chief" },
  { value: "CP_ADMINISTRATION", label: "CP_ADMINISTRATION" },
  { value: "COMMITTEE_MEMBER", label: "Committee Member" },
];

const RANKS = [
  { value: "CP_ADMINISTRATION", label: "Inspector General of Police" },
  { value: "DCP_ADMINISTRATION", label: "Deputy CP_ADMINISTRATION" },
  { value: "CASP", label: "Commissioner of Police" },
  { value: "SACP", label: "Senior Assistant Commissioner" },
  { value: "ACP", label: "Assistant Commissioner" },
  { value: "SSP", label: "Senior Superintendent" },
  { value: "SP", label: "Superintendent" },
  { value: "ASP", label: "Assistant Superintendent" },
  { value: "INSP", label: "Inspector" },
  { value: "A/INSP", label: "Acting Inspector" },
  { value: "RSM", label: "Regimental Sergeant Major" },
  { value: "S/SGT", label: "Staff Sergeant" },
  { value: "SGT", label: "Sergeant" },
  { value: "CPL", label: "Corporal" },
  { value: "PC", label: "Police Constable" },
  { value: "CIVILIAN", label: "Civilian" },
  { value: "DR", label: "Doctor" },
];

const DEFAULT_PASSWORD = "!@#$1234";

const EMPTY_FORM = {
  email: "",
  first_name: "",
  last_name: "",
  rank: "",
  role: "",
  force_number: "",
  unit: "",
  station: "",
  phone: "",
  check_number: "",
  nin: "",
  profile_photo: "",
  signature: "",
  password: DEFAULT_PASSWORD,
  confirm_password: DEFAULT_PASSWORD,
};

const getRoleLabel = (roleValue) => {
  const role = ROLES.find(r => r.value === roleValue);
  return role ? role.label : roleValue || "None";
};

const getRankLabel = (rankValue) => {
  const rank = RANKS.find(r => r.value === rankValue);
  return rank ? rank.label : rankValue || "None";
};

function normaliseHRMIS(raw) {
  const d = raw?.info || raw;
  const rawRank = (d.rank || "PC").toString().trim();
  const validRank = RANKS.find((r) => r.value === rawRank)?.value || "PC";
  
  return {
    first_name: d.fname || "",
    last_name: d.lname || "",
    check_number: d.checkno || "",
    nin: d.nin || "",
    rank: validRank,
    unit: d.department || "",
    station: d.stations || d.station || "",
    phone: d.phoneno || "",
    force_number: d.force_number || "",
    email: d.email || "",
    profile_photo: d.photo || "",
    signature: d.signature || "",
  };
}

export default function UserManagement() {
  const navigate = useNavigate();

  const [allUsers, setAllUsers] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState("");
  const [search, setSearch] = useState("");

  // HRMIS lookup state
  const [checkno, setCheckno] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupSuccess, setLookupSuccess] = useState(false);
  const [lookupErr, setLookupErr] = useState("");

  // Per-row action states
  const [syncingId, setSyncingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  // Role change modal state
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState("");
  const [roleChangeSaving, setRoleChangeSaving] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  const load = () => {
    setLoading(true);
    authApi
      .listUsers()
      .then((data) => {
        const list = Array.isArray(data) ? data : data.results || [];
        setAllUsers(list);
        setUsers(list);
        setPage(1);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSearchChange = (val) => {
    setSearch(val);
    setPage(1);
    if (!val.trim()) { setUsers(allUsers); return; }
    const q = val.trim().toLowerCase();
    setUsers(
      allUsers.filter((u) => {
        const fullName = `${u.first_name || ""} ${u.last_name || ""} ${u.full_name || ""}`.toLowerCase();
        const email = (u.email || "").toLowerCase();
        const forceNumber = (u.force_number || "").toLowerCase();
        const unit = (u.unit || "").toLowerCase();
        const station = (u.station || "").toLowerCase();
        const rank = (u.rank || "").toLowerCase();
        return (
          fullName.includes(q) ||
          email.includes(q) ||
          forceNumber.includes(q) ||
          unit.includes(q) ||
          station.includes(q) ||
          rank.includes(q)
        );
      })
    );
  };

  const handleLookup = async () => {
    if (!checkno.trim()) return setLookupErr("Enter check Number.");
    setLookupLoading(true);
    setLookupErr("");
    setLookupSuccess(false);
    try {
      const raw = await authApi.lookupSoldier(checkno.trim());
      const hrmis = normaliseHRMIS(raw);
      if (!hrmis.first_name && !hrmis.last_name) throw new Error("Officer not found.");
      setForm((prev) => ({
        ...EMPTY_FORM,
        ...hrmis,
        password: DEFAULT_PASSWORD,
        role: prev.role,
      }));
      setLookupSuccess(true);
    } catch (err) {
      setLookupErr(err.message || "Officer not found.");
    } finally {
      setLookupLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.email.trim() || !form.first_name.trim() || !form.password) {
      return setFormErr("Required fields are missing.");
    }
    setSaving(true);
    setFormErr("");
    try {
      await authApi.createUser(form);
      setShowForm(false);
      setCheckno("");
      setLookupSuccess(false);
      load();
    } catch (err) {
      setFormErr(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSyncHRMIS = async (id) => {
    const result = await ConfirmAlert({
      title: "Update from HRMIS?",
      text: "Are you sure you want to refresh data from HRMIS?",
      confirmButtonText: "Yes, update",
      cancelButtonText: "Cancel",
      icon: "question",
    });
    if (!result.isConfirmed) return;

    setSyncingId(id);
    try {
      const response = await authApi.syncHRMIS(id);
      await SuccessAlert({
        title: "Updated!",
        text: response?.message || "Data has been refreshed from HRMIS.",
        confirmButtonText: "Great!",
        timer: 3000,
      });
      load();
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message || "Could not refresh data from HRMIS.";
      await ErrorAlert({ title: "Failed!", text: errorMessage, confirmButtonText: "OK" });
    } finally {
      setSyncingId(null);
    }
  };

  // ── Toggle active/inactive ─────────────────────────────────────────────
  const handleToggleActive = async (u) => {
    const isActive = u.is_active;
    const result = await ConfirmAlert({
      title: isActive ? "Deactivate Account?" : "Activate Account?",
      text: isActive
        ? `This will prevent ${u.full_name || u.first_name} from logging in.`
        : `This will restore access for ${u.full_name || u.first_name}.`,
      confirmButtonText: isActive ? "Yes, deactivate" : "Yes, activate",
      cancelButtonText: "Cancel",
      icon: "warning",
    });
    if (!result.isConfirmed) return;

    setTogglingId(u.id);
    try {
      const response = await authApi.toggleUserActive(u.id);
      await SuccessAlert({
        title: isActive ? "Deactivated!" : "Activated!",
        text: response?.message || `Account has been ${isActive ? "deactivated" : "activated"}.`,
        confirmButtonText: "OK",
        timer: 3000,
      });
      load();
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message || "Could not update account status.";
      await ErrorAlert({ title: "Failed!", text: errorMessage, confirmButtonText: "OK" });
    } finally {
      setTogglingId(null);
    }
  };

  // ── Open role change modal ────────────────────────────────────────────
  const openRoleModal = (u) => {
    setSelectedUser(u);
    setSelectedRole(u.role || "");
    setShowRoleModal(true);
  };

  // ── Change user role ───────────────────────────────────────────────────
  const handleChangeRole = async () => {
    if (!selectedRole) {
      await ErrorAlert({ 
        title: "Error", 
        text: "Please select a role",
        confirmButtonText: "OK" 
      });
      return;
    }

    if (selectedRole === selectedUser.role) {
      await ErrorAlert({ 
        title: "No Change", 
        text: "New role is the same as current role",
        confirmButtonText: "OK" 
      });
      return;
    }

    setRoleChangeSaving(true);
    try {
      const response = await authApi.updateUserRole(selectedUser.id, { role: selectedRole });
      await SuccessAlert({
        title: "Role Updated!",
        text: response?.message || `Role changed to ${getRoleLabel(selectedRole)}.`,
        confirmButtonText: "OK",
        timer: 3000,
      });
      setShowRoleModal(false);
      load();
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message || "Could not update user role.";
      await ErrorAlert({ title: "Failed!", text: errorMessage, confirmButtonText: "OK" });
    } finally {
      setRoleChangeSaving(false);
    }
  };

  const openForm = () => {
    setForm(EMPTY_FORM);
    setFormErr("");
    setCheckno("");
    setLookupErr("");
    setLookupSuccess(false);
    setShowForm(true);
  };

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const total = users.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const displayedUsers = users.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="template-container">
      <div className="page-header">
        <div className="header-content">
          <h1>USER MANAGEMENT</h1>
          <p className="page-subtitle">Control system access and user permissions</p>
        </div>
        <div className="page-actions">
          {!showForm && (
            <button className="btn btn-primary" onClick={openForm}>
              <UserPlus size={16} /> ADD SYSTEM USER
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {showForm && (
        <div
          className="staff-registration"
          style={{
            padding: 0,
            marginBottom: "25px",
            background: "white",
            borderRadius: "12px",
            boxShadow: "var(--neu-shadow-raised)",
            minHeight: "unset",
          }}
        >
          <div className="section" style={{ padding: "25px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px", alignItems: "center" }}>
              <h3 className="section-title">CREATE NEW USER ACCOUNT</h3>
              <button className="btn-icon-primary" onClick={() => setShowForm(false)} style={{ border: "none", background: "transparent" }}>
                <X size={20} />
              </button>
            </div>

            {/* HRMIS Lookup */}
            <div style={{ background: "linear-gradient(135deg, #f0f4ff 0%, #e8eeff 100%)", border: "1.5px solid #c5d0f5", borderRadius: "10px", padding: "18px 20px", marginBottom: "25px" }}>
              <p style={{ margin: "0 0 12px", fontWeight: 500, fontSize: "12px", color: "#1c236d", letterSpacing: "0.5px" }}>
                🔍 SEARCH FROM HRMIS BY CHECK NUMBER
              </p>
              <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 220px" }}>
                  <input
                    className="form-control"
                    placeholder="Enter Check Number (e.g. 123456789)"
                    value={checkno}
                    onChange={(e) => { setCheckno(e.target.value); setLookupErr(""); setLookupSuccess(false); }}
                    onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                    style={{ marginBottom: 0 }}
                  />
                </div>
                <button
                  className="btn btn-primary"
                  style={{ whiteSpace: "nowrap", minWidth: "150px", display: "flex", alignItems: "center", gap: "8px" }}
                  onClick={handleLookup}
                  disabled={lookupLoading}
                >
                  {lookupLoading ? <><Loader size={15} className="spin-icon" /> Searching...</> : <><span>🔄</span> SEARCH</>}
                </button>
              </div>
              {lookupErr && (
                <div style={{ display: "flex", alignItems: "center", gap: "7px", marginTop: "10px", color: "#c0392b", fontSize: "13px", fontWeight: 500 }}>
                  <AlertCircle size={15} /> {lookupErr}
                </div>
              )}
              {lookupSuccess && (
                <div style={{ display: "flex", alignItems: "center", gap: "7px", marginTop: "10px", color: "#27ae60", fontSize: "13px", fontWeight: 500 }}>
                  <CheckCircle size={15} /> Information found from HRMIS. Please review and click CREATE ACCOUNT.
                </div>
              )}
            </div>

            {formErr && <div className="alert alert-error">{formErr}</div>}

            <div className="row two-columns">
              <div className="form-group">
                <label className="required">FIRST NAME</label>
                <input className="form-control" value={form.first_name} onChange={(e) => setField("first_name", e.target.value)} />
              </div>
              <div className="form-group">
                <label>LAST NAME</label>
                <input className="form-control" value={form.last_name} onChange={(e) => setField("last_name", e.target.value)} />
              </div>
            </div>

            <div className="row two-columns">
              <div className="form-group">
                <label className="required">EMAIL ADDRESS</label>
                <input type="email" className="form-control" value={form.email} onChange={(e) => setField("email", e.target.value)} />
              </div>
              <div className="form-group">
                <label className="required">PASSWORD</label>
                <input type="password" className="form-control" value={form.password} onChange={(e) => setField("password", e.target.value)} />
                <small style={{ color: "#888", fontSize: "11px" }}>Default: !@#$1234</small>
              </div>
            </div>

            <div className="row three-columns">
              <div className="form-group">
                <label>SYSTEM ROLE</label>
                <div className="select-wrapper">
                  <select className="form-control" value={form.role} onChange={(e) => setField("role", e.target.value)}>
                    <option value="">-- Select Role --</option>
                    {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                  <ChevronDown size={14} className="select-arrow" />
                </div>
              </div>
              <div className="form-group">
                <label>RANK</label>
                <div className="select-wrapper">
                  <select className="form-control" value={form.rank} onChange={(e) => setField("rank", e.target.value)}>
                    <option value="">-- Select Rank --</option>
                    {RANKS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                  <ChevronDown size={14} className="select-arrow" />
                </div>
              </div>
              <div className="form-group">
                <label>FORCE NUMBER</label>
                <input className="form-control" value={form.force_number} onChange={(e) => setField("force_number", e.target.value)} placeholder="TPF/..." />
              </div>
            </div>

            <div className="row three-columns">
              <div className="form-group">
                <label>UNIT</label>
                <input className="form-control" value={form.unit} onChange={(e) => setField("unit", e.target.value)} />
              </div>
              <div className="form-group">
                <label>STATION</label>
                <input className="form-control" value={form.station} onChange={(e) => setField("station", e.target.value)} />
              </div>
              <div className="form-group">
                <label>PHONE</label>
                <input className="form-control" value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
              </div>
            </div>

            <div style={{ marginTop: "30px", display: "flex", gap: "15px", justifyContent: "center" }}>
              <button className="btn btn-primary" style={{ flex: "0 1 300px" }} onClick={handleCreate} disabled={saving}>
                {saving ? <><Loader size={16} className="spin-icon" /> Inahifadhi...</> : <><UserCheck size={18} style={{ marginRight: "8px" }} /> CREATE ACCOUNT</>}
              </button>
              <button className="btn btn-outline" style={{ flex: "0 1 150px" }} onClick={() => setShowForm(false)}>CANCEL</button>
            </div>
          </div>
        </div>
      )}

      {/* Role Change Modal */}
      {showRoleModal && selectedUser && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}>
          <div style={{
            background: "white",
            borderRadius: "12px",
            padding: "30px",
            maxWidth: "450px",
            width: "90%",
            boxShadow: "0 10px 40px rgba(0, 0, 0, 0.2)",
          }}>
            <div style={{ marginBottom: "24px" }}>
              <h2 style={{ margin: "0 0 8px 0", color: "#1c236d", fontSize: "20px" }}>Change User Role?</h2>
              <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>
                for <strong>{selectedUser.full_name || `${selectedUser.first_name} ${selectedUser.last_name}`}</strong>
              </p>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <p style={{ margin: "0 0 8px 0", fontSize: "13px", color: "#666" }}>
                Current role: <strong>{getRoleLabel(selectedUser.role)}</strong>
              </p>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", fontWeight: 500, color: "#333" }}>
                Select new role:
              </label>
              <div className="select-wrapper" style={{ position: "relative" }}>
                <select
                  className="form-control"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  style={{ paddingRight: "32px" }}
                >
                  <option value="">-- Select Role --</option>
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="select-arrow" />
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button
                className="btn btn-outline"
                onClick={() => setShowRoleModal(false)}
                disabled={roleChangeSaving}
                style={{ minWidth: "120px" }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleChangeRole}
                disabled={roleChangeSaving}
                style={{ minWidth: "120px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
              >
                {roleChangeSaving ? (
                  <>
                    <Loader size={15} className="spin-icon" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Shield size={16} />
                    Change Role
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="filters-card">
        <div className="filters-row">
          <div className="filter-group" style={{ gridColumn: "span 4" }}>
            <label>SEARCH (Name, Email, Force Number, Unit, Station)</label>
            <div style={{ position: "relative" }}>
              <input
                className="form-control"
                placeholder="Enter name, email, or force number..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                style={{ paddingRight: search ? "36px" : undefined }}
              />
              {search && (
                <button onClick={() => handleSearchChange("")} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#999", fontSize: "18px", lineHeight: 1 }} title="Clear search">✕</button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="results-card">
        <div className="table-container">
          <table className="staff-table">
            <thead>
              <tr>
                <th style={{ width: "50px", textAlign: "right" }}>#</th>
                <th>FULL NAME</th>
                <th>EMAIL</th>
                <th>FORCE NO.</th>
                <th>RANK / ROLE</th>
                <th>UNIT / STATION</th>
                <th style={{ textAlign: "center" }}>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="no-hover">
                  <td colSpan={8} style={{ textAlign: "center", padding: "60px" }}>
                    <div className="loading-state">
                      <div className="spinner"></div>
                      <p>Loading users...</p>
                    </div>
                  </td>
                </tr>
              ) : displayedUsers.length === 0 ? (
                <tr className="no-hover">
                  <td colSpan={8} style={{ textAlign: "center", padding: "60px" }}>
                    <div className="no-data">
                      <div className="no-data-content">
                        <Users size={48} />
                        <p>Hakuna mtumiaji aliyepatikana.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                displayedUsers.map((u, i) => {
                  const isSyncing  = syncingId  === u.id;
                  const isToggling = togglingId === u.id;
                  return (
                    <tr key={u.id} style={{ opacity: isToggling ? 0.6 : 1, transition: "opacity 0.2s" }}>
                      <td style={{ textAlign: "right", opacity: 0.5, fontWeight: "normal", whiteSpace: "nowrap", paddingRight: "8px" }}>
                        {(page - 1) * PAGE_SIZE + i + 1}.
                      </td>
                      <td style={{ fontWeight: 500, color: "#1c236d", whiteSpace: "nowrap" }}>
                        {u.full_name || `${u.first_name} ${u.last_name}`}
                      </td>
                      <td style={{ fontSize: "13px" }}>{u.email}</td>
                      <td style={{ fontWeight: 500 }}>{u.force_number || "—"}</td>
                      <td>
                        <div className="staff-info">
                          <strong>{getRankLabel(u.rank)}</strong>
                          <small>{getRoleLabel(u.role)}</small>
                        </div>
                      </td>
                      <td>
                        <div className="staff-info">
                          <strong>{u.unit || "—"}</strong>
                          <small>{u.station || "No Station"}</small>
                        </div>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span className={`badge ${u.is_active ? "badge-success" : "badge-danger"}`}>
                          {u.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                          {/* Change Role */}
                          <FaPencilAlt
                            size={13}
                            title="Change user role"
                            onClick={() => openRoleModal(u)}
                            style={{
                              cursor: "pointer",
                              color: "#1c236d",
                              opacity: 0.6,
                              flexShrink: 0,
                            }}
                          />
                          {/* Sync */}
                          <RefreshCw
                            size={15}
                            title={isSyncing ? "Syncing..." : "Sync from HRMIS"}
                            onClick={() => !isSyncing && handleSyncHRMIS(u.id)}
                            style={{
                              cursor: isSyncing ? "not-allowed" : "pointer",
                              color: "#1c236d",
                              opacity: isSyncing ? 1 : 0.6,
                              animation: isSyncing ? "spin 1s linear infinite" : "none",
                              flexShrink: 0,
                            }}
                          />
                          {/* Deactivate / Activate */}
                          {isToggling ? (
                            <Loader
                              size={15}
                              style={{ animation: "spin 1s linear infinite", color: u.is_active ? "#dc2626" : "#16a34a", flexShrink: 0 }}
                            />
                          ) : u.is_active ? (
                            <UserX
                              size={15}
                              title="Deactivate account"
                              onClick={() => handleToggleActive(u)}
                              style={{ cursor: "pointer", color: "#dc2626", opacity: 0.7, flexShrink: 0 }}
                            />
                          ) : (
                            <UserCheck2
                              size={15}
                              title="Activate account"
                              onClick={() => handleToggleActive(u)}
                              style={{ cursor: "pointer", color: "#16a34a", opacity: 0.7, flexShrink: 0 }}
                            />
                          )}
                          {/* View profile */}
                          <FaEye
                            title="View Profile"
                            style={{ cursor: "pointer", color: "#1c236d", opacity: 0.6 }}
                            onClick={() => navigate(`/users/${u.id}`)}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="hrmis-pagination">
          <div className="hrmis-pagination-info">
            {loading
              ? "Loading..."
              : `Showing ${total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total} records`}
          </div>
          <div className="hrmis-pagination-controls">
            <button className="hrmis-page-btn" disabled={page === 1 || loading} onClick={() => { setPage(1); window.scrollTo(0, 0); }}>«</button>
            <button className="hrmis-page-btn" disabled={page === 1 || loading} onClick={() => { setPage((p) => p - 1); window.scrollTo(0, 0); }}>‹ Prev</button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) pageNum = i + 1;
              else if (page <= 3) pageNum = i + 1;
              else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
              else pageNum = page - 2 + i;
              return (
                <button key={pageNum} className={`hrmis-page-btn ${page === pageNum ? "active" : ""}`} onClick={() => { setPage(pageNum); window.scrollTo(0, 0); }}>
                  {pageNum}
                </button>
              );
            })}
            <button className="hrmis-page-btn" disabled={page === totalPages || totalPages === 0 || loading} onClick={() => { setPage((p) => p + 1); window.scrollTo(0, 0); }}>Next ›</button>
            <button className="hrmis-page-btn" disabled={page === totalPages || totalPages === 0 || loading} onClick={() => { setPage(totalPages); window.scrollTo(0, 0); }}>»</button>
          </div>
        </div>
      </div>

      <style>{`
        .spin-icon { animation: spin 1s linear infinite; display: inline-block; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spinner {
          width: 36px; height: 36px;
          border: 3px solid rgba(28, 35, 109, 0.15);
          border-top-color: #1c236d;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 12px;
        }
      `}</style>
    </div>
  );
}