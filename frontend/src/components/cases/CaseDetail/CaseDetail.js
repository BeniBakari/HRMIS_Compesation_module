import { useState, useEffect, useRef } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useParams, useNavigate } from "react-router-dom";
import { casesApi } from "../../../services/api";
import { usePermissions } from "../../../utils/permissions";

import HQValidation from "../HQValidation";
import CommitteeFormation from "../CommitteeFormation";
import AssessmentInput from "../AssessmentInput";

import CollapsibleComment from "./CollapsibleComment";
import DocPreviewModal from "./DocPreviewModal";
import ResubmitPanel from "./ResubmitPanel";
import CalculationView from "./CalculationView";

import { STATUS_META, DOCUMENT_LABELS, MAX_AWARD } from "./constants";

import {
  FileText,
  Info,
  ShieldCheck,
  Users,
  Calculator,
  Receipt,
  Edit3,
  History,
  Download,
  TrendingUp,
  Shield,
  User,
  Eye,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";

import "./CaseDetail.css";

// ── PDF Report Template (hidden off-screen) ───────────────────────
function PrintTemplate({
  c,
  reportRef,
  reportMembers,
  reportAvgSeverity,
  reportTotalMembers,
  reportSuggestedAmt,
  reportAgreedAmount,
}) {
  const chairman = reportMembers.find((m) => m.role === "CHAIRMAN");
  return (
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
        {/* Header */}
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
          <h1
            style={{
              margin: 0,
              fontSize: "24px",
              fontWeight: 500,
              letterSpacing: "2px", 
              lineHeight: "1.5", 
            }}
          >
            TANZANIA POLICE FORCE
          </h1>
          <h2
            style={{
              margin: "5px 0",
              fontSize: "18px",
              opacity: 0.8,
              letterSpacing: "1px", // lighter spacing for subtitle
              lineHeight: "1.4",
            }}
          >
            COMPENSATION ASSESSMENT REPORT
          </h2>
          <div style={{ fontSize: "12px", marginTop: "10px" }}>
            Printed on: {new Date().toLocaleString()}
          </div>
        </div>

        {/* Soldier + Incident grid */}
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
              SOLDIER PARTICULARSs
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

        {/* Committee findings table */}
        <h3
          style={{
            fontSize: "16px",
            marginBottom: "15px",
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
              {["MEMBER NAME", "ROLE", "ASSESSMENT", "COMMENTS"].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "12px",
                    textAlign: "left",
                    fontSize: "11px",
                    textTransform: "uppercase",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reportMembers.map((m, idx) => (
              <tr key={idx} style={{ borderBottom: "1px solid #eee" }}>
                <td
                  style={{ padding: "12px", fontSize: "12px", fontWeight: 500 }}
                >
                  {m.full_name || m.force_number}
                </td>
                <td style={{ padding: "12px", fontSize: "11px", opacity: 0.8 }}>
                  {m.role.replace(/_/g, " ")}
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

        {/* Executive summary */}
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
            {[
              ["Avg. Severity", `${reportAvgSeverity}%`],
              ["Total Members", reportTotalMembers],
              ["Suggested Award", `TSh ${reportAgreedAmount.toLocaleString()}`],
            ].map(([label, value], i, arr) => (
              <div
                key={label}
                style={{
                  textAlign: "center",
                  ...(i > 0 && i < arr.length - 1
                    ? {
                        borderLeft: "1px dotted #ccc",
                        borderRight: "1px dotted #ccc",
                        padding: "0 30px",
                      }
                    : {}),
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
                  {label}
                </div>
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: 500,
                    color: "#1c236d",
                  }}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Signatures */}

        {chairman && (
          <div
            style={{ textAlign: "center", width: "220px", margin: "0 auto" }}
          >
            {/* Signature */}
            <div style={{ marginBottom: "10px" }}>
              <img
                src={`data:image/png;base64,${chairman.signature}`}
                alt="Chairman Signature"
                style={{ width: "60px", marginBottom: "-50px" }}
              />
            </div>

            {/* Line */}
            <div
              style={{
                borderBottom: "1px solid #000",
                marginBottom: "10px",
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

            {/* Chairman Name */}
            <div
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#000",
              }}
            >
              {chairman.rank}
              <span>&nbsp;</span> {chairman.full_name || "Chairman Name"}
            </div>
          </div>
        )}
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

  const fetchData = () => {
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

  useEffect(fetchData, [id]);

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
      ? [{ id: "result", label: "Agreed Amount", icon: <Receipt size={16} /> }]
      : []),
    ...(c.status === "RETURNED" && perms.canSubmitCases
      ? [{ id: "resubmit", label: "Fix & Resubmit", icon: <Edit3 size={16} /> }]
      : []),
    ...(perms.canViewAuditLogs
      ? [{ id: "audit", label: "Audit Timeline", icon: <History size={16} /> }]
      : []),
  ];

  const reportMembers =
    c.submitted_members ||
    c.committee_members?.filter((m) => m.has_submitted_input) ||
    [];
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
  const chairman = reportMembers.find((m) => m.role === "CHAIRMAN");
  const reportAgreedAmount = chairman?.agreed_amount
    ? Number(chairman.agreed_amount)
    : null;
  const reportSuggestedAmt =
    reportAgreedAmount != null
      ? reportAgreedAmount
      : Math.round((reportAvgSeverity / 100) * MAX_AWARD);
  const handleDownloadPDF = async () => {
    if (!reportRef.current || isExporting) return;
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
      pdf.addImage(
        imgData,
        "PNG",
        0,
        0,
        pdfWidth,
        (imgProps.height * pdfWidth) / imgProps.width,
      );
      pdf.save(`Case_Report_${c.case_id}.pdf`);
    } catch (err) {
      console.error("PDF Export Error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="template-container">
      <PrintTemplate
        c={c}
        reportRef={reportRef}
        reportMembers={reportMembers}
        reportAvgSeverity={reportAvgSeverity}
        reportTotalMembers={reportTotalMembers}
        reportSuggestedAmt={reportSuggestedAmt}
        reportAgreedAmount={reportAgreedAmount}
      />

      {/* Page header */}
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
            boxShadow: "0 8px 20px rgba(28,35,109,0.2)",
            textTransform: "uppercase",
            letterSpacing: "1px",
          }}
        >
          <Download size={16} />
          {isExporting ? "DOWNLOADING..." : "EXPORT PDF"}
        </button>
      </div>

      <DocPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />

      {/* Profile header card */}
      <div
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
                {meta.icon} {meta.label}
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
            <div key={label}>
              <div className="summary-label">{label}</div>
              <div className="summary-value">{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Layout: sidebar + content */}
      <div style={{ display: "flex", gap: "25px" }}>
        <div style={{ width: "280px", flexShrink: 0 }}>
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
                  <span>{t.icon}</span>
                  <span>{t.label}</span>
                  {activeTab === t.id && (
                    <ChevronRight size={14} style={{ marginLeft: "auto" }} />
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {activeTab === "details" && (
            <DetailsTab c={c} setPreviewDoc={setPreviewDoc} />
          )}
          {activeTab === "validate" && (
            <HQValidation
              caseId={c.case_id}
              currentStatus={c.status}
              onUpdate={fetchData}
            />
          )}
          {activeTab === "committee" && (
            <CommitteeFormation
              caseId={c.case_id}
              caseRegion={c.incident_location}
              onComplete={fetchData}
              readOnly={committeeReadOnly}
              committeeData={data.committee}
            />
          )}
          {activeTab === "assess" && (
            <AssessmentInput caseId={c.case_id} onComplete={fetchData} />
          )}
          {activeTab === "result" && data.assessment && (
            <CalculationView
              assessment={data.assessment}
              caseData={{ ...c, submitted_members: reportMembers }}
            />
          )}
          {activeTab === "resubmit" && (
            <ResubmitPanel caseData={c} onUpdate={fetchData} />
          )}
          {activeTab === "audit" && <AuditTab audit={data.audit} />}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: LOCAL_STYLES }} />
    </div>
  );
}

// ── Details Tab ───────────────────────────────────────────────────
function DetailsTab({ c, setPreviewDoc }) {
  return (
    <div className="tab-content" style={{ animation: "fadeIn 0.4s" }}>
      {/* Rejected banner */}
      {c.status === "REJECTED" && c.review_comments && (
        <div
          style={{
            marginBottom: "25px",
            padding: "20px 25px",
            background: "#fff7ed",
            border: "1.5px solid #f97316",
            borderRadius: "16px",
            display: "flex",
            gap: "15px",
            alignItems: "flex-start",
          }}
        >
          <AlertTriangle
            size={22}
            color="#f97316"
            style={{ flexShrink: 0, marginTop: "2px" }}
          />
          <div>
            <div
              style={{
                fontWeight: 600,
                color: "#9a3412",
                fontSize: "13px",
                marginBottom: "6px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Case Rejected
            </div>
            <p
              style={{
                margin: 0,
                fontSize: "14px",
                color: "#7c2d12",
                lineHeight: "1.6",
              }}
            >
              {c.review_comments}
            </p>
          </div>
        </div>
      )}

      {/* Returned banner */}
      {c.status === "RETURNED" &&
        (c.review_comments ||
          c.hq_comments ||
          c.co_comments ||
          c.so_comments ||
          c.chief_comments) && (
          <div
            style={{
              marginBottom: "25px",
              padding: "20px 25px",
              background: "#fffbeb",
              border: "1.5px solid #fde68a",
              borderRadius: "16px",
              display: "flex",
              gap: "15px",
              alignItems: "flex-start",
            }}
          >
            <AlertTriangle
              size={22}
              color="#92400e"
              style={{ flexShrink: 0, marginTop: "2px" }}
            />
            <div>
              <div
                style={{
                  fontWeight: 600,
                  color: "#78350f",
                  fontSize: "13px",
                  marginBottom: "6px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Case Returned — Reason
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: "14px",
                  color: "#78350f",
                  lineHeight: "1.6",
                }}
              >
                {c.review_comments ||
                  c.hq_comments ||
                  c.co_comments ||
                  c.so_comments ||
                  c.chief_comments}
              </p>
            </div>
          </div>
        )}

      {/* Circumstances */}
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
                style={{ fontSize: "14px", fontWeight: 500, color: "#1c236d" }}
              >
                {c.nature_of_incident}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Documents */}
      <div className="info-section">
        <h3>SUPPORTING EVIDENCE & FILES</h3>

        {/* Summary count kama kuna rejected docs */}
        {c.documents?.some((d) => d.is_rejected) && (
          <div
            style={{
              marginBottom: "16px",
              padding: "12px 18px",
              background: "#fff1f2",
              border: "1px solid #fca5a5",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <AlertTriangle size={16} color="#dc2626" />
            <span
              style={{ fontSize: "13px", color: "#b91c1c", fontWeight: 500 }}
            >
              {c.documents.filter((d) => d.is_rejected).length} document(s)
              rejected — please upload corrected versions and resubmit.
            </span>
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "20px",
            marginTop: "10px",
          }}
        >
          {c.documents?.map((doc) => (
            <div
              key={doc.id}
              className="document-card-premium"
              onClick={() => setPreviewDoc(doc)}
              style={{
                background: doc.is_rejected ? "#fff1f2" : "#ffffff",
                border: `1px solid ${doc.is_rejected ? "#fca5a5" : doc.is_verified ? "#86efac" : "#e2e8f0"}`,
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
              {/* Icon */}
              <div
                className="doc-icon-container"
                style={{
                  width: "50px",
                  height: "50px",
                  borderRadius: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  background: doc.is_rejected
                    ? "rgba(239,68,68,0.1)"
                    : doc.is_verified
                      ? "rgba(34,197,94,0.1)"
                      : "rgba(28,35,109,0.05)",
                  color: doc.is_rejected
                    ? "#ef4444"
                    : doc.is_verified
                      ? "#16a34a"
                      : "#1c236d",
                }}
              >
                <FileText size={24} />
              </div>

              {/* Text */}
              <div style={{ flex: 1, overflow: "hidden" }}>
                <div
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
                  style={{
                    fontSize: "12px",
                    color: "#64748b",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {doc.original_filename}
                </div>

                {/* Rejection reason */}
                {doc.is_rejected && doc.rejection_reason && (
                  <div
                    style={{
                      marginTop: "6px",
                      fontSize: "11px",
                      color: "#b91c1c",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "5px",
                      lineHeight: "1.4",
                    }}
                  >
                    <AlertTriangle
                      size={11}
                      style={{ flexShrink: 0, marginTop: "1px" }}
                    />
                    <span>{doc.rejection_reason}</span>
                  </div>
                )}
              </div>

              {/* Status badge + eye icon */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: "6px",
                  flexShrink: 0,
                }}
              >
                {doc.is_rejected ? (
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 600,
                      color: "#b91c1c",
                      background: "#fee2e2",
                      padding: "3px 8px",
                      borderRadius: "20px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Rejected
                  </span>
                ) : doc.is_verified ? (
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 600,
                      color: "#15803d",
                      background: "#dcfce7",
                      padding: "3px 8px",
                      borderRadius: "20px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Verified
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 600,
                      color: "#92400e",
                      background: "#fef3c7",
                      padding: "3px 8px",
                      borderRadius: "20px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Pending
                  </span>
                )}
                <Eye size={16} style={{ color: "#94a3b8" }} />
              </div>
            </div>
          ))}

          {(!c.documents || c.documents.length === 0) && (
            <div className="no-data-inline" style={{ gridColumn: "span 2" }}>
              No documentation attached.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Audit Tab ─────────────────────────────────────────────────────
function AuditTab({ audit }) {
  return (
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
              {audit.map((log) => (
                <tr key={log.id}>
                  <td style={{ opacity: 0.7 }}>
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td style={{ fontWeight: 500 }}>{log.user_display}</td>
                  <td>
                    <span
                      className="badge badge-secondary"
                      style={{ fontSize: "10px" }}
                    >
                      {(log.action_display || log.action || "_")
                        .replace(/_/g, " ")
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
  );
}

// ── Scoped styles ─────────────────────────────────────────────────
const LOCAL_STYLES = `
  @keyframes fadeIn { from { opacity:0; transform:translateY(5px); } to { opacity:1; transform:translateY(0); } }
  .summary-label { font-size:10px; font-weight:500; color:#94a3b8; letter-spacing:0.5px; margin-bottom:5px; }
  .summary-value { font-size:14px; font-weight:500; color:#1c236d; display:flex; align-items:center; gap:8px; }
  .tab-btn-neu { display:flex; align-items:center; gap:15px; padding:12px 18px; border-radius:12px; border:none; background:transparent; cursor:pointer; color:#64748b; font-weight:500; text-align:left; transition:all 0.3s ease; width:100%; }
  .tab-btn-neu:hover { background:#f8fafc; color:#1c236d; }
  .tab-btn-neu.active { background:var(--neu-primary); color:white !important; box-shadow:0 10px 20px rgba(28,35,109,0.2); }
  .document-card-premium:hover { transform:translateY(-3px); box-shadow:0 20px 25px -5px rgba(0,0,0,0.1); }
  .document-card-premium:hover .doc-icon-container { background:#1c236d !important; color:white !important; }
  .no-data-inline { padding:40px; background:#f8fafc; border:1px dashed #cbd5e1; border-radius:16px; text-align:center; color:#94a3b8; font-style:italic; font-size:13px; }
`;
