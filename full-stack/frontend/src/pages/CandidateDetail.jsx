import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useStore, actions } from '../store/candidatesStore.js';

const STAGES = ['Sourced', 'Screened', 'Shortlisted', 'Contacted', 'Opted out'];

export default function CandidateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { candidates } = useStore();

  const idx = candidates.findIndex(c => c.id === id);
  const c = candidates[idx] ?? candidates[0];

  const [chat, setChat] = useState([
    { from: 'me', text: `Hi ${c.name.split(' ')[0]}! Can you tell me about your experience with ${c.skills[0]} in production?` },
    { from: 'them', text: `Sure! At my current role I've worked extensively with ${c.skills[0]} and ${c.skills[1] || 'related tools'}, scaling systems to handle real production load.` },
    { from: 'me', text: "That's really helpful context. Have you also worked with connection pooling?" },
  ]);
  const [draft, setDraft] = useState('');

  const goto = dir => {
    const next = (idx + dir + candidates.length) % candidates.length;
    navigate(`/candidates/${candidates[next].id}`);
  };

  const send = () => {
    if (!draft.trim()) return;
    setChat(prev => [...prev, { from: 'me', text: draft }]);
    setDraft('');
  };

  const isShortlisted = c.stage === 'Shortlisted';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Link to="/candidates" style={{ color: 'var(--text-dim)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
          ← Back
        </Link>
        <span style={{ color: 'var(--border)', fontSize: 13 }}>|</span>
        <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>
          {idx + 1} of {candidates.length}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="btn" onClick={() => goto(-1)}>← Previous</button>
          <button className="btn" onClick={() => goto(1)}>Next →</button>
        </div>
      </div>

      {/* Header card */}
      <div className="panel" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div className="avatar-dot" style={{ background: c.color, width: 54, height: 54, fontSize: 19 }}>{c.initials}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 20 }}>{c.name}</div>
          <div style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 2 }}>{c.title} · {c.location}</div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className={`badge badge-blue`}>{c.source}</span>
            <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>Added 2 days ago</span>
            {/* Stage selector */}
            <select
              className="input"
              style={{ width: 'auto', padding: '3px 8px', fontSize: 12 }}
              value={c.stage}
              onChange={e => actions.setStage(c.id, e.target.value)}
              onClick={e => e.stopPropagation()}
            >
              {STAGES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <div style={{
            border: '3px solid var(--teal)', borderRadius: '50%', width: 60, height: 60,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 18, color: 'var(--teal)',
          }}>{c.fit}%</div>
          <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4 }}>Fit Score</div>
        </div>
      </div>

      {/* Body */}
      <div className="detail-grid" style={{ marginBottom: 16 }}>
        {/* Left: AI analysis */}
        <div className="panel">
          <div className="panel-title">✨ Why this candidate</div>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.7, marginTop: 0 }}>{c.why}</p>

          <div style={{ fontSize: 12.5, fontWeight: 600, margin: '14px 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: 'var(--green)' }}>✓</span> Matched skills
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {c.skills.map(s => (
              <span key={s} className="pill-skill" style={{ borderColor: 'var(--teal)', color: 'var(--teal)' }}>{s}</span>
            ))}
          </div>

          <div style={{ fontSize: 12.5, fontWeight: 600, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: 'var(--orange)' }}>⚠</span> Potential gaps
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {c.gaps.length > 0
              ? c.gaps.map(s => <span key={s} className="pill-skill" style={{ borderColor: 'var(--orange)', color: 'var(--orange)' }}>{s}</span>)
              : <span style={{ fontSize: 12.5, color: 'var(--green)' }}>No significant gaps</span>}
          </div>

          <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>📋 Bottom line</div>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 0, lineHeight: 1.6 }}>
            Strong technical fit with relevant experience and clear ownership.
            {c.gaps.length > 0 ? ` Minor gaps in ${c.gaps.join(' and ')} that can be learned.` : ''}
          </p>
        </div>

        {/* Right: Experience + Screening chat */}
        <div className="panel">
          <div className="panel-title">📁 Experience</div>
          {c.experience.map((e, i) => (
            <div key={i} style={{ marginBottom: 16, paddingLeft: 14, borderLeft: '2px solid var(--border)' }}>
              <div style={{ fontWeight: 600, fontSize: 13.5 }}>{e.role}</div>
              <div style={{ color: 'var(--text-dim)', fontSize: 12 }}>{e.company} · {e.period}</div>
              <div style={{ color: 'var(--text-faint)', fontSize: 12, marginTop: 4 }}>{e.detail}</div>
            </div>
          ))}
          <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 4 }}>🎓 {c.education}</div>

          <div className="panel-title" style={{ marginTop: 22 }}>
            💬 AI Screening Chat
            <span className="badge badge-green">● Live</span>
          </div>
          <div style={{ maxHeight: 190, overflowY: 'auto', marginBottom: 10 }}>
            {chat.map((m, i) => (
              <div key={i} className={`chat-bubble ${m.from === 'me' ? 'me' : ''}`}>{m.text}</div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="input"
              placeholder="Type a follow-up question…"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
            />
            <button className="btn btn-primary" onClick={send}>Send</button>
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="panel" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button
          className={`btn ${isShortlisted ? '' : 'btn-primary'}`}
          onClick={() => actions.toggleShortlist(c.id)}
        >
          {isShortlisted ? '✕ Remove from shortlist' : '★ Add to shortlist'}
        </button>

        <Link to="/outreach" className="btn">✉ Generate outreach draft</Link>

        <div style={{ flex: 1 }} />

        {/* Consent toggle */}
        <span style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>
          {c.opted ? 'Open to opportunities' : 'Not opted in'}
        </span>
        <button
          className={`toggle ${c.opted ? 'on' : ''}`}
          onClick={() => actions.toggleConsent(c.id)}
          role="switch"
          aria-checked={c.opted}
          title="Toggle candidate consent"
        >
          <div className="knob" />
        </button>
        <span style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>Consent</span>
      </div>
    </div>
  );
}
