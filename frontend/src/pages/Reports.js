import { useState, useEffect } from 'react';
import { casesApi } from '../services/api';
import { BarChart3, PieChart, Activity, Folder, RefreshCw, AlertCircle, FileText, Download, TrendingUp, UserCheck, Skull, HeartPulse, ChevronDown } from 'lucide-react';
import "./CaseList.css";

export default function Reports() {
  const [cases,   setCases]   = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination State
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  const load = () => {
    setLoading(true);
    casesApi.list({ page_size: 500 })
      .then(data => setCases(Array.isArray(data) ? data : (data.results || [])))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const total    = cases.length;
  const injury   = cases.filter(c => c.incident_type === 'INJURY').length;
  const death    = cases.filter(c => c.incident_type === 'DEATH').length;
  const paid     = cases.filter(c => c.status === 'PAID').length;
  const rejected = cases.filter(c => c.status === 'REJECTED').length;
  const active   = cases.filter(c => !['PAID','REJECTED'].includes(c.status)).length;

  const STATUS_LABELS = {
    'SUBMITTED': 'Submitted',
    'UNDER_REVIEW': 'Under Review',
    'VERIFIED': 'Verified',
    'COMMITTEE_ASSIGNED': 'Comm. Assigned',
    'ASSESSED': 'Assessed',
    'PAID': 'Paid',
    'REJECTED': 'Rejected'
  };

  const byStatus = Object.keys(STATUS_LABELS).map(s => ({
    status: s,
    label: STATUS_LABELS[s],
    count: cases.filter(c => c.status === s).length
  }));

  const totalRecords = byStatus.length;
  const totalPages = Math.ceil(totalRecords / PAGE_SIZE);
  const displayedStatus = byStatus.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="template-container">
      <div className="page-header">
        <div className="header-content">
          <h1>REPORTS & ANALYTICS</h1>
          <p className="page-subtitle">Comprehensive metrics and status distribution for case management</p>
        </div>
        <div className="page-actions">
           <button className="btn btn-outline" onClick={load} title="Refresh Analytics">
              <RefreshCw size={16} className={loading?'spinner':''} style={{marginRight: '8px'}} /> Refresh Data
           </button>
           <button className="btn btn-primary" onClick={() => window.print()}>
              <Download size={16} style={{marginRight: '8px'}} /> Export PDF
           </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="staff-stats-grid" style={{ marginBottom: '12px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        <div className="results-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
           <div style={{ background: '#f1f5f9', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1c236d' }}>
              <Folder size={24} />
           </div>
           <div>
              <div style={{ fontSize: '11px', fontWeight: 500, color: '#94a3b8', letterSpacing: '0.5px' }}>TOTAL REGISTRY</div>
              <div style={{ fontSize: '24px', fontWeight: 500, color: '#1c236d' }}>{total}</div>
           </div>
        </div>
        <div className="results-card" style={{ padding: '15px', display: 'flex', alignItems: 'center', gap: '12px' }}>
           <div style={{ background: '#f1f5f9', width: '44px', height: '44px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1c236d', flexShrink: 0 }}>
              <Activity size={24} />
           </div>
           <div>
              <div style={{ fontSize: '11px', fontWeight: 500, color: '#94a3b8', letterSpacing: '0.5px' }}>ACTIVE PIPELINE</div>
              <div style={{ fontSize: '24px', fontWeight: 500, color: '#1c236d' }}>{active}</div>
           </div>
        </div>
        <div className="results-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
           <div style={{ background: '#fff7ed', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ea580c' }}>
              <HeartPulse size={24} />
           </div>
           <div>
              <div style={{ fontSize: '11px', fontWeight: 500, color: '#94a3b8', letterSpacing: '0.5px' }}>INJURY CLAIMS</div>
              <div style={{ fontSize: '24px', fontWeight: 500, color: '#1c236d' }}>{injury}</div>
           </div>
        </div>
        <div className="results-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
           <div style={{ background: '#fef2f2', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
              <Skull size={24} />
           </div>
           <div>
              <div style={{ fontSize: '11px', fontWeight: 500, color: '#94a3b8', letterSpacing: '0.5px' }}>FATALITY CLAIMS</div>
              <div style={{ fontSize: '24px', fontWeight: 500, color: '#1c236d' }}>{death}</div>
           </div>
        </div>
      </div>

      <div className="results-card">
        <div className="table-container">
          <table className="staff-table">
            <thead>
              <tr>
                <th style={{ width: '50px', textAlign: 'right' }}>#</th>
                <th>WORKFLOW STATUS</th>
                <th style={{ textAlign: 'center' }}>RECORD COUNT</th>
                <th style={{ textAlign: 'center' }}>DISTRIBUTION</th>
                <th>PROGRESSION VISUALIZATION</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="no-hover"><td colSpan={5} style={{ textAlign: 'center', padding: '60px' }}><div className="loading-state"><div className="spinner"></div><p>Calculating analytics...</p></div></td></tr>
              ) : displayedStatus.map((row, i) => (
                <tr key={row.status}>
                  <td style={{ textAlign: 'right', opacity: 0.5, fontWeight: 'normal', whiteSpace: 'nowrap', paddingRight: '12px' }}>{(page - 1) * PAGE_SIZE + i + 1}.</td>
                  <td style={{ fontWeight: 500, color: '#1c236d' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--neu-primary)', opacity: 0.3 }}></div>
                        {row.label}
                     </div>
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 500, fontSize: '16px' }}>{row.count}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="badge badge-secondary" style={{ minWidth: '60px' }}>
                       {total ? `${((row.count/total)*100).toFixed(1)}%` : '0%'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <div className="progress-container-neu" style={{ flex: 1, height: '10px', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden', position: 'relative', boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.05)' }}>
                        <div
                          style={{ 
                             width: total ? `${(row.count/total)*100}%` : '0%',
                             background: 'var(--neu-primary)',
                             height: '100%',
                             transition: 'width 1s ease-out',
                             boxShadow: '2px 0 5px rgba(28, 35, 109, 0.2)'
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 500, width: '35px', textAlign: 'right' }}>{total ? Math.round((row.count/total)*100) : 0}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="hrmis-pagination">
          <div className="hrmis-pagination-info">
             {loading ? 'Loading...' : `Showing ${totalRecords === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, totalRecords)} of ${totalRecords} records`}
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
      <style dangerouslySetInnerHTML={{__html: `
        .spinner { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @media print {
           .page-actions { display: none !important; }
           .template-container { background: white !important; padding: 0 !important; }
           .results-card { box-shadow: none !important; border: 1px solid #e2e8f0 !important; }
        }
      `}} />
    </div>
  );
}
