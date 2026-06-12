import { useState, useEffect, useRef } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { casesApi, BASE_URL } from "../services/api";
import { usePermissions } from "../hooks/usePermissions";
import HQValidation from "../components/cases/HQValidation";
import CommitteeFormation from "../components/cases/CommitteeFormation";
import AssessmentInput from "../components/cases/AssessmentInput";
import {
  FileText,
  Clock,
  RefreshCw,
  CheckCircle2,
  Shield,
  ClipboardList,
  XCircle,
  AlertTriangle,
  Info,
  CheckCircle,
  Navigation,
  MapPin,
  Calendar,
  User,
  Paperclip,
  Eye,
  History,
  ShieldCheck,
  Users,
  Calculator,
  Receipt,
  Edit3,
  X,
  Download,
  TrendingUp,
  DollarSign,
  FileUp,
  Upload,
  Loader2,
  ChevronLeft,
  ChevronRight,
  BarChart2,
  Star,
  Activity,
  Award,
  MessageSquare,
} from "lucide-react";
import "./CaseDetail.css";

const STATUS_META = {
  SUBMITTED: {
    label: "Submitted",
    badgeClass: "status-navy",
    icon: <Clock size={14} />,
  },
  UNDER_REVIEW: {
    label: "Under Review",
    badgeClass: "status-navy",
    icon: <RefreshCw size={14} />,
  },
  VERIFIED: {
    label: "Verified",
    badgeClass: "status-navy",
    icon: <CheckCircle2 size={14} />,
  },
  COMMITTEE_ASSIGNED: {
    label: "Committee Assigned",
    badgeClass: "status-navy",
    icon: <Shield size={14} />,
  },
  ASSESSED: {
    label: "Assessed",
    badgeClass: "status-navy",
    icon: <ClipboardList size={14} />,
  },
  PAID: {
    label: "Paid",
    badgeClass: "status-navy",
    icon: <CheckCircle size={14} />,
  },
  REJECTED: {
    label: "Rejected",
    badgeClass: "status-navy",
    icon: <XCircle size={14} />,
  },
  RETURNED: {
    label: "Returned",
    badgeClass: "status-navy",
    icon: <AlertTriangle size={14} />,
  },
};

const DOCUMENT_LABELS = {
  MEDICAL_REPORT: "Medical Report",
  OB_EXTRACT: "Police / OB Report",
  DEATH_CERTIFICATE: "Death Certificate",
  NATIONAL_ID: "National ID / Force ID",
  PF3: "Commanding Officer Letter",
};

const MAX_AWARD = 15_000_000;
const SEV_BANDS = [
  {
    min: 0,
    max: 20,
    label: "MINOR",
    color: "#1c236d",
    bg: "rgba(28, 35, 109, 0.05)",
  },
  {
    min: 21,
    max: 40,
    label: "MODERATE",
    color: "#1c236d",
    bg: "rgba(28, 35, 109, 0.1)",
  },
  {
    min: 41,
    max: 60,
    label: "SEVERE",
    color: "#1c236d",
    bg: "rgba(28, 35, 109, 0.15)",
  },
  {
    min: 61,
    max: 80,
    label: "CRITICAL",
    color: "#1c236d",
    bg: "rgba(28, 35, 109, 0.2)",
  },
  {
    min: 81,
    max: 100,
    label: "FATAL",
    color: "#1c236d",
    bg: "rgba(28, 35, 109, 0.25)",
  },
];
const getBand = (pct) =>
  SEV_BANDS.find((b) => pct >= b.min && pct <= b.max) || SEV_BANDS[0];

