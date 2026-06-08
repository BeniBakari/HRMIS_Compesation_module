import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faIdCard, faShieldHalved, faLock, faEye, faEyeSlash,
  faSpinner, faArrowLeft, faCheckCircle, faXmarkCircle,
  faChevronRight, faChevronLeft,
} from '@fortawesome/free-solid-svg-icons';
import { library } from '@fortawesome/fontawesome-svg-core';

library.add(
  faIdCard, faShieldHalved, faLock, faEye, faEyeSlash,
  faSpinner, faArrowLeft, faCheckCircle, faXmarkCircle,
  faChevronRight, faChevronLeft,
);

// ─── API ─────────────────────────────────────────────────────────────────────
const API = import.meta.env.VITE_API_URL || '';

async function post(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(
      data?.error || data?.detail || data?.message ||
      data?.non_field_errors?.[0] || 'Something went wrong.'
    );
    err.data = data;
    throw err;
  }
  return data;
}

// ─── Shared styles ────────────────────────────────────────────────────────────
const card = {
  background: 'rgba(228, 233, 240, 0.85)',
  borderRadius: '25px',
  boxShadow: '15px 15px 30px rgba(163,177,198,0.7), -15px -15px 30px rgba(255,255,255,0.7)',
  padding: '2.5rem 2rem',
  width: '100%',
  maxWidth: '460px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  backdropFilter: 'blur(8px)',
  border: '1px solid rgba(255,255,255,0.4)',
  margin: '0 auto',
};

const inputWrapper = (state = 'idle') => ({
  display: 'flex',
  alignItems: 'center',
  background: state === 'correct' ? 'rgba(210,240,218,0.8)'
            : state === 'wrong'   ? 'rgba(255,212,212,0.8)'
            : 'rgba(228,233,240,0.7)',
  borderRadius: '12px',
  padding: '12px 16px',
  boxShadow: state === 'correct'
    ? 'inset 4px 4px 8px rgba(80,180,100,0.25), inset -4px -4px 8px rgba(255,255,255,0.5)'
    : state === 'wrong'
    ? 'inset 4px 4px 8px rgba(255,82,82,0.3), inset -4px -4px 8px rgba(255,200,200,0.4)'
    : 'inset 5px 5px 10px rgba(163,177,198,0.5), inset -5px -5px 10px rgba(255,255,255,0.5)',
  backdropFilter: 'blur(5px)',
  transition: 'all 0.4s ease',
});

const labelStyle = {
  fontWeight: 500,
  color: '#1c236d',
  fontSize: '0.82rem',
  marginBottom: '8px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const inputStyle = (state = 'idle') => ({
  flex: 1,
  border: 'none',
  background: 'transparent',
  padding: 0,
  fontSize: '0.9rem',
  color: state === 'correct' ? '#1a6b32'
       : state === 'wrong'   ? '#721c24'
       : '#1c236d',
  fontWeight: 500,
  outline: 'none',
  transition: 'color 0.3s ease',
});

const btnPrimary = (disabled) => ({
  width: '100%',
  background: '#1c236d',
  color: '#ffffff',
  border: 'none',
  borderRadius: '12px',
  padding: '1.1rem 2rem',
  fontSize: '1rem',
  fontWeight: 500,
  cursor: disabled ? 'not-allowed' : 'pointer',
  transition: 'all 0.3s ease',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  boxShadow: '0 8px 20px rgba(28,35,109,0.3)',
  textTransform: 'uppercase',
  letterSpacing: '1.5px',
  opacity: disabled ? 0.8 : 1,
});

