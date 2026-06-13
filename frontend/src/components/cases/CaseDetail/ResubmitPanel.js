import { useState } from "react";
import { FileText, AlertTriangle, Eye, Upload, CheckCircle2 } from "lucide-react";
import { casesApi }        from "../../../services/api";
import { DOCUMENT_LABELS } from "./constants";
import DocPreviewModal      from "./DocPreviewModal";

export default function ResubmitPanel({ caseData, onUpdate }) {
  const [files, setFiles]         = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);

  const DOCS =
    caseData.incident_type === "DEATH"
      ? ["MEDICAL_REPORT", "OB_EXTRACT", "DEATH_CERTIFICATE"]
      : ["MEDICAL_REPORT", "OB_EXTRACT", "NATIONAL_ID", "PF3"];

  // Docs zilizokataliwa na HQ
  const rejectedTypes = new Set(
    (caseData.documents || [])
      .filter((d) => d.is_rejected)
      .map((d) => d.doc_type)
  );

  const handleFileSelect = (key, file) => {
    if (!file) return;
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
          original_filename: file.name,
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
      return setError("Please upload at least one document before submitting.");
    setSubmitting(true);
    setError("");
    setSuccess(false);
    try {
      for (const [type, f] of Object.entries(files))
        await casesApi.uploadDocument(caseData.case_id, {
          doc_type: type,
          file: f.base64,
          filename: f.name,
        });
      await casesApi.resubmit(caseData.case_id);
      setSuccess(true);
      setFiles({});
      // Refresh baada ya sekunde 2 ili mtumiaji aone ujumbe
      setTimeout(() => onUpdate(), 2000);
    } catch (e) {
      setError(e.response?.data?.error || e.message || "Submission failed. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success state ──────────────────────────────────────────────
  if (success) {
    return (
      <div className="tab-content" style={{ animation: "fadeIn 0.4s" }}>
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", padding: "60px 40px", textAlign: "center",
          background: "#f0fdf4", border: "1.5px solid #86efac",
          borderRadius: "20px",
        }}>
          <div style={{
            width: "72px", height: "72px", borderRadius: "50%",
            background: "#dcfce7", display: "flex", alignItems: "center",
            justifyContent: "center", marginBottom: "20px",
          }}>
            <CheckCircle2 size={36} color="#16a34a" />
          </div>
          <h3 style={{ margin: "0 0 10px", fontSize: "20px", fontWeight: 600, color: "#15803d" }}>
        Case Re-filed!          </h3>
          <p style={{ margin: 0, fontSize: "14px", color: "#166534", lineHeight: "1.6" }}>
            Documents have been uploaded and the case has been sent to HQ for review..<br />
            You will be informed about the next decisions.
          </p>
          <div style={{ marginTop: "16px", fontSize: "12px", color: "#4ade80" }}>
Reloading the page...          </div>
        </div>
      </div>
    );
  }

  // ── Normal state ───────────────────────────────────────────────
  return (
    <div className="tab-content" style={{ animation: "fadeIn 0.4s" }}>
      <DocPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
      <div className="info-section">
        <h3>RESUBMIT DOCUMENTATION</h3>

        {/* Return reason */}
        {(caseData.hq_comments || caseData.review_comments) && (
          <div style={{
            marginBottom: "20px", padding: "18px 22px",
            background: "#fffbeb", border: "1px solid #fde68a",
            borderRadius: "14px",
          }}>
            <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", fontSize: "12px", color: "#92400e", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              <AlertTriangle size={14} /> Reason for Return
            </div>
            <p style={{ margin: 0, fontSize: "14px", color: "#78350f", lineHeight: "1.6", fontStyle: "italic" }}>
              {caseData.hq_comments || caseData.review_comments}
            </p>
          </div>
        )}

        {/* Rejected docs summary */}
        {rejectedTypes.size > 0 && (
          <div style={{
            marginBottom: "20px", padding: "14px 18px",
            background: "#fff1f2", border: "1px solid #fca5a5",
            borderRadius: "14px", display: "flex", alignItems: "center", gap: "10px",
          }}>
            <AlertTriangle size={15} color="#dc2626" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: "13px", color: "#b91c1c", fontWeight: 500 }}>
              Documents {rejectedTypes.size} have been rejected — they appear in red below. Please upload a new version.
            </span>
          </div>
        )}

        {error && (
          <div style={{
            marginBottom: "16px", padding: "14px 18px",
            background: "#fff1f2", border: "1px solid #fca5a5",
            borderRadius: "12px", display: "flex", alignItems: "center", gap: "10px",
          }}>
            <AlertTriangle size={15} color="#dc2626" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: "13px", color: "#b91c1c" }}>{error}</span>
          </div>
        )}

        {/* Document rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {DOCS.map((type) => {
            const file     = files[type];
            const existing = caseData.documents?.find((d) => d.doc_type === type);
            const rejected = rejectedTypes.has(type);

            return (
              <div
                key={type}
                style={{
                  display: "flex", alignItems: "center", gap: "20px",
                  padding: "15px 20px", borderRadius: "14px",
                  background: rejected ? "#fff1f2" : file ? "#f0fdf4" : "#f8fafc",
                  border: `1.5px solid ${rejected ? "#fca5a5" : file ? "#86efac" : "#e2e8f0"}`,
                  transition: "all 0.2s",
                }}
              >
                {/* Icon */}
                <div style={{
                  width: "38px", height: "38px", borderRadius: "10px", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: file ? "#16a34a" : rejected ? "rgba(239,68,68,0.12)" : "#e2e8f0",
                  color: file ? "white" : rejected ? "#ef4444" : "#94a3b8",
                }}>
                  <FileText size={18} />
                </div>

                {/* Labels */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: rejected ? "#b91c1c" : "#1c236d", marginBottom: "3px" }}>
                    {DOCUMENT_LABELS[type] || type}
                    {rejected && (
                      <span style={{ marginLeft: "8px", fontSize: "10px", fontWeight: 600, color: "#b91c1c", background: "#fee2e2", padding: "2px 7px", borderRadius: "20px" }}>
                        Rejected
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>
                    {file ? (
                      <span style={{ color: "#16a34a", fontWeight: 500 }}>✓ New: {file.name}</span>
                    ) : existing ? (
                      <span style={{ color: rejected ? "#ef4444" : "#64748b" }}>
                        {rejected ? "⚠ " : ""}Iliyopo: {existing.original_filename}
                      </span>
                    ) : (
                      <span style={{ color: "#f59e0b" }}>documentation is missing</span>
                    )}
                  </div>
                  {/* Rejection reason */}
                  {rejected && existing?.rejection_reason && (
                    <div style={{ marginTop: "5px", fontSize: "11px", color: "#b91c1c", display: "flex", gap: "4px", alignItems: "flex-start" }}>
                      <AlertTriangle size={10} style={{ flexShrink: 0, marginTop: "2px" }} />
                      <span>{existing.rejection_reason}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
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
                      onClick={() => setPreviewDoc(file)}
                    >
                      <Eye size={12} /> Preview
                    </button>
                  )}
                  <label
                    className="btn btn-xs btn-primary"
                    style={{ cursor: "pointer", margin: 0, background: rejected && !file ? "#dc2626" : undefined }}
                  >
                    <Upload size={12} /> {file ? "Change it" : "UPLOAD"}
                    <input
                      type="file"
                      accept=".pdf,image/jpeg,image/png"
                      style={{ display: "none" }}
                      onChange={(e) => handleFileSelect(type, e.target.files[0])}
                    />
                  </label>
                </div>
              </div>
            );
          })}
        </div>

        {/* Submit button */}
        <button
          className="btn btn-primary"
          style={{
            marginTop: "28px", width: "100%", padding: "16px",
            fontSize: "14px", fontWeight: 600, letterSpacing: "0.5px",
            opacity: submitting ? 0.7 : 1,
          }}
          onClick={handleResubmit}
          disabled={submitting}
        >
          {submitting ? (
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
              <span style={{ width: "16px", height: "16px", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "white", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} />
              SUBMITTING...
            </span>
          ) : (
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
              <CheckCircle2 size={20} /> RESUBMIT CASE TO HQ
            </span>
          )}
        </button>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(5px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );
}