// ── Collapsible comments ───────────────────────────────────────────
function CollapsibleComment({ text }) {
  const [expanded, setExpanded] = useState(false);
  if (!text) return null;
  return (
    <div style={{ marginTop: 8 }}>
      {expanded ? (
        <>
          <div
            className="audit-notes"
            style={{
              whiteSpace: "pre-wrap",
              padding: "15px",
              background: "rgba(0,0,0,0.03)",
              borderRadius: "10px",
              fontSize: "13px",
              color: "#1c236d",
              border: "1px solid rgba(0,0,0,0.05)",
            }}
          >
            {text}
          </div>
          <button
            onClick={() => setExpanded(false)}
            className="btn-text"
            style={{
              marginTop: 8,
              fontSize: "12px",
              color: "var(--neu-primary)",
              cursor: "pointer",
              border: "none",
              background: "none",
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            Show less
          </button>
        </>
      ) : (
        <button
          onClick={() => setExpanded(true)}
          className="btn-text"
          style={{
            fontSize: "12px",
            color: "var(--neu-primary)",
            cursor: "pointer",
            border: "none",
            background: "none",
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          View Comments
        </button>
      )}
    </div>
  );
}

// ── Base64 decoder ─────────────────────────────────────────────────
function decodeBase64ToBlobUrl(
  base64Data,
  hintMime = "application/octet-stream",
) {
  try {
    if (!base64Data) return { blobUrl: null, mime: null, error: "No data" };
    let mime = hintMime,
      rawBase64 = base64Data;
    const match = base64Data.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      mime = match[1];
      rawBase64 = match[2];
    }
    rawBase64 = rawBase64.replace(/\s/g, "");
    const binary = atob(rawBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const resMime = (hintMime || "").toLowerCase().includes("pdf")
      ? "application/pdf"
      : mime;
    return {
      blobUrl: URL.createObjectURL(new Blob([bytes], { type: resMime })),
      mime: resMime,
      error: null,
    };
  } catch (e) {
    return { blobUrl: null, mime: null, error: e.message };
  }
}

// ── Doc Preview Modal ──────────────────────────────────────────────
function DocPreviewModal({ doc, onClose }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!doc) return;

    let fileData = doc.base64 || doc.file;
    if (!fileData) return;

    // If already a data URI, just use it
    if (fileData.startsWith("data:")) {
      setUrl(fileData);
    } else {
      // Otherwise, build a data URI manually
      const mime = doc.file_content_type || doc.mime_type || "image/png";
      setUrl(`data:${mime};base64,${fileData}`);
    }
  }, [doc]);

  if (!doc) return null;
  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.8)",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#e4e9f0",
          borderRadius: "25px",
          width: "100%",
          maxWidth: "1200px",
          height: "95vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
        }}
      >
        <div
          className="modal-header"
          style={{
            padding: "20px 30px",
            borderBottom: "1px solid rgba(0,0,0,0.05)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "white",
          }}
        >
          <h4
            style={{
              margin: 0,
              color: "#1c236d",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <FileText size={20} /> {doc.doc_type?.replace(/_/g, " ")}
          </h4>
          <button
            onClick={onClose}
            className="btn-icon"
            style={{
              background: "transparent",
              border: "none",
              color: "#1c236d",
              cursor: "pointer",
              padding: "10px",
              borderRadius: "50%",
            }}
          >
            <X size={26} />
          </button>
        </div>
        <div
          className="modal-body"
          style={{
            flex: 1,
            padding: "0",
            overflow: "hidden",
            background: "#ffffff",
            position: "relative",
          }}
        >
          {!url ? (
            <div
              style={{
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <p>No file data</p>
            </div>
          ) : (
            <iframe
              src={url}
              style={{ width: "100%", height: "100%", border: "none" }}
              title="doc-preview"
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Resubmit Panel ─────────────────────────────────────────────────
function ResubmitPanel({ caseData, onUpdate }) {
  const [files, setFiles] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [previewDoc, setPreviewDoc] = useState(null);

  const DOCS =
    caseData.incident_type === "DEATH"
      ? ["MEDICAL_REPORT", "OB_EXTRACT", "DEATH_CERTIFICATE"]
      : ["MEDICAL_REPORT", "OB_EXTRACT", "NATIONAL_ID", "PF3"];

  const handleFileSelect = (key, file) => {
    if (!file) return;

    // Improved type detection
    let fileType = file.type;
    if (!fileType && file.name.toLowerCase().endsWith(".pdf")) {
      fileType = "application/pdf";
    }

    const reader = new FileReader();
    reader.onload = () =>
      setFiles((f) => ({
        ...f,
        [key]: {
          name: file.name,
          original_filename: file.name, // consistent with DocPreviewModal expectation
          base64: reader.result,
          size: file.size,
          type: fileType,
          file_content_type: fileType,
        },
      }));
    reader.readAsDataURL(file);
  };

  const handleResubmit = async () => {
    if (!Object.keys(files).length)
      return setError("Please upload at least one document");
    setSubmitting(true);
    setError("");
    try {
      for (const [type, f] of Object.entries(files))
        await casesApi.uploadDocument(caseData.case_id, {
          doc_type: type,
          file: f.base64,
          filename: f.name,
        });
      await casesApi.resubmit(caseData.case_id);
      onUpdate();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="tab-content" style={{ animation: "fadeIn 0.4s" }}>
      <DocPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
      <div className="info-section">
        <h3>RESUBMIT DOCUMENTATION</h3>
        {caseData.review_comments && (
          <div
            className="alert alert-warning"
            style={{
              marginBottom: "25px",
              borderRadius: "15px",
              background: "#fffbeb",
              border: "1px solid #fde68a",
            }}
          >
            <div
              style={{
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "8px",
              }}
            >
              <AlertTriangle size={16} /> RETURN REASON
            </div>
            <p style={{ fontSize: "14px", fontStyle: "italic" }}>
              {caseData.review_comments}
            </p>
          </div>
        )}
        {error && <div className="alert alert-error">{error}</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {DOCS.map((type) => {
            const file = files[type];
            const existing = caseData.documents?.find(
              (d) => d.doc_type === type,
            );
            return (
              <div
                key={type}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "20px",
                  padding: "15px 25px",
                  background: "#f8fafc",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div
                  style={{
                    background: file ? "var(--neu-primary)" : "#e2e8f0",
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: file ? "white" : "#94a3b8",
                  }}
                >
                  <FileText size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "13px", fontWeight: 500 }}>
                    {DOCUMENT_LABELS[type]}
                  </div>
                  <div style={{ fontSize: "12px", opacity: 0.6 }}>
                    {file ? (
                      <span className="text-success">New: {file.name}</span>
                    ) : existing ? (
                      <span>Current: {existing.original_filename}</span>
                    ) : (
                      "Document missing"
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  {existing && (
                    <button
                      className="btn btn-xs btn-outline"
                      onClick={() => setPreviewDoc(existing)}
                    >
                      <Eye size={12} /> View
                    </button>
                  )}
                  {file && (
                    <button
                      className="btn btn-xs btn-outline"
                      style={{ marginLeft: "5px" }}
                      onClick={() => setPreviewDoc(file)}
                    >
                      <Eye size={12} /> Preview
                    </button>
                  )}
                  <label
                    className="btn btn-xs btn-primary"
                    style={{ cursor: "pointer", margin: 0 }}
                  >
                    <Upload size={12} /> {file ? "Change" : "Upload"}
                    <input
                      type="file"
                      style={{ display: "none" }}
                      onChange={(e) =>
                        handleFileSelect(type, e.target.files[0])
                      }
                    />
                  </label>
                </div>
              </div>
            );
          })}
        </div>
        <button
          className="btn btn-primary"
          style={{ marginTop: "30px", width: "100%", padding: "15px" }}
          onClick={handleResubmit}
          disabled={submitting}
        >
          {submitting ? (
            "SUBMITTING..."
          ) : (
            <>
              <CheckCircle2 size={20} /> RESUBMIT CASE TO HQ
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ── CP_HRM Calculation View (result tab) ──────────────────────────────
function CalculationView({ assessment, caseData, caseId }) {
  const members = caseData.submitted_members || [];
  const totalMembers = members.length;

  const avgSeverity =
    totalMembers > 0
      ? Math.round(
          members.reduce((s, m) => s + Number(m.injury_percentage || 0), 0) /
            totalMembers,
        )
      : 0;

  const rpcMember = members.find((m) => m.role === "RPC");
  const agreedAmount = rpcMember?.agreed_amount
    ? Number(rpcMember.agreed_amount)
    : null;

  const suggestedAmt =
    agreedAmount != null
      ? agreedAmount
      : avgSeverity != null
        ? Math.round((avgSeverity / 100) * MAX_AWARD)
        : assessment?.calculated_amount || 0;

  const band = getBand(avgSeverity);

  return (
    <div
      className="calculation-view-premium"
      style={{ animation: "fadeIn 0.5s ease-out" }}
    >
      {/* ── Executive Summary Cards ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "20px",
          marginBottom: "30px",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            padding: "24px",
            borderRadius: "24px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)",
            display: "flex",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <div
            style={{
              width: "50px",
              height: "50px",
              background: "rgba(28,35,109,0.05)",
              borderRadius: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#1c236d",
            }}
          >
            <Users size={24} />
          </div>
          <div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 500,
                color: "#64748b",
                textTransform: "uppercase",
              }}
            >
              Total Members
            </div>
            <div
              style={{ fontSize: "20px", fontWeight: 500, color: "#1c236d" }}
            >
              {totalMembers}{" "}
              <span
                style={{ fontSize: "12px", fontWeight: 500, color: "#94a3b8" }}
              >
                Submitted
              </span>
            </div>
          </div>
        </div>

        <div
          style={{
            background: "#ffffff",
            borderRadius: "24px",
            padding: "24px",
            border: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            gap: "20px",
            flex: 1,
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.02)",
          }}
        >
          <div
            style={{
              width: "50px",
              height: "50px",
              background: "rgba(28,35,109,0.05)",
              borderRadius: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#1c236d",
            }}
          >
            <Activity size={24} />
          </div>
          <div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 500,
                color: "#64748b",
                textTransform: "uppercase",
              }}
            >
              Avg. Severity
            </div>
            <div
              style={{ fontSize: "20px", fontWeight: 500, color: "#1c236d" }}
            >
              {avgSeverity}%{" "}
              <span
                style={{ fontSize: "12px", fontWeight: 500, color: "#94a3b8" }}
              >
                Overall
              </span>
            </div>
          </div>
        </div>

        <div
          style={{
            background: "#1c236d",
            borderRadius: "24px",
            padding: "24px",
            display: "flex",
            alignItems: "center",
            gap: "20px",
            flex: 1.2,
            color: "#ffffff",
            boxShadow: "0 20px 25px -5px rgba(28,35,109,0.2)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              right: "-20px",
              top: "-20px",
              opacity: 0.1,
            }}
          >
            <Award size={120} />
          </div>
          <div
            style={{
              width: "50px",
              height: "50px",
              background: "rgba(255,255,255,0.1)",
              borderRadius: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
            }}
          >
            <DollarSign size={24} />
          </div>
          <div style={{ position: "relative", zIndex: 1 }}>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 500,
                color: "rgba(255,255,255,0.6)",
                textTransform: "uppercase",
              }}
            >
              Suggested Award
            </div>
            <div style={{ fontSize: "22px", fontWeight: 500 }}>
              TSh {suggestedAmt.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      <h3
        style={{
          fontSize: "14px",
          fontWeight: 500,
          color: "#1c236d",
          marginBottom: "20px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          textTransform: "uppercase",
          letterSpacing: "1px",
        }}
      >
        <div
          style={{
            width: "4px",
            height: "18px",
            background: "#1c236d",
            borderRadius: "2px",
          }}
        />
        Detailed Committee Findings
      </h3>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {members.map((m, i) => {
          const pct = Number(m.injury_percentage || 0);
          const b = getBand(pct);
          const sevOpt = {
            MINOR: { color: "#1c236d", bg: "rgba(28, 35, 109, 0.05)" },
            MODERATE: { color: "#1c236d", bg: "rgba(28, 35, 109, 0.1)" },
            SEVERE: { color: "#1c236d", bg: "rgba(28, 35, 109, 0.15)" },
            CRITICAL: { color: "#1c236d", bg: "rgba(28, 35, 109, 0.2)" },
          }[m.severity] || { color: "#1c236d", bg: "rgba(28, 35, 109, 0.05)" };

          return (
            <div
              key={i}
              className="member-assessment-row"
              style={{
                background: "white",
                borderRadius: "20px",
                border: "1px solid #e2e8f0",
                padding: "20px 24px",
                display: "grid",
                gridTemplateColumns: "250px 180px 1fr 120px",
                alignItems: "center",
                gap: "24px",
                transition: "all 0.3s ease",
                boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
              }}
            >
              {/* Member Info */}
              <div
                style={{ display: "flex", gap: "14px", alignItems: "center" }}
              >
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    background: "#f8fafc",
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#1c236d",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <User size={20} />
                </div>
                <div style={{ overflow: "hidden" }}>
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#1c236d",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {m.full_name || m.force_number}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#64748b",
                      fontWeight: 500,
                      textTransform: "uppercase",
                    }}
                  >
                    {m.role || "Member"}
                  </div>
                </div>
              </div>

              {/* Assessment Gauge */}
              <div
                style={{ display: "flex", flexDirection: "column", gap: "6px" }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 500,
                      color: b.color,
                    }}
                  >
                    {pct}% {m.severity || "—"}
                  </span>
                </div>
                <div
                  style={{
                    width: "100%",
                    height: "8px",
                    background: "#f1f5f9",
                    borderRadius: "4px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      height: "100%",
                      background: b.color,
                      borderRadius: "4px",
                    }}
                  />
                </div>
              </div>

              {/* Modern Minimalist Notes */}
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "16px",
                  padding: "12px 18px",
                  border: "1px solid rgba(28,35,109,0.06)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <div
                  style={{
                    fontSize: "9px",
                    fontWeight: 500,
                    color: "#94a3b8",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Member Feedback
                </div>
                {m.notes ? (
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#1c236d",
                      lineHeight: "1.5",
                      fontWeight: "500",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {m.notes}
                  </div>
                ) : (
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#cbd5e1",
                      fontStyle: "italic",
                    }}
                  >
                    No notes provided
                  </div>
                )}
              </div>

              {/* Timestamp */}
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontSize: "10px",
                    color: "#94a3b8",
                    fontWeight: 500,
                  }}
                >
                  SUBMITTED ON
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#1c236d",
                    fontWeight: 500,
                  }}
                >
                  {m.submitted_at
                    ? new Date(m.submitted_at).toLocaleDateString()
                    : "—"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────
export default function CaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const perms = usePermissions();

  const [data, setData] = useState({
    case: null,
    audit: [],
    assessment: null,
    committee: null,
    loading: true,
    error: "",
  });
  const [activeTab, setActiveTab] = useState("details");
  const [previewDoc, setPreviewDoc] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef();

  const fetch = () => {
    setData((d) => ({ ...d, loading: true, error: "" }));
    Promise.all([
      casesApi.get(id),
      perms.canViewAuditLogs ? casesApi.getAudit(id) : Promise.resolve([]),
      casesApi.getAssessment(id).catch(() => null),
    ])
      .then(([c, audit, assess]) => {
        const committee =
          c.committee_members?.length > 0
            ? {
                meeting_date: c.meeting_date || null,
                notes: c.notes || "",
                members: c.committee_members.map((m) => ({
                  force_number: m.force_number || "",
                  full_name: m.user_display || "",
                  rank: m.rank || "",
                  region: m.region || "",
                  role: m.role || "",
                  has_submitted: m.has_submitted || false,
                })),
              }
            : null;

        setData({
          case: c,
          audit: Array.isArray(audit) ? audit : [],
          assessment: assess,
          committee,
          loading: false,
          error: "",
        });
      })
      .catch((e) =>
        setData((d) => ({ ...d, loading: false, error: e.message })),
      );
  };

  useEffect(fetch, [id]);

  if (data.loading)
    return (
      <div className="page-center">
        <div className="loading-state">
          <p>Fetching case profile...</p>
        </div>
      </div>
    );
  if (data.error)
    return (
      <div className="template-container">
        <div className="alert alert-error">{data.error}</div>
        <button className="btn btn-outline" onClick={() => navigate("/cases")}>
          <ChevronLeft size={16} /> Return to Case Directory
        </button>
      </div>
    );
  if (!data.case) return null;

  const c = data.case;
  const meta = STATUS_META[c.status] || {
    label: c.status,
    badgeClass: "badge-secondary",
    icon: <Info size={14} />,
  };

  const showHQ =
    (perms.hasRole("COMPENSATION_HQ_CO") &&
      ["SUBMITTED", "UNDER_REVIEW", "HQ_APPROVED"].includes(
        c.status?.trim().toUpperCase(),
      )) ||
    (perms.hasRole("COMPENSATION_HQ") &&
      ["SUBMITTED", "UNDER_REVIEW"].includes(c.status?.trim().toUpperCase())) ||
    (perms.hasRole("COMPENSATION_HQ_SO") &&
      ["CO_APPROVED", "SO_REVIEWED"].includes(
        c.status?.trim().toUpperCase(),
      )) ||
    (perms.hasRole("COMPENSATION_HQ_CHIEF") &&
      ["SO_REVIEWED", "PENDING_CP_HRM"].includes(
        c.status?.trim().toUpperCase(),
      ));
  const showComm =
    (perms.canFormCommittee && c.status === "PENDING_CP_HRM") ||
    (perms.canViewCommittee &&
      ["COMMITTEE_ASSIGNED", "ASSESSED"].includes(c.status));
  const showAssess =
    perms.canSubmitAssessment && c.status === "COMMITTEE_ASSIGNED";
  const committeeReadOnly = ["COMMITTEE_ASSIGNED", "ASSESSED"].includes(
    c.status,
  );

  const TABS = [
    { id: "details", label: "Overview", icon: <Info size={16} /> },
    ...(showHQ
      ? [
          {
            id: "validate",
            label: "Validation",
            icon: <ShieldCheck size={16} />,
          },
        ]
      : []),
    ...(showComm
      ? [{ id: "committee", label: "Committees", icon: <Users size={16} /> }]
      : []),
    ...(showAssess
      ? [{ id: "assess", label: "Assessment", icon: <Calculator size={16} /> }]
      : []),
    ...(data.assessment
      ? [{ id: "result", label: "Agreed mount", icon: <Receipt size={16} /> }]
      : []),
    ...(c.status === "INCOMPLETE" && perms.canSubmitCases
      ? [{ id: "resubmit", label: "Fix & Resubmit", icon: <Edit3 size={16} /> }]
      : []),
    ...(perms.canViewAuditLogs
      ? [{ id: "audit", label: "Audit Timeline", icon: <History size={16} /> }]
      : []),
  ];

  // Derive shared metrics for UI and Report
  const reportMembers =
    c.submitted_members ||
    c.committee_members?.filter((m) => m.has_submitted_input) ||
    [];
  const rpcMember = reportMembers.find((m) => m.role === "RPC");
  const reportTotalMembers = reportMembers.length;
  const reportAvgSeverity =
    reportTotalMembers > 0
      ? Math.round(
          reportMembers.reduce(
            (s, m) => s + Number(m.injury_percentage || 0),
            0,
          ) / reportTotalMembers,
        )
      : 0;

  const reportRpcMember = reportMembers.find((m) => m.role === "RPC");
  const reportAgreedAmount = reportRpcMember?.agreed_amount
    ? Number(reportRpcMember.agreed_amount)
    : null;

  const reportSuggestedAmt =
    reportAgreedAmount != null
      ? reportAgreedAmount
      : reportAvgSeverity != null
        ? Math.round((reportAvgSeverity / 100) * MAX_AWARD)
        : data.assessment?.calculated_amount || 0;

  const handleDownloadPDF = async () => {
    if (!reportRef.current || isExporting || !data.case) return;
    const c = data.case;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Case_Report_${c.case_id}.pdf`);
    } catch (err) {
      console.error("PDF Export Error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="template-container">
      {/* Hidden Print Template */}
      <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
        <div
          ref={reportRef}
          style={{
            width: "210mm",
            padding: "20mm",
            background: "white",
            color: "#1c236d",
            fontFamily: "Arial, sans-serif",
          }}
        >
          <div
            style={{
              textAlign: "center",
              borderBottom: "2px solid #1c236d",
              paddingBottom: "20px",
              marginBottom: "30px",
            }}
          >
            <img
              src="/police_logo.png"
              alt="TPF Logo"
              style={{ width: "60px", marginBottom: "10px" }}
            />
            <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 500 }}>
              TANZANIA POLICE FORCE
            </h1>
            <h2 style={{ margin: "5px 0", fontSize: "18px", opacity: 0.8 }}>
              COMPENSATION ASSESSMENT REPORT
            </h2>
            <div style={{ fontSize: "12px", marginTop: "10px" }}>
              Printed on: {new Date().toLocaleString()}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "30px",
              marginBottom: "40px",
            }}
          >
            <div>
              <h3
                style={{
                  fontSize: "14px",
                  borderBottom: "1px solid #eee",
                  paddingBottom: "5px",
                }}
              >
                SOLDIER PARTICULARS
              </h3>
              <p style={{ margin: "5px 0" }}>
                <strong>Name:</strong> {c.soldier_full_name}
              </p>
              <p style={{ margin: "5px 0" }}>
                <strong>Force Number:</strong> {c.soldier_force_number}
              </p>
              <p style={{ margin: "5px 0" }}>
                <strong>Rank:</strong> {c.soldier_rank}
              </p>
              <p style={{ margin: "5px 0" }}>
                <strong>Registry ID:</strong> {c.case_id}
              </p>
            </div>
            <div>
              <h3
                style={{
                  fontSize: "14px",
                  borderBottom: "1px solid #eee",
                  paddingBottom: "5px",
                }}
              >
                INCIDENT DETAILS
              </h3>
              <p style={{ margin: "5px 0" }}>
                <strong>Date:</strong> {c.incident_date}
              </p>
              <p style={{ margin: "5px 0" }}>
                <strong>Location:</strong> {c.incident_location}
              </p>
              <p style={{ margin: "5px 0" }}>
                <strong>Type:</strong> {c.incident_type}
              </p>
            </div>
          </div>

          <h3
            style={{
              fontSize: "16px",
              marginBottom: "15px",
              color: "#1c236d",
              fontWeight: 500,
              textTransform: "uppercase",
            }}
          >
            DETAILED COMMITTEE FINDINGS
          </h3>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginBottom: "40px",
              border: "1px solid #eee",
            }}
          >
            <thead>
              <tr style={{ background: "#1c236d", color: "white" }}>
                <th
                  style={{
                    padding: "12px",
                    textAlign: "left",
                    fontSize: "11px",
                    textTransform: "uppercase",
                  }}
                >
                  MEMBER NAME
                </th>
                <th
                  style={{
                    padding: "12px",
                    textAlign: "left",
                    fontSize: "11px",
                    textTransform: "uppercase",
                  }}
                >
                  ROLE
                </th>
                <th
                  style={{
                    padding: "12px",
                    textAlign: "center",
                    fontSize: "11px",
                    textTransform: "uppercase",
                  }}
                >
                  ASSESSMENT
                </th>
                <th
                  style={{
                    padding: "12px",
                    textAlign: "left",
                    fontSize: "11px",
                    textTransform: "uppercase",
                  }}
                >
                  COMMENTS
                </th>
              </tr>
            </thead>
            <tbody>
              {reportMembers.map((m, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid #eee" }}>
                  <td
                    style={{
                      padding: "12px",
                      fontSize: "12px",
                      fontWeight: 500,
                    }}
                  >
                    {m.full_name || m.force_number}
                  </td>
                  <td
                    style={{ padding: "12px", fontSize: "11px", opacity: 0.8 }}
                  >
                    {m.role}
                  </td>
                  <td
                    style={{
                      padding: "12px",
                      fontSize: "12px",
                      textAlign: "center",
                      fontWeight: 500,
                    }}
                  >
                    {m.injury_percentage}%
                  </td>
                  <td
                    style={{
                      padding: "12px",
                      fontSize: "11px",
                      fontStyle: "italic",
                      lineHeight: "1.4",
                    }}
                  >
                    {m.notes || "No comments"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: "30px", padding: "0 5mm" }}>
            <div
              style={{
                borderTop: "2px solid #1c236d",
                paddingTop: "10px",
                marginBottom: "15px",
              }}
            >
              <h3
                style={{
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "#1c236d",
                  margin: 0,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                EXECUTIVE SUMMARY & RECOMMENDATION
              </h3>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-around",
                padding: "5px 0",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: "9px",
                    fontWeight: 500,
                    color: "#94a3b8",
                    marginBottom: "5px",
                    textTransform: "uppercase",
                  }}
                >
                  Avg. Severity
                </div>
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: 500,
                    color: "#1c236d",
                  }}
                >
                  {reportAvgSeverity}%
                </div>
              </div>

              <div
                style={{
                  textAlign: "center",
                  borderLeft: "1px dotted #ccc",
                  borderRight: "1px dotted #ccc",
                  padding: "0 30px",
                }}
              >
                <div
                  style={{
                    fontSize: "9px",
                    fontWeight: 500,
                    color: "#94a3b8",
                    marginBottom: "5px",
                    textTransform: "uppercase",
                  }}
                >
                  Total Members
                </div>
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: 500,
                    color: "#1c236d",
                  }}
                >
                  {reportTotalMembers}
                </div>
              </div>

              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: "9px",
                    fontWeight: 500,
                    color: "#94a3b8",
                    marginBottom: "5px",
                    textTransform: "uppercase",
                  }}
                >
                  Suggested Award
                </div>
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: 500,
                    color: "#1c236d",
                  }}
                >
                  TSh {reportAgreedAmount.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: "60px",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <div style={{ textAlign: "center", width: "220px", margin: "0 auto" }}>
  {/* Signature */}
  <div style={{ marginBottom: "10px" }}>
    <img
      src={`data:image/png;base64,${rpcMember?.signature}`}
      alt="Chairman Signature"
      style={{ width: "60px", marginBottom: "10px" }}
    />
  </div>

  {/* Line */}
  <div
    style={{
      borderBottom: "1px solid #000",
      marginBottom: "10px",
      marginTop: "-50px",
      height: "35px",
    }}
  ></div>

  {/* Label */}
  <div
    style={{
      fontSize: "10px",
      fontWeight: 500,
      color: "#1c236d",
      letterSpacing: "0.5px",
    }}
  >
    PREPARED BY ( CHAIRMAN )
  </div>
</div>

          </div>
        </div>
      </div>
      <div
        style={{
          marginBottom: "30px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 5px",
        }}
      >
        <div>
          <h2
            style={{
              margin: "0 0 4px 0",
              fontSize: "22px",
              fontWeight: 700,
              color: "#1c236d",
              letterSpacing: "-0.3px",
            }}
          >
            Case Profile Details
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: "14px",
              color: "#64748b",
              fontWeight: 500,
            }}
          >
            Technical review and documentation tracking
          </p>
        </div>
        <button
          className="btn-navy-premium"
          onClick={handleDownloadPDF}
          disabled={isExporting}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px 24px",
            background: isExporting ? "#64748b" : "#1c236d",
            color: "white",
            border: "none",
            borderRadius: "16px",
            fontWeight: 600,
            fontSize: "12px",
            cursor: isExporting ? "not-allowed" : "pointer",
            boxShadow: "0 8px 20px rgba(28, 35, 109, 0.2)",
            transition: "all 0.3s ease",
            textTransform: "uppercase",
            letterSpacing: "1px",
          }}
        >
          {isExporting ? (
            <>DOWNLOADING...</>
          ) : (
            <>
              <Download size={16} /> EXPORT PDF
            </>
          )}
        </button>
      </div>

      <DocPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />

      {/* Profile Header */}
      <div
        className="profile-header-premium"
        style={{
          marginBottom: "25px",
          background: "white",
          borderRadius: "20px",
          padding: "30px",
          boxShadow: "var(--neu-shadow-raised)",
          border: "1px solid rgba(255,255,255,0.4)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-100px",
            right: "-100px",
            width: "300px",
            height: "300px",
            background: "var(--neu-primary)",
            opacity: 0.03,
            borderRadius: "50%",
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            position: "relative",
            zIndex: 2,
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "15px",
                marginBottom: "10px",
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 500,
                  color: "#1c236d",
                  background: "rgba(28,35,109,0.05)",
                  padding: "6px 14px",
                  borderRadius: "20px",
                  letterSpacing: "1px",
                }}
              >
                REGISTRY ID: {c.case_id}
              </span>
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 25px",
                  borderRadius: "30px",
                  fontWeight: 500,
                  fontSize: "12px",
                  textTransform: "uppercase",
                  background: "#1c236d",
                  color: "#ffffff",
                }}
              >
                {meta.icon} <span>{meta.label}</span>
              </span>
            </div>
            <h1
              style={{
                fontSize: "32px",
                fontWeight: 500,
                color: "#1c236d",
                margin: "0 0 5px",
              }}
            >
              {c.soldier_full_name}
            </h1>
            <div
              style={{
                display: "flex",
                gap: "15px",
                opacity: 0.7,
                fontWeight: 500,
                fontSize: "14px",
                color: "#1c236d",
              }}
            >
              <span
                style={{ display: "flex", alignItems: "center", gap: "5px" }}
              >
                <User size={14} /> {c.soldier_rank}
              </span>
              <span
                style={{ display: "flex", alignItems: "center", gap: "5px" }}
              >
                <Shield size={14} /> {c.soldier_force_number}
              </span>
              <span
                style={{ display: "flex", alignItems: "center", gap: "5px" }}
              >
                <TrendingUp size={14} /> {c.incident_type}
              </span>
            </div>
          </div>
        </div>
        <div
          className="summary-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: "20px",
            marginTop: "30px",
            borderTop: "1px solid #f1f5f9",
            paddingTop: "25px",
          }}
        >
          {[
            ["INCIDENT DATE", c.incident_date],
            ["LOCATION", c.incident_location],

            ["DISTRICT", c.soldier_district || "—"],
          ].map(([label, value]) => (
            <div key={label} className="summary-item">
              <div className="summary-label">{label}</div>
              <div className="summary-value">{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div
        className="profile-layout-container"
        style={{ display: "flex", gap: "25px" }}
      >
        {/* Sidebar */}
        <div
          className="profile-tabs-sidebar"
          style={{ width: "280px", flexShrink: 0 }}
        >
          <div className="results-card" style={{ padding: "15px" }}>
            <h4
              style={{
                fontSize: "11px",
                textTransform: "uppercase",
                letterSpacing: "1px",
                opacity: 0.5,
                padding: "0 15px 15px",
                margin: 0,
              }}
            >
              Processing Workflow
            </h4>
            <nav
              style={{ display: "flex", flexDirection: "column", gap: "5px" }}
            >
              {TABS.map((t) => (
                <button
                  key={t.id}
                  className={`tab-btn-neu ${activeTab === t.id ? "active" : ""}`}
                  onClick={() => setActiveTab(t.id)}
                >
                  <span className="tab-icon">{t.icon}</span>
                  <span className="tab-label">{t.label}</span>
                  {activeTab === t.id && (
                    <ChevronRight size={14} style={{ marginLeft: "auto" }} />
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="profile-main-content" style={{ flex: 1, minWidth: 0 }}>
          {activeTab === "details" && (
            <div className="tab-content" style={{ animation: "fadeIn 0.4s" }}>
              <div className="info-section">
                <h3>CIRCUMSTANCES OF INCIDENT</h3>
                <div
                  style={{
                    background: "#f8fafc",
                    padding: "25px",
                    borderRadius: "16px",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 500,
                      color: "#64748b",
                      textTransform: "uppercase",
                      marginBottom: "10px",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Official Narrative
                  </div>
                  <p
                    style={{
                      fontSize: "15px",
                      lineHeight: "1.8",
                      color: "#1c236d",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {c.description}
                  </p>
                  {c.nature_of_incident && (
                    <div
                      style={{
                        marginTop: "25px",
                        paddingTop: "20px",
                        borderTop: "1px solid #e2e8f0",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "11px",
                          fontWeight: 500,
                          color: "#64748b",
                          textTransform: "uppercase",
                          marginBottom: "10px",
                          letterSpacing: "0.5px",
                        }}
                      >
                        Nature of Injury / Fatality
                      </div>
                      <p
                        style={{
                          fontSize: "14px",
                          fontWeight: 500,
                          color: "#1c236d",
                        }}
                      >
                        {c.nature_of_incident}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="info-section">
                <h3>SUPPORTING EVIDENCE & FILES</h3>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                    gap: "20px",
                    marginTop: "20px",
                  }}
                >
                  {c.documents?.map((doc) => (
                    <div
                      key={doc.id}
                      className="document-card-premium"
                      onClick={() => setPreviewDoc(doc)}
                      style={{
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "20px",
                        padding: "20px",
                        display: "flex",
                        alignItems: "center",
                        gap: "18px",
                        cursor: "pointer",
                        transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
                        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
                      }}
                    >
                      <div
                        className="doc-icon-container"
                        style={{
                          width: "50px",
                          height: "50px",
                          background: "rgba(28,35,109,0.05)",
                          borderRadius: "14px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#1c236d",
                        }}
                      >
                        <FileText size={24} />
                      </div>
                      <div
                        className="doc-info"
                        style={{ flex: 1, overflow: "hidden" }}
                      >
                        <div
                          className="doc-type"
                          style={{
                            fontSize: "13px",
                            fontWeight: 500,
                            color: "#1c236d",
                            marginBottom: "4px",
                          }}
                        >
                          {DOCUMENT_LABELS[doc.doc_type] || doc.doc_type}
                        </div>
                        <div
                          className="doc-name"
                          style={{
                            fontSize: "12px",
                            color: "#64748b",
                            opacity: 0.8,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {doc.original_filename}
                        </div>
                      </div>
                      <div className="doc-action" style={{ color: "#94a3b8" }}>
                        <Eye size={18} />
                      </div>
                    </div>
                  ))}
                  {(!c.documents || c.documents.length === 0) && (
                    <div
                      className="no-data-inline"
                      style={{ gridColumn: "span 2" }}
                    >
                      No documentation attached.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "validate" && (
            <HQValidation
              caseId={c.case_id}
              currentStatus={c.status}
              onUpdate={fetch}
            />
          )}
          {activeTab === "committee" && (
            <CommitteeFormation
              caseId={c.case_id}
              caseRegion={c.incident_location}
              onComplete={fetch}
              readOnly={committeeReadOnly}
              committeeData={data.committee}
            />
          )}
          {activeTab === "assess" && (
            <AssessmentInput caseId={c.case_id} onComplete={fetch} />
          )}

          {activeTab === "result" && data.assessment && (
            <CalculationView
              assessment={data.assessment}
              caseData={{ ...c, submitted_members: reportMembers }}
              caseId={id}
            />
          )}

          {activeTab === "resubmit" && (
            <ResubmitPanel caseData={c} onUpdate={fetch} />
          )}

          {activeTab === "audit" && (
            <div className="tab-content" style={{ animation: "fadeIn 0.4s" }}>
              <div className="info-section">
                <h3>CASE PROCESSING HISTORY</h3>
                <div
                  className="table-container"
                  style={{ borderRadius: "12px", border: "1px solid #f1f5f9" }}
                >
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>PROCESSING DATETIME</th>
                        <th>OFFICER</th>
                        <th>ACTION TAKEN</th>
                        <th>REMARKS / COMMENTS</th>
                      </tr>
                    </thead>
                    <tbody style={{ fontSize: "13px" }}>
                      {data.audit.map((log) => (
                        <tr key={log.id}>
                          <td style={{ opacity: 0.7 }}>
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td style={{ fontWeight: 500 }}>
                            {log.user_display}
                          </td>
                          <td>
                            <span
                              className="badge badge-secondary"
                              style={{ fontSize: "10px" }}
                            >
                              {" "}
                              {(log.action_display || log.action || "_")
                                .replace(/_/g, " ") // ✅ replace underscores with spaces
                                .toUpperCase()}
                            </span>
                          </td>
                          <td>
                            <CollapsibleComment text={log.comments} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes fadeIn { from { opacity:0; transform:translateY(5px); } to { opacity:1; transform:translateY(0); } }
        .summary-label { font-size:10px; font-weight: 500; color:#94a3b8; letter-spacing:0.5px; margin-bottom:5px; }
        .summary-value { font-size:14px; font-weight: 500; color:#1c236d; display:flex; align-items:center; gap:8px; }
        .tab-btn-neu { display:flex; align-items:center; gap:15px; padding:12px 18px; border-radius:12px; border:none; background:transparent; cursor:pointer; color:#64748b; font-weight: 500; text-align:left; transition:all 0.3s ease; width:100%; }
        .tab-btn-neu:hover { background:#f8fafc; color:#1c236d; }
        .tab-btn-neu.active { background:var(--neu-primary); color:white !important; box-shadow:0 10px 20px rgba(28,35,109,0.2); }
        .document-card-premium:hover { transform:translateY(-3px); box-shadow:0 20px 25px -5px rgba(0,0,0,0.1),0 10px 10px -5px rgba(0,0,0,0.04); border-color:#1c236d !important; }
        .document-card-premium:hover .doc-icon-container { background:#1c236d !important; color:white !important; }
        .document-card-premium:hover .doc-action { color:#1c236d !important; }
        .no-data-inline { padding:40px; background:#f8fafc; border:1px dashed #cbd5e1; border-radius:16px; text-align:center; color:#94a3b8; font-style:italic; font-size:13px; }
        .spinner { animation:spin 1s linear infinite; }
        @keyframes spin { 100% { transform:rotate(360deg); } }
        @media print {
          .page-actions { display:none !important; }
          .profile-tabs-sidebar { display:none !important; }
          .page-header button { display:none !important; }
          .template-container { background:white !important; padding:0 !important; }
          .results-card { box-shadow:none !important; border:1px solid #e2e8f0 !important; }
          .profile-header-premium { box-shadow:none !important; border:1px solid #e2e8f0 !important; }
          .profile-layout-container { display:block !important; }
          .profile-main-content { width:100% !important; }
        }
      `,
        }}
      />
    </div>
  );
}