// ─── Shared sub-components ────────────────────────────────────────────────────
function ErrorBox({ msg }) {
  if (!msg) return null;
  return (
    <div style={{
      borderRadius: '14px',
      marginBottom: '1.1rem',
      padding: '12px 16px',
      fontSize: '0.84rem',
      background: 'rgba(255,212,212,0.9)',
      color: '#721c24',
      boxShadow: 'inset 4px 4px 8px rgba(255,82,82,0.3), inset -4px -4px 8px rgba(255,255,255,0.3)',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      fontWeight: 500,
      width: '100%',
      backdropFilter: 'blur(5px)',
      animation: 'shake 0.4s ease',
    }}>
      <svg style={{ width: 16, height: 16, flexShrink: 0 }} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
      {msg}
    </div>
  );
}

function StepIndicator({ current }) {
  const steps = [
    { icon: faIdCard,       label: 'Check Number'       },
    { icon: faShieldHalved, label: 'Questions'  },
    { icon: faLock,         label: 'Password'    },
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'center', width: '100%', marginBottom: '2rem' }}>
      {steps.map((s, i) => {
        const done   = i < current;
        const active = i === current;
        const color  = done || active ? '#1c236d' : 'rgba(28,35,109,0.3)';
        return (
          <React.Fragment key={i}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1 }}>
              <div style={{
                width: 42, height: 42, borderRadius: '50%',
                background: done ? 'rgba(28,35,109,0.12)' : active ? 'rgba(28,35,109,0.08)' : 'rgba(228,233,240,0.5)',
                boxShadow: done || active
                  ? '4px 4px 8px rgba(163,177,198,0.5), -4px -4px 8px rgba(255,255,255,0.7)'
                  : 'inset 3px 3px 6px rgba(163,177,198,0.4), inset -3px -3px 6px rgba(255,255,255,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.4s ease',
                border: active ? '2px solid rgba(28,35,109,0.3)' : '2px solid transparent',
              }}>
                {done
                  ? <FontAwesomeIcon icon={faCheckCircle} style={{ color: '#1c236d', fontSize: '1.1rem' }} />
                  : <FontAwesomeIcon icon={s.icon} style={{ color, fontSize: '1rem' }} />}
              </div>
              <span style={{ fontSize: '0.68rem', fontWeight: 600, color, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                flex: 1, height: 2,
                background: i < current
                  ? 'linear-gradient(90deg, #1c236d, rgba(28,35,109,0.4))'
                  : 'rgba(163,177,198,0.4)',
                borderRadius: 2, margin: '0 4px', marginBottom: '18px',
                transition: 'background 0.5s ease',
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Step 1: Check Number ─────────────────────────────────────────────────────
function Step1({ onNext }) {
  const [checkNumber, setCheckNumber] = useState('');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!checkNumber.trim()) { setError('Please enter your check number.'); return; }
    setLoading(true); setError('');
    try {
      const data = await post('/api/auth/forgot-password/step1/', { check_number: checkNumber.trim() });
      onNext({ sessionKey: data.session_key, questions: data.questions, fullName: data.full_name, rank: data.rank });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '340px' }}>
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#1c236d', marginBottom: '0.35rem' }}>
          Forgot Password
        </h2>
        <p style={{ fontSize: '0.84rem', color: 'rgba(28,35,109,0.65)', fontWeight: 500, lineHeight: 1.5 }}>
          Enter your check number to begin identity verification.
        </p>
      </div>
      <ErrorBox msg={error} />
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={labelStyle}>Check Number</label>
          <div style={inputWrapper()} className="neumorphic-input-wrapper">
            <FontAwesomeIcon icon={faIdCard} style={{ color: '#1c236d', fontSize: '1rem', marginRight: '12px', width: 18, flexShrink: 0 }} />
            <input
              type="text"
              value={checkNumber}
              onChange={e => { setCheckNumber(e.target.value); setError(''); }}
              placeholder="12985621"
              style={inputStyle()}
              disabled={loading}
              autoFocus
            />
          </div>
        </div>
        <button type="submit" disabled={loading} style={btnPrimary(loading)} className="neumorphic-submit-btn">
          {loading
            ? <><FontAwesomeIcon icon={faSpinner} spin /> Verifying...</>
            : <> Continue</>}
        </button>
      </form>
    </div>
  );
}

// ─── Question dot tracker ─────────────────────────────────────────────────────
function QuestionDots({ total, current, results }) {
  return (
    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '1.5rem' }}>
      {Array.from({ length: total }).map((_, i) => {
        const r = results[i]; // 'correct' | 'wrong' | undefined
        const isActive = i === current;
        return (
          <div key={i} style={{
            width:  isActive ? 28 : 10,
            height: 10,
            borderRadius: 8,
            background: r === 'correct' ? '#1a8c3d'
                      : r === 'wrong'   ? '#c0392b'
                      : r === 'skipped' ? '#f0ad4e'
                      : isActive        ? '#1c236d'
                      :                  'rgba(163,177,198,0.5)',
            boxShadow: isActive
              ? '0 0 8px rgba(28,35,109,0.4)'
              : r === 'correct' ? '0 0 6px rgba(26,140,61,0.4)'
              : r === 'wrong'   ? '0 0 6px rgba(192,57,43,0.4)'
              : 'inset 2px 2px 4px rgba(163,177,198,0.4), inset -2px -2px 4px rgba(255,255,255,0.4)',
            transition: 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
          }} />
        );
      })}
    </div>
  );
}

