import { Users, Activity, DollarSign, Award, User } from "lucide-react";
import { MAX_AWARD, getBand } from "./constants";

export default function CalculationView({ assessment, caseData }) {
  const members = caseData.submitted_members || [];
  const totalMembers = members.length;

  const avgSeverity =
    totalMembers > 0
      ? Math.round(
          members.reduce((s, m) => s + Number(m.injury_percentage || 0), 0) / totalMembers,
        )
      : 0;

  const rpcMember = members.find((m) => m.role === "RPC");
  const agreedAmount = rpcMember?.agreed_amount ? Number(rpcMember.agreed_amount) : null;

  const suggestedAmt =
    agreedAmount != null
      ? agreedAmount
      : avgSeverity != null
        ? Math.round((avgSeverity / 100) * MAX_AWARD)
        : assessment?.calculated_amount || 0;

  return (
    <div className="calculation-view-premium" style={{ animation: "fadeIn 0.5s ease-out" }}>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "20px", marginBottom: "30px" }}>
        <div style={{ background: "#ffffff", padding: "24px", borderRadius: "24px", border: "1px solid #e2e8f0", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)", display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ width: "50px", height: "50px", background: "rgba(28,35,109,0.05)", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", color: "#1c236d" }}>
            <Users size={24} />
          </div>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 500, color: "#64748b", textTransform: "uppercase" }}>Total Members</div>
            <div style={{ fontSize: "20px", fontWeight: 500, color: "#1c236d" }}>
              {totalMembers} <span style={{ fontSize: "12px", fontWeight: 500, color: "#94a3b8" }}>Submitted</span>
            </div>
          </div>
        </div>

        <div style={{ background: "#ffffff", borderRadius: "24px", padding: "24px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "20px", flex: 1, boxShadow: "0 4px 6px -1px rgba(0,0,0,0.02)" }}>
          <div style={{ width: "50px", height: "50px", background: "rgba(28,35,109,0.05)", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", color: "#1c236d" }}>
            <Activity size={24} />
          </div>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 500, color: "#64748b", textTransform: "uppercase" }}>Avg. Severity</div>
            <div style={{ fontSize: "20px", fontWeight: 500, color: "#1c236d" }}>
              {avgSeverity}% <span style={{ fontSize: "12px", fontWeight: 500, color: "#94a3b8" }}>Overall</span>
            </div>
          </div>
        </div>

        <div style={{ background: "#1c236d", borderRadius: "24px", padding: "24px", display: "flex", alignItems: "center", gap: "20px", flex: 1.2, color: "#ffffff", boxShadow: "0 20px 25px -5px rgba(28,35,109,0.2)", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", right: "-20px", top: "-20px", opacity: 0.1 }}><Award size={120} /></div>
          <div style={{ width: "50px", height: "50px", background: "rgba(255,255,255,0.1)", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff" }}>
            <DollarSign size={24} />
          </div>
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: "11px", fontWeight: 500, color: "rgba(255,255,255,0.6)", textTransform: "uppercase" }}>Suggested Award</div>
            <div style={{ fontSize: "22px", fontWeight: 500 }}>TSh {suggestedAmt.toLocaleString()}</div>
          </div>
        </div>
      </div>

      <h3 style={{ fontSize: "14px", fontWeight: 500, color: "#1c236d", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px", textTransform: "uppercase", letterSpacing: "1px" }}>
        <div style={{ width: "4px", height: "18px", background: "#1c236d", borderRadius: "2px" }} />
        Detailed Committee Findings
      </h3>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {members.map((m, i) => {
          const pct = Number(m.injury_percentage || 0);
          const b = getBand(pct);
          return (
            <div key={i} className="member-assessment-row" style={{ background: "white", borderRadius: "20px", border: "1px solid #e2e8f0", padding: "20px 24px", display: "grid", gridTemplateColumns: "250px 180px 1fr 120px", alignItems: "center", gap: "24px", transition: "all 0.3s ease", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
              <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
                <div style={{ width: "44px", height: "44px", background: "#f8fafc", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", color: "#1c236d", border: "1px solid #e2e8f0" }}>
                  <User size={20} />
                </div>
                <div style={{ overflow: "hidden" }}>
                  <div style={{ fontSize: "14px", fontWeight: 500, color: "#1c236d", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.full_name || m.force_number}</div>
                  <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 500, textTransform: "uppercase" }}>{m.role || "Member"}</div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "11px", fontWeight: 500, color: b.color }}>{pct}% {m.severity || "—"}</span>
                <div style={{ width: "100%", height: "8px", background: "#f1f5f9", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: b.color, borderRadius: "4px" }} />
                </div>
              </div>

              <div style={{ background: "#ffffff", borderRadius: "16px", padding: "12px 18px", border: "1px solid rgba(28,35,109,0.06)", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column", gap: "4px" }}>
                <div style={{ fontSize: "9px", fontWeight: 500, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>Member Feedback</div>
                {m.notes ? (
                  <div style={{ fontSize: "13px", color: "#1c236d", lineHeight: "1.5", fontWeight: "500", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{m.notes}</div>
                ) : (
                  <div style={{ fontSize: "12px", color: "#cbd5e1", fontStyle: "italic" }}>No notes provided</div>
                )}
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 500 }}>SUBMITTED ON</div>
                <div style={{ fontSize: "12px", color: "#1c236d", fontWeight: 500 }}>{m.submitted_at ? new Date(m.submitted_at).toLocaleDateString() : "—"}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}