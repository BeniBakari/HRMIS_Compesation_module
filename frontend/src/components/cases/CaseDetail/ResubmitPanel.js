import { useState } from "react";
import { FileText, AlertTriangle, Eye, Upload, CheckCircle2 } from "lucide-react";
import { casesApi }        from "../../../services/api";
import { DOCUMENT_LABELS } from "./constants";
import DocPreviewModal      from "./DocPreviewModal";

export default function ResubmitPanel({ caseData, onUpdate }) {
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
            style={{ marginBottom: "25px", borderRadius: "15px", background: "#fffbeb", border: "1px solid #fde68a" }}
          >
            <div style={{ fontWeight: 500, display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <AlertTriangle size={16} /> RETURN REASON
            </div>
            <p style={{ fontSize: "14px", fontStyle: "italic" }}>{caseData.review_comments}</p>
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {DOCS.map((type) => {
            const file = files[type];
            const existing = caseData.documents?.find((d) => d.doc_type === type);
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
                  <div style={{ fontSize: "13px", fontWeight: 500 }}>{DOCUMENT_LABELS[type]}</div>
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
                    <button className="btn btn-xs btn-outline" onClick={() => setPreviewDoc(existing)}>
                      <Eye size={12} /> View
                    </button>
                  )}
                  {file && (
                    <button className="btn btn-xs btn-outline" style={{ marginLeft: "5px" }} onClick={() => setPreviewDoc(file)}>
                      <Eye size={12} /> Preview
                    </button>
                  )}
                  <label className="btn btn-xs btn-primary" style={{ cursor: "pointer", margin: 0 }}>
                    <Upload size={12} /> {file ? "Change" : "Upload"}
                    <input type="file" style={{ display: "none" }} onChange={(e) => handleFileSelect(type, e.target.files[0])} />
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
          {submitting ? "SUBMITTING..." : <><CheckCircle2 size={20} /> RESUBMIT CASE TO HQ</>}
        </button>
      </div>
    </div>
  );
}