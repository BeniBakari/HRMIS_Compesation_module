import { useState, useEffect } from 'react';
import { formulasApi } from '../services/api';
import "./CaseList.css";
import "./CaseSubmission.css";
import { Calculator, Plus, X, Save, Trash2, Edit3, Search, ChevronDown, Info } from 'lucide-react';

const EMPTY_FORM = {
  name: '', incident_type: 'INJURY', severity_class: 'MINOR', base_amount: '', multiplier: '1.0',
  effective_from: '', effective_to: '',
};

export default function FormulaManagement() {
  const [formulas, setFormulas] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [saving,   setSaving]   = useState(false);
  const [formErr,  setFormErr]  = useState('');

  // Pagination State
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  const load = () => {
    setLoading(true);
    formulasApi.list()
      .then(data => setFormulas(Array.isArray(data) ? data : (data.results || [])))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(EMPTY_FORM); setEditing(null); setFormErr(''); setShowForm(true); };
  const openEdit = (f) => {
    setForm({
      name: f.name || '', incident_type: f.incident_type || 'INJURY',
      severity_class: f.severity_class || 'MINOR', base_amount: f.base_amount || '',
      multiplier: f.multiplier || '1.0', effective_from: f.effective_from || '',
      effective_to: f.effective_to || '',
    });
    setEditing(f.id); setFormErr(''); setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this formula?')) return;
    try { await formulasApi.remove(id); load(); }
    catch (err) { setError(err.message); }
  };

  const handleSave = async () => {
    if (!form.name.trim()) return setFormErr('Name is required.');
    if (!form.base_amount) return setFormErr('Base amount is required.');
    setSaving(true); setFormErr('');
    try {
      const payload = { ...form, base_amount: Number(form.base_amount), multiplier: Number(form.multiplier), effective_to: form.effective_to || null };
      if (editing) await formulasApi.update(editing, payload);
      else await formulasApi.create(payload);
      setShowForm(false); load();
    } catch (err) { setFormErr(err.message); }
    finally { setSaving(false); }
  };

  const total = formulas.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const displayedFormulas = formulas.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="template-container">
      <div className="page-header">
        <div className="header-content">
          <h1>FORMULA MANAGEMENT</h1>
          <p className="page-subtitle">Configure compensation calculation parameters</p>
        </div>
        <div className="page-actions">
           {!showForm && (
             <button className="btn btn-primary" onClick={openCreate}>
               <Plus size={16} /> ADD FORMULA
             </button>
           )}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {showForm && (
        <div className="staff-registration" style={{ padding: 0, marginBottom: '25px', background: 'white', borderRadius: '12px', boxShadow: 'var(--neu-shadow-raised)' }}>
          <div className="section" style={{ padding: '25px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '25px', alignItems: 'center' }}>
               <h3 className="section-title">{editing ? 'EDIT FORMULA' : 'NEW CALCULATION FORMULA'}</h3>
               <button className="btn-icon-primary" onClick={() => setShowForm(false)} style={{ border: 'none', background: 'transparent' }}><X size={20} /></button>
            </div>
            {formErr && <div className="alert alert-error">{formErr}</div>}
            
            <div className="form-group">
               <label className="required">FORMULA NAME</label>
               <input className="form-control" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Injury Basic 2024" />
            </div>

            <div className="row three-columns">
               <div className="form-group">
                  <label>INCIDENT TYPE</label>
                  <div className="select-wrapper">
                    <select className="form-control" value={form.incident_type} onChange={e => setForm({...form, incident_type: e.target.value})}>
                       <option value="INJURY">Injury</option>
                       <option value="DEATH">Death</option>
                       <option value="BOTH">Both</option>
                    </select>
                    <ChevronDown size={14} className="select-arrow" />
                  </div>
               </div>
               <div className="form-group">
                  <label>SEVERITY CLASS</label>
                  <div className="select-wrapper">
                    <select className="form-control" value={form.severity_class} onChange={e => setForm({...form, severity_class: e.target.value})}>
                       <option value="MINOR">Minor</option>
                       <option value="MODERATE">Moderate</option>
                       <option value="SEVERE">Severe</option>
                       <option value="CRITICAL">Critical</option>
                       <option value="PERMANENT">Permanent</option>
                       <option value="FATAL">Fatal</option>
                    </select>
                    <ChevronDown size={14} className="select-arrow" />
                  </div>
               </div>
               <div className="form-group">
                  <label className="required">BASE AMOUNT (TZS)</label>
                  <input type="number" className="form-control" value={form.base_amount} onChange={e => setForm({...form, base_amount: e.target.value})} />
               </div>
            </div>

            <div className="row three-columns">
               <div className="form-group">
                  <label>MULTIPLIER</label>
                  <input type="number" step="0.1" className="form-control" value={form.multiplier} onChange={e => setForm({...form, multiplier: e.target.value})} />
               </div>
               <div className="form-group">
                  <label className="required">EFFECTIVE FROM</label>
                  <input type="date" className="form-control" value={form.effective_from} onChange={e => setForm({...form, effective_from: e.target.value})} />
               </div>
               <div className="form-group">
                  <label>EFFECTIVE TO</label>
                  <input type="date" className="form-control" value={form.effective_to} onChange={e => setForm({...form, effective_to: e.target.value})} />
               </div>
            </div>

            <div style={{ padding: '15px', background: 'rgba(28, 35, 109, 0.05)', borderRadius: '12px', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
               <Info size={16} color="#1c236d" /> 
               <span>Max Possible Amount: <strong>{((Number(form.base_amount)||0) * (Number(form.multiplier)||1)).toLocaleString()} TZS</strong></span>
            </div>

            <div style={{ marginTop: '30px', display: 'flex', gap: '15px' }}>
               <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave} disabled={saving}>
                  {saving ? <i className="fas fa-spinner fa-spin"></i> : <Save size={18} style={{marginRight: '8px'}} />} SAVE FORMULA
               </button>
               <button className="btn btn-outline" style={{ flex: 0.3 }} onClick={() => setShowForm(false)}>CANCEL</button>
            </div>
          </div>
        </div>
      )}

      <div className="results-card">
        <div className="table-container">
          <table className="staff-table">
            <thead>
              <tr>
                <th style={{ width: '50px', textAlign: 'right' }}>#</th>
                <th>NAME / CLASS</th>
                <th style={{ textAlign: 'center' }}>TYPE</th>
                <th style={{ textAlign: 'right' }}>BASE AMOUNT</th>
                <th style={{ textAlign: 'center' }}>MULT.</th>
                <th>EFFECTIVE PERIOD</th>
                <th style={{ textAlign: 'center', width: '100px' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="no-hover"><td colSpan={7} style={{ textAlign: 'center', padding: '60px' }}><div className="loading-state"><div className="spinner"></div><p>Loading formulas...</p></div></td></tr>
              ) : displayedFormulas.length === 0 ? (
                <tr className="no-hover"><td colSpan={7} style={{ textAlign: 'center', padding: '60px' }}><div className="no-data"><div className="no-data-content"><Calculator size={48}/><p>No formulas defined.</p></div></div></td></tr>
              ) : (
                displayedFormulas.map((f, i) => (
                  <tr key={f.id}>
                    <td style={{ textAlign: 'right', opacity: 0.5, fontWeight: 'normal', whiteSpace: 'nowrap', paddingRight: '12px' }}>{(page - 1) * PAGE_SIZE + i + 1}.</td>
                    <td>
                       <div className="staff-info">
                          <strong style={{ fontSize: '14px' }}>{f.name}</strong>
                          <small style={{ color: '#64748b' }}>{f.severity_class}</small>
                       </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge ${f.incident_type === 'DEATH' ? 'badge-danger' : f.incident_type === 'BOTH' ? 'badge-info' : 'badge-warning'}`} style={{ fontSize: '10px' }}>
                        {f.incident_type}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 500, color: '#1c236d', fontSize: '14px' }}>
                      {Number(f.base_amount).toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 500 }}>{f.multiplier}x</td>
                    <td>
                       <div className="staff-info">
                          <strong>{f.effective_from}</strong>
                          <small>{f.effective_to ? `to ${f.effective_to}` : '(Current)'}</small>
                       </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div className="action-buttons" style={{ justifyContent: 'center', gap: '8px' }}>
                        <button className="btn btn-xs btn-outline-primary" onClick={() => openEdit(f)} title="Edit" style={{ padding: '4px' }}><Edit3 size={14} /></button>
                        <button className="btn btn-xs btn-outline-danger" onClick={() => handleDelete(f.id)} title="Delete" style={{ padding: '4px' }}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
