import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { casesApi, authApi } from '../services/api';
import { User, AlertCircle, FileUp, CheckCircle2, Search, ChevronRight, ChevronLeft, ChevronDown, Calendar, MapPin, Tag, Type, Loader2, X, FileText, Check, Upload } from 'lucide-react';
import "./CaseSubmission.css";

const STEPS = [
  { label: 'OFFICER INFO', icon: <User size={18} /> },
  { label: 'INCIDENT', icon: <AlertCircle size={18} /> },
  { label: 'DOCUMENTS', icon: <FileUp size={18} /> },
  { label: 'REVIEW', icon: <CheckCircle2 size={18} /> }
];

const CASE_TYPES = [
  { value: 'INJURY', label: 'Injury' },
  { value: 'DEATH', label: 'Death' },
];

const INCIDENT_TYPES = [
  'Gunshot wound',
  'IED/explosion',
  'Road accident (on duty)',
  'Physical assault',
  'Other (on-duty)',
];

const DOCUMENT_TYPES = [
  { key: 'MEDICAL_REPORT', label: 'Medical Report', required: true },
  { key: 'OB_EXTRACT', label: 'Police / OB Report', required: true },
  { key: 'NATIONAL_ID', label: 'National ID / Force ID', required: true },
  { key: 'DEATH_CERTIFICATE', label: 'Death Certificate', required: false },
  { key: 'PF3', label: 'Commanding Officer Letter', required: false },
];


const INITIAL_SOLDIER = { force_number: '', victim_name: '', rank: '', district: '' };
const INITIAL_INCIDENT = { case_type: 'INJURY', incident_date: '', incident_time: '', incident_location: '', incident_type: '', description: '', injury_description: '' };

