import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { notifApi } from '../services/api';
import "./CaseList.css";

export default function Notifications() {
  const navigate  = useNavigate();
  const [notifs,   setNotifs]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [marking,  setMarking]  = useState(false);

  const load = () => {
    setLoading(true);
    notifApi.list()
      .then(data => setNotifs(Array.isArray(data) ? data : (data.results || [])))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const markOne = async (id) => {
    await notifApi.markRead(id).catch(() => {});
    setNotifs(ns => ns.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAll = async () => {
    setMarking(true);
    await notifApi.markAllRead().catch(() => {});
    setNotifs(ns => ns.map(n => ({ ...n, is_read: true })));
    setMarking(false);
  };

  const handleClick = (n) => {
    if (!n.is_read) markOne(n.id);
    if (n.corresponding_case?.case_id) navigate(`/cases/${n.corresponding_case.case_id}`);
  };

  const unread = notifs.filter(n => !n.is_read).length;

  return (
    <div className="staff-list-template-container">
      <div className="page-header" style={{ marginBottom: '30px' }}>
        <div className="header-content">
          <h1 className="page-title"><i className="fas fa-bell"></i> NOTIFICATIONS</h1>
          <p className="page-subtitle">{unread > 0 ? `${unread} unread messages` : 'No new notifications'}</p>
        </div>
        {unread > 0 && (
          <button className="btn-primary" onClick={markAll} disabled={marking}>
            {marking ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check-double"></i>} MARK ALL AS READ
          </button>
        )}
      </div>

      {error && <div className="alert alert-danger" style={{ marginBottom: '20px' }}>{error}</div>}

      <div className="staff-table-card">
         {loading ? (
            <div style={{ textAlign: 'center', padding: '100px' }}><div className="spinner spinner-lg"></div></div>
         ) : notifs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '100px' }}>
               <i className="fas fa-bell-slash" style={{ fontSize: '60px', opacity: 0.1, marginBottom: '20px', display: 'block' }}></i>
               <div className="empty-state">No notifications to show.</div>
            </div>
         ) : (
            <div className="notifications-list" style={{ padding: '10px' }}>
               {notifs.map(n => (
                  <div
                     key={n.id}
                     className={`notif-card ${!n.is_read ? 'unread' : ''}`}
                     onClick={() => handleClick(n)}
                     style={{
                        padding: '20px',
                        marginBottom: '15px',
                        borderRadius: '15px',
                        background: n.is_read ? '#e0e5ec' : '#f0f2f5',
                        boxShadow: n.is_read ? 'inset 3px 3px 6px rgba(163, 177, 198, 0.4)' : '5px 5px 10px rgba(163, 177, 198, 0.5), -5px -5px 10px rgba(255, 255, 255, 0.5)',
                        cursor: 'pointer',
                        display: 'flex',
                        gap: '20px',
                        alignItems: 'center',
                        transition: 'all 0.2s ease',
                        opacity: n.is_read ? 0.8 : 1
                     }}
                  >
                     <div style={{
                        width: '45px', height: '45px', borderRadius: '12px',
                        background: n.is_read ? '#e0e5ec' : 'var(--neu-primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: n.is_read ? '#1c236d' : 'white',
                        boxShadow: 'var(--neu-shadow-small)'
                     }}>
                        <i className={`fas ${n.is_read ? 'fa-envelope-open' : 'fa-envelope'}`}></i>
                     </div>
                     <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: n.is_read ? 'normal' : 'bold', color: '#1c236d', fontSize: '15px' }}>{n.message}</div>
                        <div style={{ display: 'flex', gap: '15px', marginTop: '8px', fontSize: '12px', opacity: 0.6 }}>
                           <span><i className="fas fa-clock"></i> {new Date(n.created_at).toLocaleString()}</span>
                           {n.corresponding_case?.case_id && <span><i className="fas fa-folder"></i> {n.corresponding_case.case_id}</span>}
                        </div>
                     </div>
                     {!n.is_read && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#dc3545', boxShadow: '0 0 10px rgba(220, 53, 69, 0.5)' }}></div>}
                  </div>
               ))}
            </div>
         )}
      </div>
    </div>
  );
}
