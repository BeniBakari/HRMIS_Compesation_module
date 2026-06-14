import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { casesApi } from '../services/api';
import { usePermissions } from '../hooks/usePermissions';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

const STATUS_META = {
    SUBMITTED: { label: 'Submitted', color: '#1c236d' },
    UNDER_REVIEW: { label: 'Under Review', color: '#1c236d' },
    VERIFIED: { label: 'Verified', color: '#1c236d' },
    CO_APPROVED: { label: 'CO Approved', color: '#1c236d' },
    SO_REVIEWED: { label: 'SO Reviewed', color: '#1c236d' },
    PENDING_CP_ADMINISTRATION: { label: 'Pending CP-HRM', color: '#1c236d' },
    COMMITTEE_ASSIGNED: { label: 'Committee Assigned', color: '#1c236d' },
    ASSESSED: { label: 'Assessed', color: '#fd7e14' },
    PAID: { label: 'Paid', color: '#198754' },
    REJECTED: { label: 'Rejected', color: '#dc3545' },
    RETURNED: { label: 'Returned', color: '#6c757d' },
    INCOMPLETE: { label: 'Incomplete', color: '#6c757d' },
};

export default function Dashboard() {
    const { user } = useAuth();
    const perms = usePermissions();
    const navigate = useNavigate();

    const [cases, setCases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        casesApi.list({ page_size: 200 })
            .then(data => setCases(Array.isArray(data) ? data : (data.results || [])))
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    const counts = Object.keys(STATUS_META).reduce((acc, s) => {
        acc[s] = cases.filter(c => c.status === s).length;
        return acc;
    }, {});

    const total = cases.length;
    const active = cases.filter(c => ['SUBMITTED', 'UNDER_REVIEW', 'VERIFIED', 'COMMITTEE_ASSIGNED', 'ASSESSED'].includes(c.status)).length;
    const injury = cases.filter(c => c.incident_type === 'INJURY').length;
    const death = cases.filter(c => c.incident_type === 'DEATH').length;

    const recent = [...cases]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 6);

    const StatCard = ({ title, value, iconClass, link, subtitle }) => {
        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
        return (
            <Link to={link || '#'} className="neu-card">
                <div className="neu-card-header">
                    <div className="neu-icon-circle">
                        <i className={iconClass}></i>
                    </div>
                </div>
                <div className="neu-card-body">
                    {loading ? (
                        <div className="neu-skeleton"></div>
                    ) : (
                        <div className="neu-value-wrapper">
                            <h3 className="neu-value">{value.toLocaleString()}</h3>
                        </div>
                    )}
                    <p className="neu-title">{title}</p>
                    {subtitle && <span className="neu-subtitle">{subtitle}</span>}
                    <div className="neu-percentage-container">
                        <div className="neu-percentage-label">
                            <span className="neu-percentage-text">Percentage</span>
                            <span className="neu-percentage-value">{percentage}%</span>
                        </div>
                        <div className="neu-percentage-bar">
                            <div className="neu-percentage-fill" style={{ width: `${percentage}%` }}></div>
                        </div>
                    </div>
                </div>
            </Link>
        );
    };

    const QuickAction = ({ title, description, iconClass, onClick }) => {
        return (
            <div className="neu-quick-action" onClick={onClick} role="button" tabIndex={0}>
                <div className="neu-quick-action-icon">
                    <i className={iconClass}></i>
                </div>
                <div className="neu-quick-action-body">
                    <span className="neu-quick-action-title">{title}</span>
                    <span className="neu-quick-action-desc">{description}</span>
                </div>
                <div className="neu-quick-action-arrow">
                    <i className="fas fa-chevron-right"></i>
                </div>
            </div>
        );
    };

    const renderStatusPanel = () => {
        return (
            <div className="neu-panel panel-animate" style={{ animationDelay: '0.1s' }}>
                <div className="neu-panel-header">
                    <span>Cases by Status</span>
                </div>
                <div className="neu-status-list">
                    {Object.entries(STATUS_META).map(([key, meta], index) => {
                        const count = counts[key] || 0;
                        const percentage = total > 0 ? (count / total) * 100 : 0;
                        return (
                            <div key={key} className="neu-status-row status-animate" style={{ animationDelay: `${index * 0.1}s`, cursor: 'pointer' }} onClick={() => navigate(`/cases?status=${key}`)}>
                                <div className="neu-status-left">
                                    <span className="neu-status-name" style={{ color: meta.color }}>{meta.label}</span>
                                    <span className="neu-status-count">{count.toLocaleString()}</span>
                                </div>
                                <div className="neu-progress-outer">
                                    <div className="neu-progress-inner">
                                        <div className="neu-progress-bar animated-progress" style={{ width: `${percentage}%`, background: meta.color, animationDelay: `${index * 0.1}s` }}></div>
                                    </div>
                                    <span className="neu-progress-text">{percentage.toFixed(0)}%</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
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

    const renderRecentCasesPanel = () => {
        return (
            <div className="neu-commands commands-animate" style={{ flex: 1, height: '100%', minHeight: '350px' }}>
                <div className="neu-commands-header">
                    <div className="neu-commands-title">
                        <span>Recent Cases</span>
                    </div>
                    <div className="neu-search-box" style={{ cursor: 'pointer' }} onClick={() => navigate('/cases')}>
                        <span style={{ fontSize: '0.9rem', color: '#1c236d', fontWeight: 500 }}>View All</span>
                    </div>
                </div>
                {recent.length === 0 ? (
                    <div className="neu-empty">
                        <i className="fas fa-inbox"></i>
                        <p>No cases yet</p>
                    </div>
                ) : (
                    <div className="neu-commands-body" style={{ padding: '0 20px', paddingBottom: '20px' }}>
                        {recent.map((c, index) => {
                            const meta = STATUS_META[c.status] || { label: c.status?.replace(/_/g, ' ') };
                            return (
                                <div key={c.id} className="neu-command-row command-animate" style={{ animationDelay: `${index * 0.05}s`, cursor: 'pointer', marginBottom: '10px' }} onClick={() => navigate(`/cases/${c.case_id}`)}>
                                    <div className="neu-cmd-name" style={{ flex: 2, fontWeight: 500 }}>{c.case_id}</div>
                                    <div className="neu-cmd-name" style={{ flex: 3 }}>{c.soldier_full_name}</div>
                                    <div className="neu-cmd-count" style={{ flex: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                        <span className={`badge ${getStatusBadgeClass(c.status)}`}>{meta.label || c.status}</span>
                                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '6px', fontWeight: 500 }}>{c.incident_type}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="page-center">
                <div className="spinner spinner-lg"></div>
            </div>
        );
    }

    return (
        <div className="dashboard-container" style={{ paddingBottom: '40px' }}>
            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="dashboard-header-modern" style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '1.8rem', color: '#1c236d', fontWeight: 500, marginBottom: '5px' }}>Dashboard</h1>
                    <p style={{ color: '#64748b' }}>
                        Welcome back, <strong style={{ color: '#1c236d' }}>{user?.full_name}</strong> — {user?.rank}
                    </p>
                </div>
                {perms.canSubmitCases && (
                    <button className="neu-nav-btn primary" style={{ width: 'auto', padding: '0 20px', background: 'linear-gradient(135deg, #1c236d 0%, #2a3486 100%)', color: 'white', borderRadius: '10px' }} onClick={() => navigate('/cases/new')}>
                        <i className="fas fa-file-medical" style={{ marginRight: '8px' }}></i> New Case
                    </button>
                )}
            </div>

            {error && <div style={{ padding: '15px', background: '#fee2e2', color: '#dc2626', borderRadius: '10px', marginBottom: '20px', border: '1px solid #f87171' }}>{error}</div>}

            {/* ── Summary Cards ──────────────────────────────────────────── */}
            <div className="neu-stats-grid neu-stats-4" style={{ marginBottom: '30px' }}>
                <StatCard title="Total Cases" value={total} iconClass="fas fa-folder" link="/cases" subtitle="All Cases" />
                <StatCard title="Active Cases" value={active} iconClass="fas fa-chart-line" link="/cases?status=active" subtitle="Currently Active" />
                <StatCard title="Injury Cases" value={injury} iconClass="fas fa-user-injured" link="/cases?type=INJURY" subtitle="Injury Claims" />
                <StatCard title="Death Cases" value={death} iconClass="fas fa-cross" link="/cases?type=DEATH" subtitle="Death Claims" />
            </div>

            {/* ── Quick Actions ──────────────────────────────────────────── */}
            <div className="neu-quick-actions-grid" style={{ marginBottom: '30px' }}>
                {perms.canSubmitCases && (
                    <QuickAction title="Submit New Case" description="File an injury or death case" iconClass="fas fa-file-medical" onClick={() => navigate('/cases/new')} />
                )}
                {(perms.canViewAllCases || perms.canSubmitCases) && (
                    <QuickAction title="Browse Cases" description="View and manage all cases" iconClass="fas fa-folder-open" onClick={() => navigate('/cases')} />
                )}
                {perms.canSubmitAssessment && (
                    <QuickAction title="My Assignments" description="Cases assigned for assessment" iconClass="fas fa-clipboard-check" onClick={() => navigate('/cases/assigned')} />
                )}
                {perms.canViewReports && (
                    <QuickAction title="Reports" description="Compensation statistics" iconClass="fas fa-chart-line" onClick={() => navigate('/reports')} />
                )}
                {perms.canManageFormulas && (
                    <QuickAction title="Formulas" description="Manage calculation formulas" iconClass="fas fa-calculator" onClick={() => navigate('/formulas')} />
                )}
            </div>

            {/* ── Bottom Panels ──────────────────────────────────────────── */}
            <div className="neu-panels-grid neu-panels-2">
                {renderRecentCasesPanel()}
                {renderStatusPanel()}
            </div>
        </div>
    );
}
