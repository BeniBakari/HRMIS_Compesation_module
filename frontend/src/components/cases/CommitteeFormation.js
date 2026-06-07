import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { casesApi, authApi } from "../../services/api";
import {
  Users,
  Trash2,
  Calendar,
  ShieldCheck,
  Loader2,
  UserPlus,
  Info,
  X,
  Check,
  ChevronDown,
  User,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import "../../pages/CaseDetail.css";

// ─── Role definitions with HRMIS designation validators ───────────────────────
const MEMBER_ROLES = [
  {
    value: "RPC",
    label: "Regional Police Commander (RPC)",
    hint: "Must be an RPC from the incident region",
    validate: (hrmis, caseRegion) => {
      const designation = (
        hrmis.info.jobs ||
        hrmis.info.rank ||
        ""
      ).toUpperCase();
      const region = (
        hrmis.info.commands ||
        hrmis.info.stations ||
        ""
      ).toUpperCase();
      const isRPC =
        designation.includes("RPC") ||
        designation.includes("REGIONAL POLICE COMMANDER");
      const inRegion = !caseRegion || region.includes(caseRegion.toUpperCase());
      if (!isRPC) return "This officer is not designated as RPC in HRMIS.";
      if (!inRegion)
        return `This RPC is not from the incident region (${caseRegion}).`;
      return null;
    },
  },
  {
    value: "OCD",
    label: "District Personnel Officer (OCD)",
    hint: "Must be a OCD from the incident region",
    validate: () => null,
  },
  {
    value: "REGISTERED_DOCTOR",
    label: "Certified Medical Officer",
    hint: "Any officer can be assigned as doctor/medical officer in HRMIS",
    validate: () => null,
  },
  {
    value: "HQ_REPRESENTATIVE",
    label: "HQ Representative",
    hint: "Any officer can be assigned as HQ Representative",
    validate: () => null,
  },
];

const EMPTY_MEMBER = {
  check_number: "",
  user_id: null,
  force_number: "",
  full_name: "",
  rank: "",
  designation: "",
  region: "",
  role: "",
  loading: false,
  validated: false,
  validationError: null,
};

// ─── Read-only committee view ─────────────────────────────────────────────────
function CommitteeReadOnlyView({ committeeData }) {
  if (!committeeData) {
    return (
      <div className="tab-content" style={{ animation: "fadeIn 0.4s" }}>
        <div
          style={{
            padding: "60px 40px",
            textAlign: "center",
            background: "#f8fafc",
            borderRadius: "20px",
            border: "1px dashed #cbd5e1",
          }}
        >
          <Users size={48} color="#cbd5e1" style={{ marginBottom: "16px" }} />
          <p
            style={{
              color: "#94a3b8",
              fontStyle: "italic",
              fontSize: "14px",
              margin: 0,
            }}
          >
            Committee data could not be loaded.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        animation: "fadeIn 0.4s",
      }}
    >
      {/* ── Status banner ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          padding: "18px 24px",
          background: "#f0fdf4",
          borderRadius: "16px",
          border: "1px solid #bbf7d0",
        }}
      >
        <div
          style={{
            width: "44px",
            height: "44px",
            background: "#dcfce7",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <ShieldCheck size={22} color="#166534" />
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontWeight: 500,
              color: "#166534",
              fontSize: "14px",
              letterSpacing: "0.5px",
            }}
          >
            COMMITTEE CONSTITUTED & DISPATCHED
          </div>
          {committeeData.meeting_date && (
            <div
              style={{
                fontSize: "12px",
                color: "#4ade80",
                marginTop: "2px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Calendar size={12} /> Assessment session:{" "}
              {committeeData.meeting_date}
            </div>
          )}
        </div>
        <div
          style={{
            background: "#166534",
            color: "white",
            padding: "6px 16px",
            borderRadius: "20px",
            fontSize: "11px",
            fontWeight: 500,
            letterSpacing: "1px",
          }}
        >
          {committeeData.members?.length || 0} MEMBERS
        </div>
      </div>

      {/* ── Members list ── */}
      <div className="info-section">
        <h3 style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Users size={18} /> COMMITTEE MEMBERS
        </h3>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            marginTop: "15px",
          }}
        >
          {committeeData.members?.map((m, i) => {
            const roleDef = MEMBER_ROLES.find((r) => r.value === m.role);
            return (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "44px 1fr auto auto",
                  alignItems: "center",
                  gap: "20px",
                  padding: "18px 24px",
                  background: "white",
                  border: "1px solid #e2e8f0",
                  borderRadius: "16px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                  transition: "box-shadow 0.2s",
                }}
              >
                {/* Index bubble */}
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    background: "rgba(28,35,109,0.06)",
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 500,
                    color: "#1c236d",
                    fontSize: "16px",
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </div>

                {/* Identity */}
                <div>
                  <div
                    style={{
                      fontWeight: 500,
                      color: "#1c236d",
                      fontSize: "14px",
                    }}
                  >
                    {m.full_name || m.force_number || "—"}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#64748b",
                      marginTop: "3px",
                      display: "flex",
                      gap: "10px",
                      flexWrap: "wrap",
                    }}
                  >
                    {m.rank && <span>{m.rank}</span>}
                    {m.force_number && (
                      <span style={{ opacity: 0.6 }}>
                        · Force No: {m.force_number}
                      </span>
                    )}
                  </div>
                  {m.region && (
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#94a3b8",
                        marginTop: "3px",
                      }}
                    >
                      📍 {m.region}
                    </div>
                  )}
                </div>

                {/* Role badge */}
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "#eff6ff",
                    color: "#1d4ed8",
                    padding: "6px 16px",
                    borderRadius: "20px",
                    fontSize: "11px",
                    fontWeight: 500,
                    letterSpacing: "0.5px",
                    whiteSpace: "nowrap",
                  }}
                >
                  <ShieldCheck size={12} />
                  {roleDef?.label || m.role}
                </div>

                {/* Verified tick */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    color: "#166534",
                    fontSize: "11px",
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                  }}
                >
                  <CheckCircle size={16} color="#166534" /> VERIFIED
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Instructions / Notes ── */}
      {committeeData.notes && (
        <div className="info-section">
          <h3 style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Info size={16} /> INSTRUCTIONS TO COMMITTEE
          </h3>
          <p
            style={{
              fontSize: "14px",
              color: "#1c236d",
              lineHeight: "1.8",
              padding: "18px 20px",
              background: "#f8fafc",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              whiteSpace: "pre-wrap",
              margin: 0,
            }}
          >
            {committeeData.notes}
          </p>
        </div>
      )}

      {/* ── Read-only notice ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "14px 20px",
          background: "#fefce8",
          border: "1px solid #fde68a",
          borderRadius: "12px",
          fontSize: "12px",
          color: "#92400e",
        }}
      >
        <AlertTriangle size={16} style={{ flexShrink: 0 }} />
        This committee has been formally constituted. No further changes can be
        made.
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function CommitteeFormation({
  caseId,
  caseRegion,
  onComplete,
  readOnly,
  committeeData,
}) {
  // ── If read-only, just render the view ──────────────────────────────────────
  if (readOnly) {
    return <CommitteeReadOnlyView committeeData={committeeData} />;
  }

  // ── Formation form (existing logic, unchanged) ───────────────────────────────
  return (
    <CommitteeFormationForm
      caseId={caseId}
      caseRegion={caseRegion}
      onComplete={onComplete}
    />
  );
}

// ─── Separated form component to avoid hook-in-conditional issues ─────────────
function CommitteeFormationForm({ caseId, caseRegion, onComplete }) {
  const [members, setMembers] = useState([{ ...EMPTY_MEMBER }]);
  const [meetingDate, setMeetingDate] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [signature, setSignature] = useState("");
  const { user } = useAuth();
  const [showSignature, setShowSignature] = useState(false);

  const updateMember = (idx, fields) => {
    setMembers((ms) => ms.map((m, i) => (i === idx ? { ...m, ...fields } : m)));
  };

  // ─── Lookup from HRMIS then validate against selected role ────────────────
  const handleHrmisLookup = async (idx, checkNumber) => {
    const member = members[idx];
    if (!checkNumber.trim()) return;

    updateMember(idx, {
      loading: true,
      validated: false,
      validationError: null,
    });
    setError("");

    try {
      const hrmis = await authApi.lookupCommitteeMember(checkNumber.trim());
      const force_number = hrmis.info.force_number || "";
      const full_name =
        `${hrmis.info.fname} ${hrmis.info.mname || ""} ${hrmis.info.lname}`.trim();
      const rank = hrmis.info.rank || hrmis.info.designation || "";
      const designation = hrmis.info.designation || "";
      const hrmisRegion = hrmis.info.commands || hrmis.info.stations || "";

      let user_id = null;
      try {
        const dbUser = await authApi.lookupUserByForceNumber(force_number);
        user_id = dbUser?.user_id || null;
      } catch {
        user_id = `HRMIS_${force_number}`;
      }

      let validationError = null;
      if (member.role) {
        const roleDef = MEMBER_ROLES.find((r) => r.value === member.role);
        validationError = roleDef?.validate(hrmis, caseRegion) ?? null;
      }

      updateMember(idx, {
        user_id,
        force_number,
        full_name,
        rank,
        designation,
        region: hrmisRegion,
        loading: false,
        validated: !validationError,
        validationError,
        _hrmisData: hrmis,
      });
    } catch (err) {
      updateMember(idx, {
        loading: false,
        validated: false,
        validationError: "Staff record not found in HRMIS registry.",
      });
    }
  };

  // ─── Re-validate when role changes (if person already looked up) ──────────
  const handleRoleChange = (idx, role) => {
    const member = members[idx];
    if (member._hrmisData) {
      const roleDef = MEMBER_ROLES.find((r) => r.value === role);
      const validationError =
        roleDef?.validate(member._hrmisData, caseRegion) ?? null;
      updateMember(idx, { role, validated: !validationError, validationError });
    } else {
      updateMember(idx, { role });
    }
  };

  // ─── Parse API error response into a readable string ─────────────────────
  const parseApiError = (err) => {
    if (!err?.response?.data) {
      return typeof err?.message === "string"
        ? err.message
        : "An unexpected error occurred. Please try again.";
    }
    const d = err.response.data;

    if (typeof d.message === "string") return d.message;
    if (typeof d.error === "string") return d.error;

    if (Array.isArray(d.detail)) {
      return d.detail
        .map((e) => `${e.loc?.slice(-1)?.[0] ?? "field"}: ${e.msg}`)
        .join(" | ");
    }
    if (typeof d.detail === "string") return d.detail;

    if (typeof d === "object") {
      return Object.entries(d)
        .map(([key, val]) => {
          if (Array.isArray(val)) {
            return `${key}: ${val
              .map((v) => {
                if (typeof v === "string") return v;
                if (typeof v === "object" && v !== null) {
                  // e.g. { user_id: ["This field is required."] }
                  return Object.entries(v)
                    .map(
                      ([k2, v2]) =>
                        `${k2}: ${Array.isArray(v2) ? v2.join(", ") : v2}`,
                    )
                    .join("; ");
                }
                return JSON.stringify(v);
              })
              .join(" | ")}`;
          }
          return `${key}: ${val}`;
        })
        .join(" | ");
    }

    if (typeof d === "string") return d;
    return JSON.stringify(d, null, 2);
  };

  const handleSubmit = async () => {
    const validMembers = members.filter(
      (m) => m.force_number && m.role && m.validated,
    );

    if (validMembers.length < 4) {
      return setError(
        "All 4 committee members must be verified with valid roles.",
      );
    }

    const roles = validMembers.map((m) => m.role);
    if (new Set(roles).size !== roles.length) {
      return setError(
        "Each committee role must be assigned to a different person.",
      );
    }
    if (!meetingDate || !signature.trim()) {
      return setError(
        "Please specify a meeting date and provide your authorization signature.",
      );
    }

    setLoading(true);
    setError("");

    try {
      const resolvedMembers = [];
      const failedMembers = [];

      // ==============================
      // PROCESS MEMBERS SAFELY
      // ==============================
      for (const m of validMembers) {
        const force_number = String(m.force_number).trim();
        const full_name = (m.full_name || "").trim();

        try {
          let user_id = m.user_id || null;

          // --------------------------
          // 1. Already valid DB user
          // --------------------------
          if (user_id && !String(user_id).startsWith("HRMIS_")) {
            resolvedMembers.push({ ...m, user_id });
            continue;
          }

          // --------------------------
          // 2. Try lookup existing user
          // --------------------------
          let existingUser = null;

          try {
            existingUser = await authApi.lookupUserByForceNumber(force_number);
          } catch (_) {
            existingUser = null;
          }

          if (existingUser?.user_id) {
            resolvedMembers.push({ ...m, user_id: existingUser.user_id });
            continue;
          }

          // --------------------------
          // 3. Create user safely
          // --------------------------
          const nameParts = full_name.split(/\s+/);
          const first_name = nameParts[0] || force_number;
          const last_name = nameParts.slice(2).join(" ") || nameParts[1] || "-";

          // const email =
          //   `${force_number.toLowerCase().replace(/[^a-z0-9]/g, '.') }@tpf.go.tz`;

          const newUser = await authApi.createUserAsAdmin({
            force_number,
            first_name,
            middle_name: nameParts[1] || "",
            last_name: nameParts.slice(2).join(" ") || nameParts[1] || "-",
            email: m._hrmisData?.info?.email,
            rank: m.rank || "PC",
            role: "COMMITTEE_MEMBER",
            unit: m._hrmisData?.info?.department || "",
            station: m._hrmisData?.info?.stations || "",
            phone: m._hrmisData?.info?.phoneno || "",
            check_number: m.check_number || "",
            nin: m._hrmisData?.info?.nin || "",
            profile_photo: m._hrmisData?.info?.photo || "",
            signature: m._hrmisData?.info?.signature || "",
            password: "!@#$1234",
            confirm_password: "!@#$1234",
          });

          if (!newUser?.user_id) {
            throw new Error("Invalid user creation response");
          }

          resolvedMembers.push({
            ...m,
            user_id: newUser.user_id,
          });
        } catch (err) {
          console.error("❌ Member failed:", {
            name: full_name,
            force_number,
            error: err?.response?.data || err.message,
          });

          failedMembers.push({
            name: full_name,
            force_number,
            reason:
              err?.response?.data?.error ||
              err?.response?.data?.message ||
              err?.message ||
              "Unknown error",
          });
        }
      }

      // ==============================
      // FINAL VALIDATION
      // ==============================
      if (resolvedMembers.length < 4) {
        console.error("FAILED MEMBERS:", failedMembers);

        return setError(
          `Committee incomplete. Failed members: ` +
            failedMembers
              .map((f) => `${f.name} (${f.force_number}) - ${f.reason}`)
              .join(", "),
        );
      }

      // ==============================
      // PAYLOAD
      // ==============================
      const memberPayload = resolvedMembers.map((m) => ({
        force_number: String(m.force_number),
        role: String(m.role),
        user_id: m.user_id,
      }));

      // ==============================
      // SUBMIT
      // ==============================
      await casesApi.formCommittee(caseId, {
        members: memberPayload,
        meeting_date: meetingDate,
        notes,
        digital_signature: signature,
      });

      if (onComplete) onComplete();
      else window.location.reload();
    } catch (err) {
      console.error("formCommittee error:", err?.response?.data || err.message);
      setError(parseApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const verifiedCount = members.filter((m) => m.validated).length;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "25px",
        animation: "fadeIn 0.4s",
      }}
    >
      {error && (
        <div
          className="alert alert-error"
          style={{ display: "flex", alignItems: "center", gap: "10px" }}
        >
          <Info size={18} /> {error}
        </div>
      )}

      {/* ── Progress indicator ── */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          padding: "15px 20px",
          background: "#f8fafc",
          borderRadius: "14px",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", gap: "6px" }}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                width: "32px",
                height: "6px",
                borderRadius: "3px",
                background: i < verifiedCount ? "#166534" : "#e2e8f0",
                transition: "background 0.3s",
              }}
            />
          ))}
        </div>
        <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 500 }}>
          {verifiedCount}/4 MEMBERS VERIFIED
          {caseRegion && (
            <span style={{ color: "#1c236d", marginLeft: "10px" }}>
              · REGION: {caseRegion.toUpperCase()}
            </span>
          )}
        </span>
      </div>

      <div className="info-section">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "25px",
          }}
        >
          <h3>
            <Users size={18} style={{ marginRight: "10px" }} /> COMMITTEE
            COMPOSITION
          </h3>
          {members.length < 4 && (
            <button
              className="btn btn-xs btn-outline-primary"
              style={{ display: "flex", gap: "8px", padding: "10px 18px" }}
              onClick={() => setMembers((m) => [...m, { ...EMPTY_MEMBER }])}
            >
              <UserPlus size={14} /> ADD MEMBER
            </button>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          {members.map((member, idx) => {
            const selectedRoleDef = MEMBER_ROLES.find(
              (r) => r.value === member.role,
            );
            return (
              <div
                key={idx}
                style={{
                  padding: "20px 25px",
                  background: "white",
                  borderRadius: "18px",
                  border: `1px solid ${
                    member.validationError
                      ? "#fecaca"
                      : member.validated
                        ? "#bbf7d0"
                        : "#e2e8f0"
                  }`,
                  boxShadow: "0 4px 10px rgba(0,0,0,0.02)",
                  transition: "all 0.3s",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "min-content 1.5fr 1fr min-content",
                    gap: "20px",
                    alignItems: "start",
                  }}
                >
                  {/* Check Number */}
                  <div>
                    <div
                      style={{
                        fontSize: "11px",
                        fontWeight: 500,
                        color: "#94a3b8",
                        marginBottom: "5px",
                      }}
                    >
                      CHECK NO.
                    </div>
                    <input
                      className="form-control"
                      style={{ width: "100px", textAlign: "center" }}
                      value={member.check_number}
                      onChange={(e) =>
                        updateMember(idx, {
                          check_number: e.target.value,
                          validated: false,
                          validationError: null,
                        })
                      }
                      onBlur={(e) => handleHrmisLookup(idx, e.target.value)}
                      placeholder="00000"
                    />
                  </div>

                  {/* Identity */}
                  <div>
                    <div
                      style={{
                        fontSize: "11px",
                        fontWeight: 500,
                        color: "#94a3b8",
                        marginBottom: "5px",
                      }}
                    >
                      VERIFIED IDENTITY
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        background: member.validationError
                          ? "#fff5f5"
                          : "#f8fafc",
                        padding: "10px 15px",
                        borderRadius: "10px",
                        minHeight: "44px",
                      }}
                    >
                      {member.loading ? (
                        <Loader2 size={16} className="spinner" />
                      ) : (
                        <>
                          <div
                            style={{
                              background: member.validated
                                ? "#dcfce7"
                                : member.validationError
                                  ? "#fee2e2"
                                  : "#f1f5f9",
                              width: "28px",
                              height: "28px",
                              borderRadius: "50%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            {member.validated ? (
                              <Check size={14} color="#166534" />
                            ) : member.validationError ? (
                              <X size={14} color="#dc2626" />
                            ) : (
                              <User size={14} color="#94a3b8" />
                            )}
                          </div>
                          <div>
                            <div style={{ fontSize: "13px", fontWeight: 500 }}>
                              {member.full_name ||
                                "Enter check number to lookup..."}
                            </div>
                            {member.rank && (
                              <div
                                style={{ fontSize: "10px", color: "#64748b" }}
                              >
                                {member.rank}
                              </div>
                            )}
                            {member.region && (
                              <div
                                style={{ fontSize: "10px", color: "#94a3b8" }}
                              >
                                📍 {member.region}
                              </div>
                            )}
                            {member.validationError && (
                              <div
                                style={{
                                  fontSize: "11px",
                                  color: "#dc2626",
                                  marginTop: "3px",
                                  fontWeight: 500,
                                }}
                              >
                                ⚠ {member.validationError}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Role */}
                  <div>
                    <div
                      style={{
                        fontSize: "11px",
                        fontWeight: 500,
                        color: "#94a3b8",
                        marginBottom: "5px",
                      }}
                    >
                      DESIGNATED ROLE
                    </div>
                    <div className="select-wrapper">
                      <select
                        className="form-control"
                        value={member.role}
                        onChange={(e) => handleRoleChange(idx, e.target.value)}
                      >
                        <option value="">Choose Role</option>
                        {MEMBER_ROLES.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="select-arrow" />
                    </div>
                    {selectedRoleDef && (
                      <div
                        style={{
                          fontSize: "10px",
                          color: "#64748b",
                          marginTop: "5px",
                          fontStyle: "italic",
                        }}
                      >
                        {selectedRoleDef.hint}
                      </div>
                    )}
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() =>
                      setMembers((m) => m.filter((_, i) => i !== idx))
                    }
                    style={{
                      width: "40px",
                      height: "40px",
                      background: "#fee2e2",
                      border: "none",
                      color: "#dc2626",
                      borderRadius: "10px",
                      cursor: "pointer",
                      display: idx === 0 ? "none" : "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginTop: "22px",
                    }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Schedule & Authorization */}
      <div className="results-card" style={{ padding: "30px" }}>
        <h3 className="section-title" style={{ marginBottom: "25px" }}>
          <Calendar size={18} style={{ marginRight: "10px" }} /> SCHEDULE &
          AUTHORIZATION
        </h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.5fr",
            gap: "20px",
          }}
        >
          <div className="form-group">
            <label className="required">ASSESSMENT SESSION DATE</label>
            <input
              type="date"
              className="form-control"
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>INSTRUCTIONS FOR MEMBERS</label>
            <textarea
              className="form-control"
              placeholder="Write instructions or brief for the committee members..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              style={{ resize: "vertical", lineHeight: "1.6" }}
            />
          </div>
        </div>

        <div
          className="form-group"
          style={{
            marginTop: "20px",
            padding: "25px",
            background: "#f8fafc",
            borderRadius: "18px",
            border: "1px dashed #cbd5e1",
          }}
        >
          <label
            className="required"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "#1c236d",
              fontWeight: 500,
              marginBottom: "15px",
            }}
          >
            <ShieldCheck size={16} /> AUTHORIZE WITH YOUR SIGNATURE
          </label>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "15px",
              background: "white",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
            }}
          >
            {user.signature && (
              <img
                src={`data:image/png;base64,${user.signature}`}
                alt="Your Signature"
                style={{
                  width: "120px",
                  height: "60px",
                  objectFit: "cover",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                }}
              />
            )}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                type="checkbox"
                id="signature-checkbox"
                checked={showSignature}
                onChange={(e) => {
                  setShowSignature(e.target.checked);
                  if (e.target.checked) {
                    setSignature(user.signature || "");
                  } else {
                    setSignature("");
                  }
                }}
                style={{
                  width: "18px",
                  height: "18px",
                  cursor: "pointer",
                }}
              />
              <label
                htmlFor="signature-checkbox"
                style={{
                  fontSize: "13px",
                  color: "#1c236d",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                I authorize this committee formation with my digital signature
              </label>
            </div>
          </div>

          {showSignature && signature && (
            <div
              style={{
                marginTop: "12px",
                padding: "10px 15px",
                background: "#f0fdf4",
                borderRadius: "8px",
                border: "1px solid #bbf7d0",
                fontSize: "12px",
                color: "#166534",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Check size={14} /> Signature authorized
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            gap: "20px",
            marginTop: "30px",
            alignItems: "center",
          }}
        >
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={loading || verifiedCount < 4}
            style={{
              flex: 1,
              padding: "18px",
              borderRadius: "15px",
              opacity: verifiedCount < 4 ? 0.6 : 1,
            }}
          >
            {loading ? (
              <Loader2 size={18} className="spinner" />
            ) : (
              <Users size={18} />
            )}{" "}
            CONSTITUTE & DISPATCH COMMITTEE
          </button>
          <div
            style={{
              flex: 1,
              color: "#64748b",
              fontSize: "11px",
              display: "flex",
              gap: "10px",
            }}
          >
            <Info size={18} style={{ flexShrink: 0 }} />
            Members will receive automated system notifications. This action
            creates a legally binding assessment record.
          </div>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .spinner { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `,
        }}
      />
    </div>
  );
}