// ─── Feedback badge (correct / wrong) ────────────────────────────────────────
function FeedbackBadge({ state }) {
  if (!state) return null;

  const isCorrect = state === 'correct';
  const isWrong = state === 'wrong';
  const isSkipped = state === 'skipped';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 16px',
        borderRadius: '12px',
        background: isCorrect
          ? 'rgba(210,240,218,0.9)'
          : isSkipped
          ? 'rgba(255,243,205,0.95)'
          : 'rgba(255,212,212,0.9)',
        color: isCorrect
          ? '#1a6b32'
          : isSkipped
          ? '#856404'
          : '#721c24',
        fontSize: '0.85rem',
        fontWeight: 600,
        width: '100%',
        marginTop: '10px',
      }}
    >
      <FontAwesomeIcon
        icon={
          isCorrect
            ? faCheckCircle
            : isSkipped
            ? faChevronRight
            : faXmarkCircle
        }
      />

      {isCorrect && 'Correct! Moving to next question…'}

      {isSkipped &&
        'Question skipped. Moving to the next question...'}

      {isWrong && 'Incorrect answer. Please try again.'}
    </div>
  );
}

// ─── Step 2: One-by-one NIDA questions ───────────────────────────────────────
function Step2({ sessionKey, questions, fullName, rank, onNext, onBack }) {
  const [current, setCurrent]   = useState(0);       // which question index
  const [answer, setAnswer]     = useState('');
  const [loading, setLoading]   = useState(false);
  const [feedback, setFeedback] = useState(null);    // null | 'correct' | 'wrong'
  const [results, setResults]   = useState({});      // { 0: 'correct', 1: 'wrong', … }
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [fatalError, setFatalError]     = useState('');
  const inputRef = useRef(null);

  // Focus input whenever question changes
  useEffect(() => {
    setAnswer('');
    setFeedback(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [current]);

  const q = questions[current];
  const total = questions.length;

 

const handleSubmit = async (e) => {
  e.preventDefault();

  if (loading) return;
if (!answer.trim()) {
  handleSkip();
  return;
}
  setLoading(true);

  try {
    const data = await post(
      '/api/auth/forgot-password/check-answer/',
      {
        session_key: sessionKey,
        question_id: q.id,
        answer: answer.trim(),
      }
    );

    const resultState = data.correct ? 'correct' : 'wrong';

    setResults(r => ({
      ...r,
      [current]: resultState,
    }));

    setFeedback(resultState);

    setTimeout(() => {
      if (data.all_done) {
        if (data.passed) {
          onNext({
            resetToken: data.reset_token,
            sessionKey,
          });
        } else {
          setFatalError(
            data.error ||
            `Verification failed. Score: ${data.score}/5`
          );
        }
      } else {
        setCurrent(c => c + 1);
      }
    }, 800);

  } catch (err) {
    setFatalError(
      err.message || 'Verification failed.'
    );
  } finally {
    setLoading(false);
  }
};

 const handleSkip = async () => {
  if (loading) return;

  setLoading(true);

  try {
    const data = await post(
      '/api/auth/forgot-password/check-answer/',
      {
        session_key: sessionKey,
        question_id: q.id,
        answer: '', // skipped question
      }
    );

    setResults(r => ({
      ...r,
      [current]: 'skipped',
    }));

    setFeedback('skipped');

    setTimeout(() => {
      if (data.all_done) {
        if (data.passed) {
          onNext({
            resetToken: data.reset_token,
            sessionKey,
          });
        } else {
          setFatalError(
            data.error ||
            `Verification failed. Score: ${data.score}/5`
          );
        }
      } else {
        setCurrent(c => c + 1);
      }
    }, 800);

  } catch (err) {
    setFatalError(
      err.message || 'Verification failed.'
    );
  } finally {
    setLoading(false);
  }
};
  if (fatalError) {
    return (
      <div style={{ width: '100%', maxWidth: '360px', textAlign: 'center' }}>
        <div style={{
          width: 60, height: 60, borderRadius: '50%',
          background: 'rgba(255,212,212,0.7)',
          boxShadow: '6px 6px 12px rgba(163,177,198,0.4), -6px -6px 12px rgba(255,255,255,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.2rem',
        }}>
          <FontAwesomeIcon icon={faXmarkCircle} style={{ color: '#c0392b', fontSize: '1.8rem' }} />
        </div>
        <p style={{ color: '#721c24', fontWeight: 600, fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
          {fatalError}
        </p>
        <button onClick={onBack} style={btnPrimary(false)} className="neumorphic-submit-btn">
          <FontAwesomeIcon icon={faArrowLeft} /> Start Over
        </button>
      </div>
    );
  }

  const isFeedbackCorrect = feedback === 'correct';
  const isFeedbackWrong   = feedback === 'wrong';
  const isFeedbackSkipped = feedback === 'skipped';
  const inputState = isFeedbackCorrect ? 'correct' : isFeedbackWrong ? 'wrong' : 'idle';

  return (
    <div style={{ width: '100%', maxWidth: '380px' }}>
      {/* Officer badge */}
      {fullName && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '10px 14px', borderRadius: '14px',
          background: 'rgba(28,35,109,0.07)',
          boxShadow: '4px 4px 8px rgba(163,177,198,0.4), -4px -4px 8px rgba(255,255,255,0.6)',
          marginBottom: '1.4rem',
        }}>
          <FontAwesomeIcon icon={faShieldHalved} style={{ color: '#1c236d', fontSize: '1.1rem' }} />
          <div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(28,35,109,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{rank}</div>
            <div style={{ fontSize: '0.9rem', color: '#1c236d', fontWeight: 600 }}>{fullName}</div>
          </div>
          {attemptsLeft < 3 && (
            <div style={{ marginLeft: 'auto', fontSize: '0.75rem', fontWeight: 700, color: '#c0392b', background: 'rgba(255,212,212,0.6)', borderRadius: '8px', padding: '3px 8px' }}>
              {attemptsLeft} attempt{attemptsLeft !== 1 ? 's' : ''} left
            </div>
          )}
        </div>
      )}

      {/* Progress dots */}
      <QuestionDots total={total} current={current} results={results} />

      {/* Question counter */}
      <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(28,35,109,0.45)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          Question {current + 1} of {total}
        </span>
      </div>

      {/* Question card */}
      <div style={{
        background: 'rgba(228,233,240,0.6)',
        borderRadius: '16px',
        padding: '1rem 1.2rem',
        marginBottom: '1.2rem',
        boxShadow: '5px 5px 10px rgba(163,177,198,0.4), -5px -5px 10px rgba(255,255,255,0.6)',
        animation: 'fadeSlideIn 0.3s ease',
      }}>
        <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1c236d', lineHeight: 1.55, margin: 0 }}>
          {q.question}
        </p>
      </div>

      {/* Answer form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={labelStyle}>Your Answer</label>
          <div style={inputWrapper(inputState)} className="neumorphic-input-wrapper">
            <input
              ref={inputRef}
              type="text"
              value={answer}
              onChange={e => { if (!isFeedbackCorrect) { setAnswer(e.target.value); } }}
              placeholder="Type your answer here…"
              style={inputStyle(inputState)}
              disabled={loading || isFeedbackCorrect}
              autoComplete="off"
            />
            {loading && (
              <FontAwesomeIcon icon={faSpinner} spin style={{ color: '#1c236d', fontSize: '0.9rem', marginLeft: '8px' }} />
            )}
            {isFeedbackCorrect && (
              <FontAwesomeIcon icon={faCheckCircle} style={{ color: '#1a8c3d', fontSize: '1rem', marginLeft: '8px' }} />
            )}
            {isFeedbackWrong && (
              <FontAwesomeIcon icon={faXmarkCircle} style={{ color: '#c0392b', fontSize: '1rem', marginLeft: '8px' }} />
            )}
          </div>

          <FeedbackBadge state={feedback} />
        </div>
{!feedback && (
  <button
    type="submit"
    disabled={loading}
    style={{
      ...btnPrimary(loading),
      marginTop: '1.25rem'
    }}
    className="neumorphic-submit-btn"
  >
    {loading ? (
      <>
        <FontAwesomeIcon icon={faSpinner} spin /> Processing...
      </>
    ) : current + 1 === total ? (
      <>
        <FontAwesomeIcon icon={faCheckCircle} /> Submit
      </>
    ) : (
      <>
        Next
      </>
    )}
  </button>
)}
      </form>
    </div>
  );
}

// ─── Step 3: New Password ─────────────────────────────────────────────────────
function Step3({ sessionKey, resetToken, onBack, onDone }) {
  const [form, setForm]       = useState({ new_password: '', confirm_password: '' });
  const [showPwd, setShowPwd] = useState({ new: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleChange = (e) => { setForm(f => ({ ...f, [e.target.name]: e.target.value })); setError(''); };

  const strength = (() => {
    const p = form.new_password;
    let s = 0;
    if (p.length >= 8)           s++;
    if (/[A-Z]/.test(p))         s++;
    if (/[0-9]/.test(p))         s++;
    if (/[^A-Za-z0-9]/.test(p))  s++;
    return s;
  })();

  const strengthMeta = [
    null,
    { label: 'Weak',   color: '#d9534f' },
    { label: 'Fair',   color: '#e8a838' },
    { label: 'Good',   color: '#5cb85c' },
    { label: 'Strong', color: '#1c8c3d' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.new_password || !form.confirm_password) { setError('Please fill in all fields.'); return; }
    if (form.new_password !== form.confirm_password)   { setError('Passwords do not match.');   return; }
    if (form.new_password.length < 8)                  { setError('Minimum 8 characters required.'); return; }
    setLoading(true); setError('');
    try {
      await post('/api/auth/forgot-password/step3/', {
        session_key:      sessionKey,
        reset_token:      resetToken,
        new_password:     form.new_password,
        confirm_password: form.confirm_password,
      });
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

 
  const EyeBtn = ({ field }) => (
    <button
      type="button"
      onClick={() => setShowPwd(s => ({ ...s, [field]: !s[field] }))}
      style={{ background: 'rgba(228,233,240,0.7)', border: 'none', padding: '6px', marginLeft: '8px', cursor: 'pointer', color: '#1c236d', width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '4px 4px 8px rgba(163,177,198,0.5), -4px -4px 8px rgba(255,255,255,0.5)' }}
      className="neumorphic-eye-toggle"
    >
      <FontAwesomeIcon icon={showPwd[field] ? faEyeSlash : faEye} />
    </button>
  );

  return (
    <div style={{ width: '100%', maxWidth: '340px' }}>
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#1c236d', marginBottom: '0.35rem' }}>Set New Password</h2>
        <p style={{ fontSize: '0.84rem', color: 'rgba(28,35,109,0.65)', fontWeight: 500, lineHeight: 1.5 }}>
          Choose a strong password for your account.
        </p>
      </div>
      <ErrorBox msg={error} />
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={labelStyle}>New Password</label>
          <div style={inputWrapper()} className="neumorphic-input-wrapper">
            <FontAwesomeIcon icon={faLock} style={{ color: '#1c236d', fontSize: '1rem', marginRight: '12px', width: 18, flexShrink: 0 }} />
            <input type={showPwd.new ? 'text' : 'password'} name="new_password" value={form.new_password} onChange={handleChange} placeholder="Min. 8 characters" style={inputStyle()} disabled={loading} />
            <EyeBtn field="new" />
          </div>
          {form.new_password && (
            <div style={{ marginTop: '8px' }}>
              <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                {[1,2,3,4].map(i => (
                  <div key={i} style={{ flex: 1, height: 4, borderRadius: 3, background: i <= strength ? strengthMeta[strength]?.color : 'rgba(163,177,198,0.3)', transition: 'background 0.3s ease', boxShadow: i <= strength ? `0 0 6px ${strengthMeta[strength]?.color}55` : 'none' }} />
                ))}
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: strengthMeta[strength]?.color }}>{strengthMeta[strength]?.label}</span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={labelStyle}>Confirm Password</label>
          <div style={inputWrapper()} className="neumorphic-input-wrapper">
            <FontAwesomeIcon icon={faLock} style={{ color: '#1c236d', fontSize: '1rem', marginRight: '12px', width: 18, flexShrink: 0 }} />
            <input type={showPwd.confirm ? 'text' : 'password'} name="confirm_password" value={form.confirm_password} onChange={handleChange} placeholder="Re-enter new password" style={inputStyle()} disabled={loading} />
            <EyeBtn field="confirm" />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button type="button" onClick={onBack} style={{ flex: '0 0 auto', background: 'rgba(228,233,240,0.7)', color: '#1c236d', border: 'none', borderRadius: '12px', padding: '1rem 1.25rem', fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer', boxShadow: '5px 5px 10px rgba(163,177,198,0.5), -5px -5px 10px rgba(255,255,255,0.5)', transition: 'all 0.3s ease' }} className="neumorphic-back-btn">
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>
          <button type="submit" disabled={loading} style={{ ...btnPrimary(loading), flex: 1 }} className="neumorphic-submit-btn">
            {loading ? <><FontAwesomeIcon icon={faSpinner} spin /> Resetting…</> : <><FontAwesomeIcon icon={faLock} /> Reset Password</>}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Success ──────────────────────────────────────────────────────────────────
function SuccessScreen({ onLogin }) {
  return (
    <div style={{ textAlign: 'center', padding: '1rem 0' }}>
      <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(28,35,109,0.08)', boxShadow: '8px 8px 16px rgba(163,177,198,0.5), -8px -8px 16px rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', animation: 'popIn 0.5s cubic-bezier(0.175,0.885,0.32,1.275)' }}>
        <FontAwesomeIcon icon={faCheckCircle} style={{ color: '#1c8c3d', fontSize: '2rem' }} />
      </div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1c236d', marginBottom: '0.5rem' }}>Password Reset Successful</h2>
      <p style={{ fontSize: '0.85rem', color: 'rgba(28,35,109,0.65)', fontWeight: 500, lineHeight: 1.6, marginBottom: '2rem' }}>
        Your password has been updated. You can now sign in with your new credentials.
      </p>
      <button onClick={onLogin} style={{ ...btnPrimary(false), maxWidth: '220px', margin: '0 auto' }} className="neumorphic-submit-btn">
        Go to Login
      </button>
    </div>
  );
}

// ─── Root wizard ──────────────────────────────────────────────────────────────
export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep]   = useState(0);
  const [state, setState] = useState({});

  const goNext = (extra) => { setState(s => ({ ...s, ...extra })); setStep(s => s + 1); };
  const goBack = () => setStep(s => Math.max(0, s - 1));

  return (
    <>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundImage: 'url(/background.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', backgroundAttachment: 'fixed', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', padding: '20px', overflow: 'auto', zIndex: 0 }}>
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(228,233,240,0.3)', zIndex: 1 }} />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', maxWidth: '500px', zIndex: 2, position: 'relative' }} className="login-card-container">
          <div style={card}>

            {/* Logo */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ margin: '0 auto 1rem', width: 90, height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src="/police_logo.png" alt="Tanzania Police Force Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.1))' }} onError={e => { e.target.style.display = 'none'; }} />
              </div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 500, color: '#1c236d', marginBottom: '0.25rem', letterSpacing: '1px' }}>
                Compensation Management
              </h1>
            </div>

            {step < 3 && <StepIndicator current={step} />}

            {step === 0 && <Step1 onNext={goNext} />}
            {step === 1 && <Step2 sessionKey={state.sessionKey} questions={state.questions} fullName={state.fullName} rank={state.rank} onNext={goNext} onBack={goBack} />}
            {step === 2 && <Step3 sessionKey={state.sessionKey} resetToken={state.resetToken} onBack={goBack} onDone={() => setStep(3)} />}
            {step === 3 && <SuccessScreen onLogin={() => navigate('/login')} />}

            {step < 3 && (
              <button onClick={() => navigate('/login')} style={{ marginTop: '1.5rem', background: 'none', border: 'none', color: 'rgba(28,35,109,0.6)', fontSize: '0.82rem', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'color 0.2s ease' }} className="back-to-login-link">
                <FontAwesomeIcon icon={faArrowLeft} style={{ fontSize: '0.75rem' }} /> Back to Login
              </button>
            )}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: 100%; height: 100%; overflow-x: hidden; }
        @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-5px)} 75%{transform:translateX(5px)} }
        @keyframes popIn { 0%{transform:scale(0.5);opacity:0} 100%{transform:scale(1);opacity:1} }
        @keyframes fadeSlideIn { 0%{opacity:0;transform:translateY(6px)} 100%{opacity:1;transform:translateY(0)} }
        .neumorphic-input-wrapper:focus-within {
          box-shadow: inset 6px 6px 12px rgba(163,177,198,0.6), inset -6px -6px 12px rgba(255,255,255,0.6) !important;
          background: rgba(228,233,240,0.9) !important;
        }
        .neumorphic-eye-toggle:hover { box-shadow: inset 3px 3px 6px rgba(163,177,198,0.5), inset -3px -3px 6px rgba(255,255,255,0.5) !important; }
        .neumorphic-submit-btn { color:#ffffff !important; }
        .neumorphic-submit-btn:hover:not(:disabled) { background:#2d3a8c !important; transform:translateY(-2px); box-shadow:0 12px 24px rgba(28,35,109,0.35) !important; }
        .neumorphic-submit-btn:active:not(:disabled) { transform:translateY(0); background:#0f1441 !important; }
        .neumorphic-back-btn:hover { background:rgba(228,233,240,0.95) !important; box-shadow:2px 2px 6px rgba(163,177,198,0.5), -2px -2px 6px rgba(255,255,255,0.5) !important; }
        .back-to-login-link:hover { color:#1c236d !important; }
        input::placeholder { color:rgba(28,35,109,0.4); font-weight:500; }
        @media(max-width:768px){ .login-card-container{max-width:95% !important;padding:10px !important;} }
        @media(max-width:480px){ .neumorphic-submit-btn{padding:12px 16px !important;font-size:0.85rem !important;} }
      `}} />
    </>
  );
}