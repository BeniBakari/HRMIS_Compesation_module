import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { casesApi, BASE_URL } from '../../services/api';
import {
  ShieldCheck, Gavel, CheckCircle2, XCircle, Undo2, FileText,
  Loader2, AlertTriangle, Check, Info, Send, Eye, X
} from 'lucide-react';

// ── Base64 decoder ─────────────────────────────────────────────────
function decodeBase64ToBlobUrl(base64Data, hintMime = "application/octet-stream") {
  try {
    if (!base64Data) return { blobUrl: null, mime: null, error: 'No data' };
    let mime = hintMime, rawBase64 = base64Data;
    const match = base64Data.match(/^data:([^;]+);base64,(.+)$/);
    if (match) { mime = match[1]; rawBase64 = match[2]; }
    rawBase64 = rawBase64.replace(/\s/g, '');
    const binary = atob(rawBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const resMime = (hintMime || "").toLowerCase().includes("pdf") ? "application/pdf" : mime;
    return { blobUrl: URL.createObjectURL(new Blob([bytes], { type: resMime })), mime: resMime, error: null };
  } catch (e) { return { blobUrl: null, mime: null, error: e.message }; }
}

// ── Doc Preview Modal ──────────────────────────────────────────────
function DocPreviewModal({ doc, onClose }) {
  const [res, setRes] = useState({ url: null, mime: null, loading: true, error: null });
  useEffect(() => {
    if (!doc) return;
    setRes({ url: null, mime: null, loading: true, error: null });
    const load = async () => {
      try {
        let fileData = doc.base64 || doc.file;
        if (!fileData) return setRes({ loading: false, error: 'No file data' });

        const looksLikeBase64 = typeof fileData === 'string' && (fileData.startsWith('data:') || fileData.length > 500 || /^[A-Za-z0-9+/=]+$/.test(fileData.substring(0, 100)));

        if (looksLikeBase64) {
          const { blobUrl, mime, error } = decodeBase64ToBlobUrl(fileData, doc.file_content_type || doc.mime_type);
          if (error) setRes({ loading: false, error });
          else setRes({ url: blobUrl, mime, loading: false });
        } else {
          let fileUrl = fileData;
          if (typeof fileUrl === 'string') {
            if (fileUrl.includes(':8001')) fileUrl = fileUrl.replace(':8001', ':8000');
            if (fileUrl.startsWith('/')) fileUrl = `${BASE_URL}${fileUrl}`;
          }
          
          try {
            const response = await fetch(fileUrl);
            if (!response.ok) throw new Error('Failed to fetch file');
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            setRes({ url: url, mime: blob.type || doc.file_content_type, loading: false });
          } catch (err) {
            setRes({ url: fileUrl, mime: doc.file_content_type || doc.mime_type, loading: false });
          }
        }
      } catch (e) { setRes({ loading: false, error: 'Load failed' }); }
    };
    load();
    return () => { if (res.url?.startsWith('blob:')) URL.revokeObjectURL(res.url); };
  }, [doc]);

  if (!doc) return null;
  const isPdf = res.mime === "application/pdf" || 
                doc.file_content_type === "application/pdf" || 
                doc.mime_type === "application/pdf" ||
                (doc.original_filename && doc.original_filename.toLowerCase().endsWith('.pdf'));
  const isImage = res.mime?.startsWith("image/") || (doc.mime_type && doc.mime_type.startsWith("image/")) || /\.(png|jpe?g|gif|webp)$/i.test(doc.original_filename);

  return (
    <div className="modal-overlay" onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ background: '#e4e9f0', borderRadius: '25px', width: '100%', maxWidth: '1200px', height: '95vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
        <div className="modal-header" style={{ padding: '20px 30px', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white' }}>
          <h4 style={{ margin: 0, color: '#1c236d', display: 'flex', alignItems: 'center', gap: '10px' }}><FileText size={20} /> {doc.doc_type?.replace(/_/g, " ")}</h4>
          <button onClick={onClose} className="btn-icon" style={{ background: 'transparent', border: 'none', color: '#1c236d', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: '10px', borderRadius: '50%' }}><X size={26} /></button>
        </div>
        <div className="modal-body" style={{ flex: 1, padding: '0', overflow: 'hidden', background: '#ffffff', position: 'relative' }}>
          {res.loading ? <div className="loading-state" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p>Rendering document...</p></div> :
            res.error ? <div className="alert alert-error" style={{ margin: '40px' }}><AlertTriangle size={24} /> {res.error}</div> :
              isPdf ? <iframe src={res.url} style={{ width: '100%', height: '100%', border: 'none' }} title="pdf" /> :
                isImage ? (
                  <div style={{ width: '100%', height: '100%', overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
                    <img src={res.url} style={{ maxWidth: '100%', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', borderRadius: '10px' }} alt="preview" />
                  </div>
                ) :
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '20px', background: 'white' }}>
                    <FileText size={64} color="#94a3b8" />
                    <p style={{ color: '#1c236d', fontWeight: 500 }}>Preview not available for this file type</p>
                    <a href={res.url} download={doc.original_filename} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}> Download Attachment</a>
                  </div>}
        </div>
      </div>
    </div>
  );
}

// ── Decisions per role ────────────────────────────────────────────────────────
const HQ_DECISIONS = [
  { value: 'APPROVED', label: 'Approve & Forward to CO', icon: <CheckCircle2 size={18} />, color: '#166534', bg: '#dcfce7' },
  { value: 'RETURNED', label: 'Return to RPC',           icon: <Undo2 size={18} />,        color: '#92400e', bg: '#fef3c7' },
  { value: 'REJECTED', label: 'Reject Application',      icon: <XCircle size={18} />,       color: '#991b1b', bg: '#fee2e2' },
];
const CO_DECISIONS = [
  { value: 'APPROVED', label: 'Approve & Forward to SO', icon: <CheckCircle2 size={18} />, color: '#166534', bg: '#dcfce7' },
  { value: 'RETURNED', label: 'Return to RPC',           icon: <Undo2 size={18} />,        color: '#92400e', bg: '#fef3c7' },
  { value: 'REJECTED', label: 'Reject Application',      icon: <XCircle size={18} />,       color: '#991b1b', bg: '#fee2e2' },
];
const SO_DECISIONS = [
  { value: 'APPROVED', label: 'Approve & Forward to Chief', icon: <CheckCircle2 size={18} />, color: '#166534', bg: '#dcfce7' },
  { value: 'RETURNED', label: 'Return to RPC',              icon: <Undo2 size={18} />,        color: '#92400e', bg: '#fef3c7' },
  { value: 'REJECTED', label: 'Reject Application',         icon: <XCircle size={18} />,       color: '#991b1b', bg: '#fee2e2' },
];
const CHIEF_DECISIONS = [
  { value: 'APPROVED', label: 'Submit to CP_HRM Office', icon: <Send size={18} />,   color: '#166534', bg: '#dcfce7' },
  { value: 'RETURNED', label: 'Return to RPC',        icon: <Undo2 size={18} />,  color: '#92400e', bg: '#fef3c7' },
  { value: 'REJECTED', label: 'Reject Application',   icon: <XCircle size={18} />, color: '#991b1b', bg: '#fee2e2' },
];

export default function HQValidation({ caseId, currentStatus, onUpdate }) {
  const { user }  = useAuth();
  const perms     = usePermissions();
  const role      = perms.role;

  const [decision,     setDecision]     = useState('');
  const [notes,        setNotes]        = useState('');
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [docs,         setDocs]         = useState([]);
  const [fetchingDocs, setFetchingDocs] = useState(true);
  const [previewDoc,   setPreviewDoc]   = useState(null);

  // ── NEW: Added for RETURNED & REJECTED confirmation ─────────────────────
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingDecision, setPendingDecision] = useState(null);

  // ── Load documents ──────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    casesApi.get(caseId)
      .then(data => { if (mounted) setDocs(data.documents || []); })
      .catch(() => { if (mounted) setError('Failed to load documents.'); })
      .finally(() => { if (mounted) setFetchingDocs(false); });
    return () => { mounted = false; };
  }, [caseId]);

  // ── Role helpers ────────────────────────────────────────────────────────────
  const isHQ    = role === 'COMPENSATION_HQ';
  const isCO    = role === 'COMPENSATION_HQ_CO';
  const isSO    = role === 'COMPENSATION_HQ_SO';
  const isChief = role === 'COMPENSATION_HQ_CHIEF';

  const canAct = () => {
    if (isHQ)    return ['SUBMITTED', 'UNDER_REVIEW'].includes(currentStatus);
    if (isCO)    return currentStatus === 'HQ_APPROVED';
    if (isSO)    return currentStatus === 'CO_APPROVED';
    if (isChief) return currentStatus === 'SO_REVIEWED';
    return false;
  };

  const getEndpoint = () => {
    if (isHQ)    return 'hq-review';
    if (isCO)    return 'co-review';
    if (isSO)    return 'so-review';
    if (isChief) return 'chief-review';
  };

  const getDecisions = () => {
    if (isHQ)    return HQ_DECISIONS;
    if (isCO)    return CO_DECISIONS;
    if (isSO)    return SO_DECISIONS;
    if (isChief) return CHIEF_DECISIONS;
    
    return [];
  };

  const getRoleLabel = () => {
    if (isHQ)    return 'HQ — DOCUMENT VALIDATION';
    if (isCO)    return 'CO — CASE REVIEW';
    if (isSO)    return 'SO — CASE REVIEW';
    if (isChief) return 'CHIEF — FINAL APPROVAL';
    return 'HQ REVIEW';
  };

  const getNextStep = () => {
    if (isHQ)    return 'CO Review';
    if (isCO)    return 'SO Review';
    if (isSO)    return 'Chief Approval';
    if (isChief) return 'CP_HRM Office';
    return '';
  };

  // ── NEW: Dynamic Submit Button Text ─────────────────────────────────────
  const getSubmitButtonText = () => {
    if (decision === 'RETURNED') return 'RETURN TO RPC';
    if (decision === 'REJECTED') return 'REJECT APPLICATION';
    if (isHQ)    return 'SUBMIT TO CO REVIEW';
    if (isCO)    return 'SUBMIT TO SO REVIEW';
    if (isSO)    return 'SUBMIT TO CHIEF APPROVAL';
    if (isChief) return 'SUBMIT TO CP_HRM OFFICE';
    return 'SUBMIT DECISION';
  };

  // ── NEW: Dynamic Submit Button Colors ───────────────────────────────────
  const getSubmitButtonStyle = () => {
    if (decision === 'APPROVED') {
      return { background: '#166534', color: 'white', borderColor: '#166534' };
    }
    if (decision === 'RETURNED') {
      return { background: '#92400e', color: 'white', borderColor: '#92400e' };
    }
    if (decision === 'REJECTED') {
      return { background: '#991b1b', color: 'white', borderColor: '#991b1b' };
    }
    return {}; // default
  };

  // ── CO only: verify/unverify a document ────────────────────────────────────
  const handleDocVerify = async (docId, verified) => {
    try {
      await casesApi.verifyDocument(caseId, { document_id: docId, is_verified: verified });
      const data = await casesApi.get(caseId);
      setDocs(data.documents || []);
      onUpdate();
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to update document.');
    }
  };

  // ── NEW: Submit with confirmation for RETURNED & REJECTED ─────────────────
  const handleSubmit = async () => {
    setError('');
    if (!decision)     return setError('Please select a decision.');
    if (!notes.trim()) return setError('Please provide justification notes.');

    if (decision === 'APPROVED' && isCO) {
      const unverified = docs.filter(d => !d.is_verified);
      if (unverified.length > 0)
        return setError(`${unverified.length} document(s) are not yet verified. Verify all before approving.`);
    }

    // Added logic: Show confirmation for RETURNED and REJECTED
    if (decision === 'RETURNED' || decision === 'REJECTED') {
      setPendingDecision({ decision, notes });
      setShowConfirm(true);
      return;
    }

    // Direct submit for APPROVED
    await performSubmit(decision, notes);
  };

  const performSubmit = async (dec, justification) => {
    setLoading(true);
    try {
      await casesApi.hqReview(caseId, getEndpoint(), { decision: dec, notes: justification });
      onUpdate();
      window.location.reload();
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const confirmDestructiveAction = () => {
    if (pendingDecision) {
      performSubmit(pendingDecision.decision, pendingDecision.notes);
      setShowConfirm(false);
      setPendingDecision(null);
    }
  };

  // ── Not authorized to act at this stage ────────────────────────────────────
  if (!canAct()) {
    const messages = {
      SUBMITTED:          'This case is waiting for HQ to validate documents.',
      UNDER_REVIEW:       'HQ is currently reviewing this case.',
      CO_APPROVED:        isSO ? 'This case is ready for your review.' : 'This case is awaiting SO review.',
      SO_REVIEWED:        isChief ? 'This case is ready for your final approval.' : 'This case is awaiting Chief approval.',
      PENDING_CP_HRM:        'Case has been submitted to the CP_HRM Office.',
      COMMITTEE_ASSIGNED: 'Case is with the assessment committee.',
      RETURNED:           'Case has been returned to RPC for corrections.',
      REJECTED:           'This case has been rejected.',
    };

    return (
      <div className="info-section" style={{ textAlign: 'center', padding: '50px 40px', color: '#64748b' }}>
        <Info size={44} style={{ marginBottom: '15px', opacity: 0.25 }} />
        <p style={{ fontWeight: 500, fontSize: '15px', color: '#1c236d' }}>
          {messages[currentStatus] || 'This stage does not apply to your role.'}
        </p>
        <p style={{ fontSize: '12px', marginTop: '8px' }}>
          Current status: <strong>{currentStatus}</strong>
        </p>
      </div>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', animation: 'fadeIn 0.4s' }}>

      {error && (
        <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertTriangle size={18} /> {error}
        </div>
      )}

      {/* ──HQ & CO ONLY: Document Verification Checklist ──────────────────────── */}
      {(isHQ || isCO) && (
        <div className="info-section">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldCheck size={18} /> EVIDENCE VERIFICATION CHECKLIST
          </h3>
          <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '20px' }}>
            Examine each document against the original registry records. All documents must be
            verified before approving the case.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {fetchingDocs ? (
              <div className="loading-state" style={{ padding: '40px' }}><div className="spinner" /></div>
            ) : docs.length === 0 ? (
              <div className="no-data-inline">No documents submitted for this case.</div>
            ) : (
              docs.map(doc => (
                <div key={doc.id} style={{
                  padding: '15px 25px', background: 'white', borderRadius: '16px',
                  border: `1px solid ${doc.is_verified ? '#bbf7d0' : '#e2e8f0'}`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  transition: 'border 0.3s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '10px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: doc.is_verified ? '#dcfce7' : '#f1f5f9',
                      color: doc.is_verified ? '#166534' : '#64748b',
                    }}>
                      {doc.is_verified ? <CheckCircle2 size={20} /> : <FileText size={20} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '14px', color: '#1c236d' }}>
                        {doc.doc_type?.replace(/_/g, ' ')}
                      </div>
                      <div style={{ fontSize: '11px', opacity: 0.6 }}>{doc.original_filename}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {doc.file && (
                      <button onClick={() => setPreviewDoc(doc)} style={{
                        padding: '7px 14px', borderRadius: '8px', border: '1px solid #c7d2fe',
                        background: '#eef2ff', color: '#4f46e5', fontWeight: 500,
                        fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
                      }}>
                        <Eye size={13} /> PREVIEW
                      </button>
                    )}
                    {doc.is_verified ? (
                      <button className="btn btn-xs btn-outline"
                        style={{ color: '#991b1b', borderColor: '#fecaca' }}
                        onClick={() => handleDocVerify(doc.id, false)}>
                        <Undo2 size={12} /> CANCEL VERIFY
                      </button>
                    ) : (
                      <button className="btn btn-xs btn-primary"
                        style={{ background: '#166534' }}
                        onClick={() => handleDocVerify(doc.id, true)}>
                        <Check size={12} /> MARK VERIFIED
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Verification summary */}
          {docs.length > 0 && (
            <div style={{
              marginTop: '15px', padding: '12px 20px', borderRadius: '10px',
              background: docs.every(d => d.is_verified) ? '#dcfce7' : '#fef3c7',
              color: docs.every(d => d.is_verified) ? '#166534' : '#92400e',
              fontSize: '13px', fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              {docs.every(d => d.is_verified)
                ? <><CheckCircle2 size={16} /> All documents verified — you may now approve this case.</>
                : <><AlertTriangle size={16} /> {docs.filter(d => !d.is_verified).length} document(s) still unverified.</>
              }
            </div>
          )}
        </div>
      )}

      {/* ── SO & CHIEF: Read-only document list ───────────────────────────── */}
      {(isSO || isChief) && (
        <div className="info-section">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={18} /> SUPPORTING DOCUMENTS
          </h3>
          <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '20px' }}>
            Documents verified by HQ. Review carefully before making your decision.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {fetchingDocs ? (
              <div className="loading-state" style={{ padding: '30px' }}><div className="spinner" /></div>
            ) : docs.length === 0 ? (
              <div className="no-data-inline">No documents found.</div>
            ) : (
              docs.map(doc => (
                <div key={doc.id} style={{
                  padding: '12px 20px', background: 'white', borderRadius: '12px',
                  border: `1px solid ${doc.is_verified ? '#bbf7d0' : '#fecdd3'}`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '8px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: doc.is_verified ? '#dcfce7' : '#fee2e2',
                      color: doc.is_verified ? '#166534' : '#991b1b',
                    }}>
                      {doc.is_verified ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '13px', color: '#1c236d' }}>
                        {doc.doc_type?.replace(/_/g, ' ')}
                      </div>
                      <div style={{ fontSize: '11px', opacity: 0.6 }}>
                        {doc.original_filename} ·{' '}
                        <span style={{ color: doc.is_verified ? '#166534' : '#991b1b', fontWeight: 500 }}>
                          {doc.is_verified ? 'Verified by HQ' : 'Not verified'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {doc.file && (
                    <button onClick={() => setPreviewDoc(doc)} style={{
                      padding: '7px 14px', borderRadius: '8px', border: '1px solid #c7d2fe',
                      background: '#eef2ff', color: '#4f46e5', fontWeight: 500,
                      fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
                    }}>
                      <Eye size={13} /> VIEW
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Decision Panel (all roles) ─────────────────────────────────────── */}
      <div className="info-section">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Gavel size={18} /> {getRoleLabel()}
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '25px' }}>
          {getDecisions().map(d => (
            <button key={d.value}
              onClick={() => setDecision(d.value)}
              style={{
                padding: '20px 15px', borderRadius: '16px',
                border: `1px solid ${decision === d.value ? d.color : '#e2e8f0'}`,
                background: decision === d.value ? d.bg : 'white',
                color: decision === d.value ? d.color : '#64748b',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
                cursor: 'pointer', transition: 'all 0.3s ease', fontWeight: 500, fontSize: '13px',
              }}>
              {d.icon}
              <span style={{ textAlign: 'center', lineHeight: 1.3 }}>{d.label}</span>
            </button>
          ))}
        </div>

        <div className="form-group">
          <label className="required">OFFICIAL REVIEW REMARKS</label>
          <textarea
            className="form-control" rows={5}
            placeholder={
              isCO    ? 'State the outcome of document verification. Mention any discrepancies found...' :
              isHQ    ? 'Provide your validation findings and justification for this decision...' :
              isSO    ? 'Provide your review findings and justification for this decision...' :
                        'State your final determination and justification for submission to CP_HRM...'
            }
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '20px', marginTop: '25px', alignItems: 'center' }}>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={loading || !decision}
            style={{ 
              flex: 1, 
              padding: '18px', 
              borderRadius: '15px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '10px',
              ...getSubmitButtonStyle()   // ← NEW: Dynamic colors
            }}
          >
            {loading ? <Loader2 size={18} className="spinner" /> : <ShieldCheck size={18} />}
            {getSubmitButtonText()}
          </button>

          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: '10px',
            color: '#64748b', fontSize: '11px', fontStyle: 'italic', lineHeight: 1.5,
          }}>
            <Info size={16} style={{ flexShrink: 0 }} />
            {decision === 'APPROVED'
              ? `This will forward the case to ${getNextStep()}.`
              : decision === 'RETURNED'
              ? 'This will return the case to the RPC for corrections.'
              : decision === 'REJECTED'
              ? 'This action is final. The case will be permanently rejected.'
              : 'Select a decision above to continue.'}
          </div>
        </div>
      </div>

      {/* ── Document Preview Modal ─────────────────────────────────────────── */}
      {previewDoc && (
        <DocPreviewModal 
          doc={previewDoc} 
          onClose={() => setPreviewDoc(null)} 
        />
      )}

      {/* ── NEW: Confirmation Modal for RETURNED & REJECTED ───────────────────── */}
      {showConfirm && pendingDecision && (
        <div className="modal-overlay" onClick={() => setShowConfirm(false)} style={{ 
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 11000, 
          display: 'flex', alignItems: 'center', justifyContent: 'center' 
        }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ 
            background: 'white', borderRadius: '20px', padding: '30px', maxWidth: '420px', textAlign: 'center' 
          }}>
            <AlertTriangle size={48} color="#991b1b" style={{ marginBottom: '20px' }} />
            <h3 style={{ color: '#1c236d' }}>Confirm Action</h3>
            <p style={{ margin: '20px 0', color: '#334155' }}>
              Are you sure you want to <strong>{pendingDecision.decision === 'REJECTED' ? 'REJECT' : 'RETURN'}</strong> this case?<br/>
              This action cannot be easily undone.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => { setShowConfirm(false); setPendingDecision(null); }}
                className="btn btn-outline" 
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button 
                onClick={confirmDestructiveAction}
                className="btn btn-danger" 
                style={{ flex: 1, background: '#991b1b' }}
                disabled={loading}
              >
                {loading ? 'Processing...' : `Yes, ${pendingDecision.decision === 'REJECTED' ? 'Reject' : 'Return'}`}
              </button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .spinner { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}} />
    </div>
  );
}