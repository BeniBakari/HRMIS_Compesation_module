import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { casesApi } from "../services/api";
import { CheckSquare, Info, Shield, Search, Briefcase, Eye, User, Calendar, Tag, ChevronRight, Loader2 } from 'lucide-react';
import "./CaseList.css";

export default function AssignedCases() {
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Pagination State
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  const load = () => {
    setLoading(true);
    casesApi
      .list({ status: "COMMITTEE_ASSIGNED", assigned_to_me: true })
      .then((data) => setCases(Array.isArray(data) ? data : data.results || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const total = cases.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const displayedCases = cases.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="template-container">
      <div className="page-header">
        <div className="header-content">
          <h1>MY CASE ASSIGNMENTS</h1>
          <p className="page-subtitle">Personal queue of active cases requiring assessment action</p>
        </div>
        <div className="page-actions">
           <button className="btn btn-outline" onClick={load} title="Refresh Task Queue">
              <Loader2 size={16} className={loading?'spinner':''} style={{marginRight: '8px'}} /> Refresh
           </button>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: '25px' }}>{error}</div>}

        <div className="results-card">
          <div className="table-container">
            <table className="staff-table">
              <thead>
                <tr>
                  <th style={{ width: '50px', textAlign: 'right' }}>#</th>
                  <th>CASE ID / TYPE</th>
                  <th>VICTIM IDENTIFICATION</th>
                  <th>INCIDENT DATE</th>
                
                  <th style={{ textAlign: "center" }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr className="no-hover">
                    <td colSpan={6} style={{ textAlign: "center", padding: '80px' }}>
                      <div className="loading-state">
                         <div className="spinner"></div>
                         <p>Retrieving your assigned tasks...</p>
                      </div>
                    </td>
                  </tr>
                ) : displayedCases.length === 0 ? (
                  <tr className="no-hover">
                    <td colSpan={6}>
                      <div className="no-data">
                         <div className="no-data-content" style={{ padding: '80px' }}>
                            <CheckSquare size={48} style={{ opacity: 0.1, marginBottom: '15px' }} />
                            <p>All caught up! No active cases assigned to you.</p>
                         </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  displayedCases.map((c, i) => (
                    <tr key={c.id} onClick={() => navigate(`/cases/${c.case_id}`)} style={{ cursor: 'pointer' }}>
                      <td style={{ textAlign: 'right', opacity: 0.5, fontWeight: 'normal', whiteSpace: 'nowrap', paddingRight: '12px' }}>
                         {(page - 1) * PAGE_SIZE + i + 1}.
                      </td>
                      <td>
                         <div className="staff-info">
                            <strong>{c.case_id}</strong>
                            <span className={`badge ${c.incident_type === "DEATH" ? "badge-danger" : "badge-warning"}`} style={{ fontSize: '9px', padding: '2px 8px', marginTop: '4px' }}>
                               {c.incident_type}
                            </span>
                         </div>
                      </td>
                      <td>
                         <div className="staff-info">
                            <strong>{c.soldier_full_name}</strong>
                            <small>{c.soldier_rank} • {c.soldier_force_number}</small>
                         </div>
                      </td>
                      <td>
                         <div className="staff-info">
                            <strong>{c.incident_date}</strong>
                            <small>Date of Event</small>
                         </div>
                      </td>
                  
                      <td style={{ textAlign: "center" }}>
                        <button className="btn btn-xs btn-outline-primary" style={{ display: 'flex', alignItems: 'center', gap: '5px', margin: '0 auto' }}>
                          <Eye size={12} /> View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* HRMIS Pagination info bar */}
          <div className="hrmis-pagination">
             <div className="hrmis-pagination-info">
                {loading ? 'Loading...' : `Showing ${total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total} records`}
             </div>
             <div className="hrmis-pagination-controls">
                <button className="hrmis-page-btn" disabled={page === 1 || loading} onClick={() => { setPage(1); window.scrollTo(0,0); }}>«</button>
                <button className="hrmis-page-btn" disabled={page === 1 || loading} onClick={() => { setPage(p => p - 1); window.scrollTo(0,0); }}>‹ Prev</button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                   let pageNum;
                   if (totalPages <= 5) pageNum = i + 1;
                   else if (page <= 3) pageNum = i + 1;
                   else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                   else pageNum = page - 2 + i;
                   return (
                      <button key={pageNum} className={`hrmis-page-btn ${page === pageNum ? 'active' : ''}`} onClick={() => { setPage(pageNum); window.scrollTo(0,0); }}>{pageNum}</button>
                   );
                })}
                <button className="hrmis-page-btn" disabled={page === totalPages || totalPages === 0 || loading} onClick={() => { setPage(p => p + 1); window.scrollTo(0,0); }}>Next ›</button>
                <button className="hrmis-page-btn" disabled={page === totalPages || totalPages === 0 || loading} onClick={() => { setPage(totalPages); window.scrollTo(0,0); }}>»</button>
             </div>
          </div>
        </div>
    </div>
  );
}
