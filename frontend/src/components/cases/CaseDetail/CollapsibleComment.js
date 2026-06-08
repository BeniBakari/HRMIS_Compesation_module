import { useState } from "react";

export default function CollapsibleComment({ text }) {
  const [expanded, setExpanded] = useState(false);

  if (!text) return null;

  const btnStyle = {
    fontSize: "12px",
    color: "var(--neu-primary)",
    cursor: "pointer",
    border: "none",
    background: "none",
    fontWeight: 500,
    display: "flex",
    alignItems: "center",
    gap: "5px",
  };

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
          <button onClick={() => setExpanded(false)} className="btn-text" style={{ ...btnStyle, marginTop: 8 }}>
            Show less
          </button>
        </>
      ) : (
        <button onClick={() => setExpanded(true)} className="btn-text" style={btnStyle}>
          View Comments
        </button>
      )}
    </div>
  );
}