import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { casesApi } from '../services/api';
import { usePermissions } from '../hooks/usePermissions';
import { Briefcase, Plus, RefreshCw, Search, Filter, Tags, Table, Eye, ChevronLeft, ChevronRight, FileText, User, ChevronDown } from 'lucide-react';
import './CaseList.css';

const STATUS_OPTIONS = [
    { value: '', label: 'All Statuses' },
    { value: 'SUBMITTED', label: 'Submitted' },
    { value: 'UNDER_REVIEW', label: 'Under Review' },
    { value: 'VERIFIED', label: 'Verified' },
    { value: 'COMMITTEE_ASSIGNED', label: 'Committee Assigned' },
    { value: 'ASSESSED', label: 'Assessed' },
    { value: 'PAID', label: 'Paid' },
    { value: 'REJECTED', label: 'Rejected' },
];

const TYPE_OPTIONS = [
    { value: '', label: 'All Types' },
    { value: 'INJURY', label: 'Injury' },
    { value: 'DEATH', label: 'Death' },
];

const PAGE_SIZE = 15;

export default function CaseList() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const perms = usePermissions();
    const tableContainerRef = useRef(null);

    const [cases, setCases] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState(searchParams.get('q') || '');
    const [status, setStatus] = useState(searchParams.get('status') || '');
    const [caseType, setCaseType] = useState(searchParams.get('type') || '');

    const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

    const loadCases = useCallback(() => {
        setLoading(true);
        setError('');
        const params = { page, page_size: PAGE_SIZE };
        if (search.trim()) params.search = search.trim();
        if (status) params.status = status;
        if (caseType) params.case_type = caseType;

        casesApi.list(params)
            .then(data => {
                if (Array.isArray(data)) {
                    setCases(data);
                    setTotal(data.length);
                } else {
                    setCases(data.results || []);
                    setTotal(data.count || 0);
                }
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [page, search, status, caseType]);

    useEffect(() => { loadCases(); }, [loadCases]);

    useEffect(() => { setPage(1); }, [search, status, caseType]);

    const handleSearchKey = (e) => {
        if (e.key === 'Enter') loadCases();
    };

    const getStatusBadgeClass = (s) => {
        const map = {
            PAID: 'success',
            REJECTED: 'danger',
            UNDER_REVIEW: 'primary',
            SUBMITTED: 'secondary',
            VERIFIED: 'info',
            ASSESSED: 'warning'
        };
        return `badge-${map[s] || 'secondary'}`;
    };

    return (
        <div className="template-container">
            <div className="page-header">
                <div className="header-content">
                    <h1>CASES</h1>
                    <p className="page-subtitle">{total.toLocaleString()} case{total !== 1 ? 's' : ''} recorded in the compensation registry</p>
                </div>
                <div className="page-actions">
                    <button className="btn btn-outline" onClick={loadCases} title="Refresh System View">
                        <RefreshCw size={16} style={{ marginRight: '8px' }} /> Refresh
                    </button>
                    {perms.canSubmitCases && (
                        <button className="btn btn-primary" onClick={() => navigate('/cases/new')}>
                            <Plus size={16} style={{ marginRight: '8px' }} /> Submit New Case
                        </button>
                    )}
                </div>
            </div>

            {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>}

            {/* Filters Card */}
            <div className="filters-card">
                <div className="filters-row">
                    <div className="filter-group">
                        <label>SEARCH REGISTRY</label>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="ID, Victim name, Force Number..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onKeyDown={handleSearchKey}
                        />
                    </div>
                    <div className="filter-group">
                        <label>STATUS FILTER</label>
                        <div className="select-wrapper">
                            <select className="form-control" value={status} onChange={e => setStatus(e.target.value)}>
                                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                            <ChevronDown size={14} className="select-arrow" />
                        </div>
                    </div>
                    <div className="filter-group">
                        <label>INCIDENT TYPE</label>
                        <div className="select-wrapper">
                            <select className="form-control" value={caseType} onChange={e => setCaseType(e.target.value)}>
                                {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                            <ChevronDown size={14} className="select-arrow" />
                        </div>
                    </div>
                    <div className="filter-actions" style={{ display: 'flex', alignItems: 'center' }}>
                        <button className="btn btn-primary" onClick={loadCases} style={{ minWidth: '120px' }}>FILTER</button>
                    </div>
                </div>
            </div>

            {/* Results Card */}
            <div className="results-card">

                <div className="table-container" ref={tableContainerRef}>
                    <table className="staff-table">
                        <thead>
                            <tr>
                                <th style={{ width: '50px', textAlign: 'right' }}>#</th>
                                <th>CASE ID</th>
                                <th>VICTIM IDENTIFICATION</th>
                                <th>TYPE</th>
                                <th>STATUS</th>
                                <th>SUBMISSION DATE</th>
                                <th>OFFICER IN CHARGE</th>
                                <th style={{ textAlign: 'center' }}>ACTION</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr className="no-hover">
                                    <td colSpan="8">
                                        <div className="loading-state">
                                            <div className="spinner"></div>
                                            <p>Retrieving registry records...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : cases.length === 0 ? (
                                <tr className="no-hover">
                                    <td colSpan="8">
                                        <div className="no-data">
                                            <div className="no-data-content" style={{ padding: '80px 0' }}>
                                                <Briefcase size={48} style={{ opacity: 0.2, marginBottom: '15px' }} />
                                                <p>No compensation cases found matching your criteria</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                cases.map((c, i) => (
                                    <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/cases/${c.case_id}`)}>
                                        <td style={{ textAlign: 'right', opacity: 0.5, fontWeight: 'normal', whiteSpace: 'nowrap', paddingRight: '12px' }}>{(page - 1) * PAGE_SIZE + i + 1}.</td>
                                        <td style={{ fontWeight: 500, color: '#1c236d' }}>{c.case_id}</td>
                                        <td>
                                            <div className="staff-info">
                                                <strong>{c.soldier_full_name}</strong>
                                                <small>{c.soldier_force_number || 'No Force Number'}</small>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${c.incident_type === 'DEATH' ? 'badge-danger' : 'badge-warning'}`}>
                                                {c.incident_type}
                                            </span>
                                        </td>
                                        <td style={{ verticalAlign: 'center' }}>
                                            <span className={`badge ${getStatusBadgeClass(c.status)}`} style={{ minWidth: '100px' }}>
                                                {c.status?.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="staff-info">
                                                <strong>{c.submitted_at ? new Date(c.submitted_at).toLocaleDateString() : '—'}</strong>
                                                <small>{c.submitted_at ? new Date(c.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</small>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="staff-info">
                                                <strong>{c.submitted_by_display || 'System User'}</strong>
                                                <small>Registered Officer</small>
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <button className="btn btn-xs btn-outline-primary" onClick={(e) => { e.stopPropagation(); navigate(`/cases/${c.case_id}`); }}>
                                                <Eye size={12} style={{ marginRight: '4px' }} /> Details
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination — always visible */}
                <div className="hrmis-pagination">
                    <div className="hrmis-pagination-info">
                        {loading ? 'Loading...' : `Showing ${total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total} records`}
                    </div>
                    <div className="hrmis-pagination-controls">
                        <button
                            className="hrmis-page-btn"
                            disabled={page === 1 || loading}
                            onClick={() => { setPage(1); window.scrollTo(0, 0); }}
                            title="First Page"
                        >«</button>
                        <button
                            className="hrmis-page-btn"
                            disabled={page === 1 || loading}
                            onClick={() => { setPage(p => p - 1); window.scrollTo(0, 0); }}
                        >‹ Prev</button>

                        {/* Page number buttons */}
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                                pageNum = i + 1;
                            } else if (page <= 3) {
                                pageNum = i + 1;
                            } else if (page >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                            } else {
                                pageNum = page - 2 + i;
                            }
                            return (
                                <button
                                    key={pageNum}
                                    className={`hrmis-page-btn ${pageNum === page ? 'active' : ''}`}
                                    onClick={() => { setPage(pageNum); window.scrollTo(0, 0); }}
                                    disabled={loading}
                                >{pageNum}</button>
                            );
                        })}

                        <button
                            className="hrmis-page-btn"
                            disabled={page === totalPages || loading}
                            onClick={() => { setPage(p => p + 1); window.scrollTo(0, 0); }}
                        >Next ›</button>
                        <button
                            className="hrmis-page-btn"
                            disabled={page === totalPages || loading}
                            onClick={() => { setPage(totalPages); window.scrollTo(0, 0); }}
                            title="Last Page"
                        >»</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
