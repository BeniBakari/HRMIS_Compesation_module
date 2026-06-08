import { useState, useEffect } from "react";
import { FileText, X } from "lucide-react";

export default function DocPreviewModal({ doc, onClose }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!doc) return;
    let fileData = doc.base64 || doc.file;
    if (!fileData) return;

    if (fileData.startsWith("data:")) {
      setUrl(fileData);
    } else {
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
          <h4 style={{ margin: 0, color: "#1c236d", display: "flex", alignItems: "center", gap: "10px" }}>
            <FileText size={20} /> {doc.doc_type?.replace(/_/g, " ")}
          </h4>
          <button
            onClick={onClose}
            className="btn-icon"
            style={{ background: "transparent", border: "none", color: "#1c236d", cursor: "pointer", padding: "10px", borderRadius: "50%" }}
          >
            <X size={26} />
          </button>
        </div>
        <div
          className="modal-body"
          style={{ flex: 1, padding: "0", overflow: "hidden", background: "#ffffff", position: "relative" }}
        >
          {!url ? (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <p>No file data</p>
            </div>
          ) : (
            <iframe src={url} style={{ width: "100%", height: "100%", border: "none" }} title="doc-preview" />
          )}
        </div>
      </div>
    </div>
  );
}