export default function CaseSubmission() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [soldier, setSoldier] = useState(INITIAL_SOLDIER);
  const [incident, setIncident] = useState(INITIAL_INCIDENT);
  const [files, setFiles] = useState({});
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [previewDoc, setPreviewDoc] = useState(null); // { name, base64, type, raw }
  const [previewUrl, setPreviewUrl] = useState(null);

  const handleLookup = async () => {
    if (!lookupQuery.trim()) return;
    setLookupLoading(true); setLookupError('');
    try {
      const data = await authApi.lookupSoldier(lookupQuery.trim());
      setSoldier({
        force_number: data.info.force_number || '',
        victim_name: `${data.info.fname} ${data.info.mname} ${data.info.lname}`.trim() || '',
        rank: data.info.rank || '',
        district: data.info.districts || '',
      });
    } catch { setLookupError('Officer not found in HRM registry. Please enter details manually.'); }
    finally { setLookupLoading(false); }
  };

  const validateStep = () => {
    const e = {};
    if (step === 0) {
      if (!soldier.force_number.trim()) e.force_number = 'Required';
      if (!soldier.victim_name.trim()) e.victim_name = 'Required';
      if (!soldier.rank.trim()) e.rank = 'Required';
    }
    if (step === 1) {
      if (!incident.incident_date) e.incident_date = 'Required';
      if (!incident.incident_location.trim()) e.incident_location = 'Required';
      if (!incident.incident_type) e.incident_type = 'Required';
      if (!incident.description.trim()) e.description = 'Required';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => { if (validateStep()) setStep(s => s + 1); };

  const handleFileSelect = (key, file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return alert("File size must be < 10 MB");

    // Ensure we have a type, especially for PDFs if browser fails to detect
    let fileType = file.type;
    if (!fileType && file.name.toLowerCase().endsWith('.pdf')) {
      fileType = 'application/pdf';
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFiles(f => ({
        ...f,
        [key]: {
          name: file.name,
          base64: reader.result,
          size: file.size,
          type: fileType,
          raw: file
        }
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleOpenPreview = (fileData) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(fileData.raw);
    setPreviewUrl(url);
    setPreviewDoc(fileData);
  };

  const handleClosePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewDoc(null);
  };

  const handleSubmit = async () => {
    setSubmitting(true); setSubmitError('');
    try {
      const nature = [incident.incident_type, incident.description].filter(Boolean).join(': ');
      const payload = {
        incident_type: incident.case_type,
        soldier_force_number: soldier.force_number,
        soldier_full_name: soldier.victim_name,
        soldier_rank: soldier.rank,
        soldier_district: soldier.district,
        incident_date: incident.incident_date,
        incident_time: incident.incident_time || null,
        incident_location: incident.incident_location,
        nature_of_incident: nature,
        duty_context: incident.injury_description || '',
      };
      const created = await casesApi.submit(payload);
      for (const [type, f] of Object.entries(files)) {
        await casesApi.uploadDocument(created.case_id, { doc_type: type, file: f.base64, filename: f.name });
      }
      navigate(`/cases/${created.case_id}`, { state: { submitted: true } });
    } catch (err) { setSubmitError(err.message || 'Submission failed'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="template-container">
      <div style={{ maxWidth: '100%', margin: '0' }}>
        {/* Header with no background box */}
        <div style={{ marginBottom: '35px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 5px' }}>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1c236d', marginBottom: '4px', letterSpacing: '-0.3px' }}>SUBMIT COMPENSATION CASE</h2>
            <p style={{ color: '#64748b', fontSize: '14px', margin: 0, fontWeight: 500 }}>New registry entry for injury or death compensation</p>
          </div>
          <div style={{
            background: 'white',
            padding: '12px 24px',
            borderRadius: '16px',
            fontSize: '12px',
            fontWeight: 800,
            color: '#1c236d',
            boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
            border: '1px solid rgba(28, 35, 109, 0.1)',
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ opacity: 0.5 }}>Step</span>
            <span style={{ color: '#1c236d' }}>{step + 1}</span>
            <span style={{ opacity: 0.2 }}>/</span>
            <span style={{ opacity: 0.5 }}>4</span>
          </div>
        </div>
        {/* International Standard Segmented Ribbon Stepper */}
        <div style={{
          marginBottom: '35px',
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(10px)',
          borderRadius: '20px',
          padding: '10px',
          display: 'flex',
          gap: '10px',
          boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.5)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {STEPS.map((s, i) => {
            const isActive = i === step;
            const isCompleted = i < step;

            return (
              <div key={i}
                onClick={() => i < step && setStep(i)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  padding: '15px 20px',
                  borderRadius: '14px',
                  cursor: i <= step ? 'pointer' : 'default',
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  background: isActive ? '#1c236d' : 'transparent',
                  color: isActive ? 'white' : isCompleted ? '#1c236d' : '#94a3b8',
                  position: 'relative',
                  boxShadow: isActive ? '0 8px 20px -5px rgba(28, 35, 109, 0.4)' : 'none',
                  transform: isActive ? 'translateY(-2px)' : 'none'
                }}>

                {/* Status Indicator */}
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isActive ? 'rgba(255,255,255,0.2)' : isCompleted ? 'rgba(34, 197, 94, 0.15)' : '#f1f5f9',
                  color: isCompleted && !isActive ? '#22c55e' : 'inherit',
                  transition: 'all 0.4s'
                }}>
                  {isCompleted ? <Check size={16} strokeWidth={3} /> : React.cloneElement(s.icon, { size: 16 })}
                </div>

                {/* Label & Description */}
                <div style={{ textAlign: 'left' }}>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                    lineHeight: 1
                  }}>
                    {s.label}
                  </div>
                  <div style={{
                    fontSize: '9px',
                    fontWeight: 500,
                    opacity: 0.6,
                    marginTop: '4px'
                  }}>
                    {i === 0 ? 'Officer Details' : i === 1 ? 'Incident Info' : i === 2 ? 'Upload Files' : 'Final Check'}
                  </div>
                </div>

                {/* Arrow Connector for Non-last items */}
                {i < STEPS.length - 1 && (
                  <div style={{
                    position: 'absolute',
                    right: '-5px',
                    color: '#e2e8f0',
                    zIndex: 1,
                    display: isActive ? 'none' : 'block'
                  }}>
                    <ChevronRight size={14} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {submitError && <div className="alert alert-error" style={{ marginBottom: '20px' }}>{submitError}</div>}

        {/* Form Body */}
        <div className="results-card" style={{ padding: '35px', minHeight: '450px' }}>
          {step === 0 && (
            <div key="step0" style={{ animation: 'fadeIn 0.4s' }}>
              <h3 className="section-title" style={{ marginBottom: '25px' }}>OFFICER DETAILS</h3>

              <div className="filters-card" style={{ background: '#f8fafc', boxShadow: 'none', border: '1px dashed #cbd5e1' }}>
                <div className="filter-group">
                  <label style={{ color: '#1c236d', fontWeight: 500 }}>FETCH FROM HRM REGISTRY</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input className="form-control" placeholder="Search by Force Number / Check Number..." value={lookupQuery} onChange={e => setLookupQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLookup()} />
                    <button className="btn btn-primary" style={{ minWidth: '100px' }} onClick={handleLookup} disabled={lookupLoading}>
                      {lookupLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                    </button>
                  </div>
                  {lookupError && <small style={{ color: '#ef4444', marginTop: '8px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '5px' }}><AlertCircle size={12} /> {lookupError}</small>}
                </div>
              </div>

              <div className="row two-columns" style={{ marginTop: '25px' }}>
                <div className="form-group">
                  <label className="required">FORCE NUMBER / ID</label>
                  <input className={`form-control ${errors.force_number ? 'has-error' : ''}`} value={soldier.force_number} onChange={e => setSoldier(s => ({ ...s, force_number: e.target.value }))} placeholder="TPF/..." />
                </div>
                <div className="form-group">
                  <label className="required">FULL NAME</label>
                  <input className={`form-control ${errors.victim_name ? 'has-error' : ''}`} value={soldier.victim_name} onChange={e => setSoldier(s => ({ ...s, victim_name: e.target.value }))} placeholder="Enter victim full name" />
                </div>
              </div>
              <div className="row two-columns">
                <div className="form-group">
                  <label className="required">RANK</label>
                  <input className={`form-control ${errors.rank ? 'has-error' : ''}`} value={soldier.rank} onChange={e => setSoldier(s => ({ ...s, rank: e.target.value }))} />
                </div>

              </div>
            </div>
          )}

          {step === 1 && (
            <div key="step1" style={{ animation: 'fadeIn 0.4s' }}>
              <h3 className="section-title" style={{ marginBottom: '25px' }}>INCIDENT INFORMATION</h3>
              <div className="row two-columns">
                <div className="form-group">
                  <label>COMPENSATION TYPE</label>
                  <div className="select-wrapper">
                    <select className="form-control" value={incident.case_type} onChange={e => setIncident(i => ({ ...i, case_type: e.target.value }))}>
                      {CASE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <ChevronDown size={14} className="select-arrow" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="required">INCIDENT DATE</label>
                  <input type="date" className="form-control" value={incident.incident_date} onChange={e => setIncident(i => ({ ...i, incident_date: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="required">INCIDENT LOCATION / STATION</label>
                <div style={{ position: 'relative' }}>
                  <MapPin size={16} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                  <input className="form-control" style={{ paddingLeft: '45px' }} placeholder="Region, District, or Police Station name..." value={incident.incident_location} onChange={e => setIncident(i => ({ ...i, incident_location: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="required">INCIDENT CATEGORY</label>
                <div className="select-wrapper">
                  <select className="form-control" value={incident.incident_type} onChange={e => setIncident(i => ({ ...i, incident_type: e.target.value }))}>
                    <option value="">-- Choose Category --</option>
                    {INCIDENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <ChevronDown size={14} className="select-arrow" />
                </div>
              </div>
              <div className="form-group">
                <label className="required">OFFICIAL INCIDENT DESCRIPTION</label>
                <textarea className="form-control" rows="5" value={incident.description} onChange={e => setIncident(i => ({ ...i, description: e.target.value }))} placeholder="Provide a detailed narrative of the circumstances leading to the incident..."></textarea>
              </div>
            </div>
          )}

          {step === 2 && (
            <div key="step2" style={{ animation: 'fadeIn 0.4s' }}>
              <h3 className="section-title" style={{ marginBottom: '25px' }}>SUPPORTING EVIDENCE</h3>
              <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '20px' }}>
                Please upload clear scanned copies of all required documents (PDF or JPEG, max 10MB each).
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {DOCUMENT_TYPES.map(doc => {
                  if (doc.key === 'DEATH_CERTIFICATE' && incident.case_type !== 'DEATH') return null;
                  const file = files[doc.key];
                  return (
                    <div key={doc.key} style={{
                      display: 'flex', alignItems: 'center', gap: '20px', padding: '15px 25px',
                      background: '#f8fafc', borderRadius: '12px', border: `1px solid ${file ? '#c7d2fe' : '#e2e8f0'}`,
                      position: 'relative', overflow: 'hidden', transition: 'border 0.3s'
                    }}>
                      {/* Icon */}
                      <div style={{
                        background: file ? '#1c236d' : '#e2e8f0', width: '40px', height: '40px',
                        borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: file ? 'white' : '#94a3b8', flexShrink: 0
                      }}>
                        <FileText size={20} />
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: '#1c236d' }}>
                          {doc.label} {doc.required && <span style={{ color: '#ef4444' }}>*</span>}
                        </div>
                        <div style={{ fontSize: '12px', color: file ? '#4f46e5' : '#94a3b8', fontWeight: file ? 'bold' : 'normal', marginTop: '2px' }}>
                          {file ? `✓ ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)` : 'No attachment provided'}
                        </div>
                      </div>

                      {/* Buttons */}
                      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                        {/* Preview button - inaonekana tu kama file imewekwa */}
                        {file && (
                          <button
                            onClick={() => handleOpenPreview(file)}
                            style={{
                              padding: '8px 16px', borderRadius: '8px', border: '1px solid #c7d2fe',
                              background: '#eef2ff', color: '#4f46e5', fontWeight: 500,
                              fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                            }}
                          >
                            <FileText size={13} /> PREVIEW
                          </button>
                        )}

                        {/* Select/Change file */}
                        <label style={{
                          padding: '8px 16px', borderRadius: '8px', cursor: 'pointer',
                          background: file ? '#f0fdf4' : '#1c236d', color: file ? '#166534' : 'white',
                          border: file ? '1px solid #bbf7d0' : 'none',
                          fontWeight: 500, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px'
                        }}>
                          <Upload size={13} /> {file ? 'CHANGE' : 'SELECT FILE'}
                          <input
                            type="file" style={{ display: 'none' }}
                            onChange={e => handleFileSelect(doc.key, e.target.files[0])}
                            accept=".pdf,.jpg,.jpeg,.png"
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── Preview Modal ─────────────────────────────────────── */}
              {previewDoc && (
                <div style={{
                  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
                  zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '20px'
                }}
                  onClick={handleClosePreview}
                >
                  <div style={{
                    background: 'white', borderRadius: '16px', width: '100%', maxWidth: '1200px',
                    maxHeight: '95vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
                    boxShadow: '0 25px 60px rgba(0,0,0,0.4)'
                  }}
                    onClick={e => e.stopPropagation()}
                  >
                    {/* Modal Header */}
                    <div style={{
                      padding: '16px 24px', borderBottom: '1px solid #e2e8f0',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      background: '#1c236d', borderRadius: '16px 16px 0 0'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'white' }}>
                        <FileText size={18} />
                        <span style={{ fontWeight: 500, fontSize: '14px' }}>{previewDoc.name}</span>
                      </div>
                      <button onClick={handleClosePreview} style={{
                        background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '8px',
                        color: 'white', cursor: 'pointer', padding: '6px 10px', display: 'flex', alignItems: 'center'
                      }}>
                        <X size={18} />
                      </button>
                    </div>

                    {/* Modal Body - PDF au Image */}
                    <div style={{ flex: 1, overflow: 'auto', background: '#f8fafc', minHeight: '500px' }}>
                      {(previewDoc.type === 'application/pdf' || previewDoc.name.toLowerCase().endsWith('.pdf')) ? (
                        <iframe
                          src={previewUrl}
                          title="Document Preview"
                          style={{ width: '100%', height: '100%', minHeight: '500px', border: 'none' }}
                        />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', minHeight: '500px' }}>
                          <img
                            src={previewUrl}
                            alt="Document Preview"
                            style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Modal Footer */}
                    <div style={{
                      padding: '12px 24px', borderTop: '1px solid #e2e8f0',
                      display: 'flex', justifyContent: 'flex-end', gap: '10px', background: 'white'
                    }}>
                      <button onClick={handleClosePreview} style={{
                        padding: '8px 24px', borderRadius: '8px', border: '1px solid #e2e8f0',
                        background: 'white', cursor: 'pointer', fontWeight: 500, color: '#64748b'
                      }}>
                        CLOSE
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div key="step3" style={{ animation: 'fadeIn 0.4s' }}>
              <h3 className="section-title" style={{ marginBottom: '25px' }}>FINAL REVIEW</h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '30px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className="info-section-premium" style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', boxShadow: 'inset 3px 3px 6px rgba(0,0,0,0.02)' }}>
                    <div className="section-inner-title">Victim Identity</div>
                    <div style={{ marginTop: '10px' }}>
                      <div style={{ fontWeight: 500, color: '#1c236d', fontSize: '18px' }}>{soldier.victim_name}</div>
                      <div style={{ fontSize: '14px', marginTop: '5px', opacity: 0.8 }}>{soldier.rank} - {soldier.force_number}</div>

                    </div>
                  </div>
                  <div className="info-section-premium" style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', boxShadow: 'inset 3px 3px 6px rgba(0,0,0,0.02)' }}>
                    <div className="section-inner-title">Incident Timing</div>
                    <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
                      <div style={{ fontSize: '14px' }}><Calendar size={12} /> {incident.incident_date}</div>
                      <div style={{ fontSize: '14px' }}><MapPin size={12} /> {incident.incident_location}</div>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className="info-section-premium" style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', boxShadow: 'inset 3px 3px 6px rgba(0,0,0,0.02)' }}>
                    <div className="section-inner-title">Details & Documentation</div>
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ fontWeight: 500, fontSize: '14px' }}>Category: {incident.incident_type}</div>
                      <p style={{ fontSize: '13px', marginTop: '8px', lineHeight: 1.6, fontStyle: 'italic' }}>"{incident.description}"</p>
                    </div>
                    <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                      {Object.keys(files).map(k => (
                        <span key={k} style={{ padding: '4px 10px', background: '#dcfce7', color: '#166534', borderRadius: '8px', fontSize: '10px', fontWeight: 500 }}>
                          <Check size={10} /> {k.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="alert alert-info" style={{ marginTop: '30px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                <AlertCircle size={24} />
                <div style={{ fontSize: '13px' }}>
                  By clicking <strong>Submit Case</strong>, you acknowledge that all information provided is accurate according to the official OB reports. Fraudulent claims will be subject to disciplinary action.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="btn btn-outline" style={{ minWidth: '150px', background: '#e0e5ec', display: 'flex', gap: '10px' }}
            onClick={() => step === 0 ? navigate('/cases') : setStep(s => s - 1)}>
            <ChevronLeft size={18} /> {step === 0 ? 'ABANDON CLAIM' : 'PREVIOUS STEP'}
          </button>

          <button className="btn btn-primary" style={{ minWidth: '200px', display: 'flex', gap: '10px', justifyContent: 'center' }}
            onClick={step === 3 ? handleSubmit : handleNext} disabled={submitting}>
            {submitting ? <Loader2 size={18} className="animate-spin" /> : step === 3 ? 'SUBMIT FORMAL CASE' : 'SAVE & CONTINUE'}
            {step < 3 && !submitting && <ChevronRight size={18} />}
            {step === 3 && !submitting && <CheckCircle2 size={18} />}
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes fadeIn {
           from { opacity: 0; transform: translateY(10px); }
           to { opacity: 1; transform: translateY(0); }
        }
        .section-inner-title {
           font-size: 11px;
           text-transform: uppercase;
           letter-spacing: 1px;
           color: #64748b;
           font-weight: 500;
           margin-bottom: 5px;
        }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes pulse {
          0% { transform: translate(-50%, -50%) scale(0.95); opacity: 0.5; }
          50% { transform: translate(-50%, -50%) scale(1.05); opacity: 0.1; }
          100% { transform: translate(-50%, -50%) scale(0.95); opacity: 0.5; }
        }
      `}} />
    </div>
  );
}
