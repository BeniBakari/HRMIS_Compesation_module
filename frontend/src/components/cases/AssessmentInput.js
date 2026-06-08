import { useState, useEffect } from 'react';
import { casesApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { 
  ClipboardList, Users, Edit3, CheckCircle2, Clock, 
  AlertTriangle, Activity, UserPlus, Info, Check, 
  ChevronRight, Loader2, TrendingUp, MessageSquare,
  DollarSign
} from 'lucide-react';
<<<<<<< HEAD
=======
import "../../pages/CaseDetail.css";
>>>>>>> f8c8638c1dbb0e0402d72805018abfe37a42403c

const SEVERITY_OPTIONS = [
  { value: 'MINOR',    label: 'Minor',    pct: 25,  color: '#22c55e', bg: '#f0fdf4' },
  { value: 'MODERATE', label: 'Moderate', pct: 50,  color: '#eab308', bg: '#fefce8' },
  { value: 'SEVERE',   label: 'Severe',   pct: 75,  color: '#f97316', bg: '#fff7ed' },
  { value: 'CRITICAL', label: 'Critical', pct: 100, color: '#ef4444', bg: '#fef2f2' },
];

export default function AssessmentInput({ caseId, onUpdate }) {
  const { user } = useAuth();
  const [caseData, setCaseData] = useState(null);
  const [injuryPct,     setInjuryPct]     = useState('');
  const [severity,      setSeverity]      = useState('');
  const [notes,         setNotes]         = useState('');
  const [agreedAmount,  setAgreedAmount]  = useState('');
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState('');
  const [fetching,      setFetching]      = useState(true);

  const fetchDetails = async () => {
    try {
      const data = await casesApi.get(caseId);
      console.log("Fetched case details:", data);
      setCaseData(data);
      
      const myInput = (data.committee_members || []).find(m => m.user_id === user?.id && m.has_submitted_input);
      if (myInput?.assessment_input) {
        setInjuryPct(data.case_type === 'DEATH' ? 100 : myInput.assessment_input.injury_percentage ?? '');
        setSeverity(myInput.assessment_input.severity_class ?? '');
        setNotes(myInput.assessment_input.assessment_notes ?? '');
        setAgreedAmount(myInput.assessment_input.agreed_amount ?? '');
      }
    } catch (err) { setError("Failed to refresh assessment data."); }
    finally { setFetching(false); }
  };

  useEffect(() => { fetchDetails(); }, [caseId, user?.id]);

  const isRPC = user?.role === 'RPC';

  const handleSubmit = async () => {
    if (caseData?.case_type === 'INJURY' && (injuryPct === '' || injuryPct < 0 || injuryPct > 100))
      return setError('Please specify a valid injury percentage between 0 and 100.');
    if (!severity)
      return setError('A severity rating must be selected for clinical records.');
    if (isRPC && (agreedAmount === '' || isNaN(Number(agreedAmount)) || Number(agreedAmount) < 0))
      return setError('Please enter a valid agreed compensation amount.');
    
    setLoading(true); setError('');
    try {
      await casesApi.submitInput(caseId, {
        injury_percentage: caseData.case_type === 'DEATH' ? 100 : Number(injuryPct),
        severity_class: severity, 
        assessment_notes: notes,
        ...(isRPC && { agreed_amount: Number(agreedAmount) }),
      });
      window.location.reload();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  if (fetching || !caseData) return <div className="loading-state" style={{ padding: '40px' }}><div className="spinner"></div></div>;

  const isCurrentUserSubmitted = (caseData.submitted_members?.map(m => m.user_id) || []).includes(user?.id);

  const otherMembers = (caseData.committee_members || []).filter(m => m.user_id !== user?.id);
  const othersNotSubmitted = otherMembers.filter(m => !m.has_submitted_input);
  const allOthersSubmitted  = otherMembers.length > 0 && othersNotSubmitted.length === 0;
  const isRpcBlocked = isRPC && !isCurrentUserSubmitted && !allOthersSubmitted;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', animation: 'fadeIn 0.4s' }}>
      {error && <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><AlertTriangle size={18} /> {error}</div>}

      {/* Committee Progression Status */}
      <div className="info-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '15px' }}>
           <h3><Activity size={18} style={{marginRight: '10px'}} /> COMMITTEE SUBMISSION PROGRESS</h3>
           <span style={{ fontSize: '13px', fontWeight: 500, color: '#1c236d' }}>{caseData.progress.submitted} OF {caseData.progress.total} RECORDS SECURED</span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
          <div className="progress-container-neu" style={{ flex: 1, height: '14px', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ 
               width: `${(caseData.progress.submitted / caseData.progress.total) * 100}%`, 
               background: 'var(--neu-primary)', height: '100%', 
               transition: 'width 0.8s ease-out'
            }}></div>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {(caseData.committee_members || []).map((m, i) => (
            <div key={i} style={{ 
               display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 15px', 
               background: m.has_submitted_input ? '#dcfce7' : 'white', 
               color: m.has_submitted_input ? '#166534' : '#64748b',
               borderRadius: '20px', border: m.has_submitted_input ? 'none' : '1px solid #e2e8f0',
               fontSize: '11px', fontWeight: 500
            }}>
               {m.has_submitted_input ? <CheckCircle2 size={12} /> : <Clock size={12} />}
               {m.force_number} { m.user_display ||  `Member ${i + 1}`}
            </div>
          ))}
        </div>
      </div>

      {/* Peer Review Summary Grid */}
      <div className="info-section">
        <h3><Users size={18} style={{marginRight: '10px'}} /> PEER ASSESSMENT SUMMARY</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
          {(caseData.submitted_members || []).map((m, i) => (
            <div key={i} className="results-card" style={{ padding: '20px', background: 'white', border: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', background: '#1c236d', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>
                       {m.role?.[0]}
                    </div>
                    <div>
                       <div style={{ fontSize: '11px', fontWeight: 500, color: '#1c236d' }}>{m.role}</div>
                       <div style={{ fontSize: '9px', opacity: 0.5 }}>{new Date(m.submitted_at).toLocaleDateString()}</div>
                    </div>
                 </div>
                 {m.user_id === user?.id && <span className="badge badge-primary" style={{ fontSize: '8px' }}>YOU</span>}
              </div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                 <span style={{ fontSize: '10px', fontWeight: 500, padding: '3px 10px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>Factor: {m.injury_percentage}%</span>
                 <span style={{ fontSize: '10px', fontWeight: 500, padding: '3px 10px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>{m.severity.toUpperCase()}</span>
              </div>
              {m.notes && <p style={{ fontSize: '12px', fontStyle: 'italic', color: '#64748b', lineHeight: 1.5, margin: 0 }}>"{m.notes}"</p>}
            </div>
          ))}
          {(!caseData.submitted_members || caseData.submitted_members.length === 0) && <div className="no-data-inline" style={{ gridColumn: 'span 2' }}>Awaiting initial peer submissions...</div>}
        </div>
      </div>

      {/* Your Interactive Input */}
      <div className="results-card" style={{ padding: '35px' }}>
        <h3 className="section-title" style={{ marginBottom: '30px' }}><Edit3 size={18} style={{marginRight: '10px'}} /> INDIVIDUAL CLINICAL ASSESSMENT</h3>

        {isCurrentUserSubmitted ? (
          <div className="alert alert-success" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '25px', borderRadius: '18px' }}>
            <div style={{ background: '#166534', width: '50px', height: '50px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
               <CheckCircle2 size={32} />
            </div>
            <div>
               <div style={{ fontWeight: 500, fontSize: '16px' }}>Input Recorded Successfully</div>
               <p style={{ margin: '5px 0 0', opacity: 0.8, fontSize: '13px' }}>Your clinical determination has been committed to the case file. Assessments cannot be modified once reaching this workflow stage.</p>
            </div>
          </div>

        ) : isRpcBlocked ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ 
              display: 'flex', alignItems: 'flex-start', gap: '20px', padding: '25px', 
              borderRadius: '18px', background: '#fffbeb', border: '1.5px solid #fcd34d'
            }}>
              <div style={{ 
                background: '#d97706', width: '50px', height: '50px', borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' 
              }}>
                <Clock size={26} />
              </div>
              <div>
                <div style={{ fontWeight: 500, fontSize: '16px', color: '#92400e' }}>Awaiting Committee Members</div>
                <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#78350f', lineHeight: 1.6 }}>
                  As RPC, your assessment must be submitted last — after all 3 committee members have recorded their inputs.
                  Please wait for the remaining <strong>{othersNotSubmitted.length}</strong> member{othersNotSubmitted.length !== 1 ? 's' : ''} to complete their submissions.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', paddingLeft: '4px' }}>
              {otherMembers.map((m, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '7px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 500,
                  background: m.has_submitted_input ? '#dcfce7' : '#fef9c3',
                  color:      m.has_submitted_input ? '#166534' : '#854d0e',
                  border:     m.has_submitted_input ? '1px solid #bbf7d0' : '1px solid #fde68a',
                }}>
                  {m.has_submitted_input ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                  {m.force_number}  {m.user_display || `Member ${i + 1}`}
                  {m.has_submitted_input && <span style={{ fontSize: '10px', opacity: 0.7 }}>✓ done</span>}
                </div>
              ))}
            </div>
          </div>

        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'min-content 1fr', gap: '40px', alignItems: 'center' }}>
               <div style={{ textAlign: 'center', padding: '20px 30px', background: '#f8fafc', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '10px', fontWeight: 500, color: '#94a3b8', marginBottom: '5px' }}>SELECTED FACTOR</div>
                  <div style={{ fontSize: '42px', fontWeight: 500, color: 'var(--neu-primary)' }}>{injuryPct !== '' ? `${injuryPct}%` : '—'}</div>
               </div>
               
               <div>
                  <label className="required" style={{ fontWeight: 500, color: '#1c236d', marginBottom: '15px', display: 'block' }}>CLINICAL SEVERITY DETERMINATION</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                    {SEVERITY_OPTIONS.map(opt => (
                      <button key={opt.value} 
                         style={{ 
                            background: severity === opt.value ? opt.bg : 'white', 
                            color: severity === opt.value ? opt.color : '#64748b', 
                            border: `1.5px solid ${severity === opt.value ? opt.color : '#e2e8f0'}`,
                            padding: '15px 10px', borderRadius: '12px', cursor: 'pointer',
                            fontSize: '12px', fontWeight: 500, transition: 'all 0.2s',
                            boxShadow: severity === opt.value ? '0 5px 15px rgba(0,0,0,0.05)' : 'none'
                         }}
                         onClick={() => { setSeverity(opt.value); setInjuryPct(opt.pct); }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
               </div>
            </div>

            {/* ── RPC ONLY: Agreed Compensation Amount ── */}
            {isRPC && (
              <div style={{
                padding: '25px', borderRadius: '16px',
                background: '#f0f4ff', border: '1.5px solid #c7d2fe'
              }}>
                <label style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  color: '#1c236d', fontWeight: 500, marginBottom: '12px', fontSize: '13px'
                }}>
                  <DollarSign size={16} />
                  AGREED COMPENSATION AMOUNT (TZS) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
                    fontWeight: 500, color: '#1c236d', fontSize: '14px'
                  }}>
                    TZS
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={agreedAmount}
                    onChange={e => setAgreedAmount(e.target.value)}
                    placeholder="e.g. 650000"
                    style={{
                      width: '100%', padding: '14px 16px 14px 56px',
                      borderRadius: '12px', border: '1.5px solid #a5b4fc',
                      fontSize: '16px', fontWeight: 500, color: '#1c236d',
                      background: 'white', outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
                {agreedAmount !== '' && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#4338ca', fontWeight: 500 }}>
                    = TZS {Number(agreedAmount).toLocaleString('en-TZ')}
                  </div>
                )}
                <p style={{ margin: '10px 0 0', fontSize: '11px', color: '#6366f1', lineHeight: 1.5 }}>
                  This is the final compensation figure agreed upon by the committee. It will be permanently recorded on the case file.
                </p>
              </div>
            )}

            <div className="form-group">
               <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1c236d', fontWeight: 500 }}><MessageSquare size={16} /> JUSTIFICATION NOTES</label>
               <textarea className="form-control" rows={5} placeholder="Provide a detailed narrative of the clinical observations. Reference the specific OB reports or medical files examined..." value={notes} onChange={e => setNotes(e.target.value)} style={{ padding: '20px' }} />
            </div>

            <button className="btn btn-primary" onClick={handleSubmit} disabled={loading || !severity} style={{ width: '100%', padding: '18px', borderRadius: '15px', fontSize: '15px', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
               {loading ? <Loader2 size={20} className="spinner" /> : <TrendingUp size={20} />} COMMIT ASSESSMENT RECORD
            </button>
          </div>
        )}
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .results-card:hover { border-color: var(--neu-primary); }
        .spinner { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}
