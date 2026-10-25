import { useState } from 'react';
import { useStore, actions } from '../store/candidatesStore.js';

function buildDraft(c) {
  return {
    subject: `Your ${c.skills[0]} work caught my eye`,
    body: `Hi ${c.name.split(' ')[0]},\n\nI came across your background in ${c.skills.slice(0, 2).join(' and ')} and think your experience lines up well with a role we're hiring for.\n\nWe're looking for a ${c.title} and your experience with ${c.skills.join(', ')} looks like a strong fit. The role focuses on our core platform with an emphasis on scalability and developer experience.\n\nI'd love to chat if you're open to new opportunities — would you have time for a quick call next week?\n\nBest,\nJamie\nSenior Recruiter, HireWave`,
  };
}

export default function Outreach() {
  const { candidates, outreachStatus } = useStore();
  const shortlisted = candidates.filter(c => ['Shortlisted', 'Screened', 'Sourced'].includes(c.stage)).slice(0, 5);
  const [activeId, setActiveId] = useState(shortlisted[0]?.id ?? candidates[0]?.id);
  const [drafts, setDrafts] = useState(() => {
    const map = {};
    candidates.forEach(c => { map[c.id] = buildDraft(c); });
    return map;
  });

  const active = candidates.find(c => c.id === activeId) ?? candidates[0];
  const draft = drafts[active.id] ?? buildDraft(active);
  const isConsented = active.opted;
  const sent = outreachStatus[active.id] === 'Sent';

  const setDraft = patch => setDrafts(prev => ({ ...prev, [active.id]: { ...draft, ...patch } }));

  const selectCandidate = cid => setActiveId(cid);

  const regenerate = () => {
    setDrafts(prev => ({ ...prev, [active.id]: buildDraft(active) }));
  };

  const generate = () => {
    const newDraft = {
      subject: `Exciting ${active.skills[0]} opportunity at HireWave`,
      body: `Hi ${active.name.split(' ')[0]},\n\nYour profile stood out while I was sourcing for a ${active.title} role. Your background in ${active.skills.slice(0, 3).join(', ')} is exactly what we're looking for.\n\nThis is a high-impact position with significant ownership. Happy to share more details if you're open to a quick conversation.\n\nBest,\nJamie`,
    };
    setDrafts(prev => ({ ...prev, [active.id]: newDraft }));
  };

  const markSent = () => {
    if (!isConsented) return;
    actions.markSent(active.id);
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Outreach Studio</h1>
          <p>Write, personalize, and send outreach to your shortlisted candidates.</p>
        </div>
        <span style={{ fontSize: 12.5, color: 'var(--text-faint)', marginTop: 4 }}>Berlin Senior Backend Developer</span>
      </div>

      {/* Candidate strip */}
      <div className="panel" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, overflowX: 'auto', padding: '14px 16px' }}>
        <span style={{ fontSize: 12, color: 'var(--text-dim)', flexShrink: 0 }}>Candidates · {shortlisted.length}</span>
        {shortlisted.map(c => {
          const isSent = outreachStatus[c.id] === 'Sent';
          return (
            <button
              key={c.id}
              onClick={() => selectCandidate(c.id)}
              className="btn"
              style={{
                flexDirection: 'column', alignItems: 'flex-start', gap: 3, minWidth: 110,
                background: activeId === c.id ? 'var(--teal-dim)' : 'var(--bg-panel-2)',
                borderColor: activeId === c.id ? 'var(--teal)' : 'var(--border)',
                boxShadow: activeId === c.id ? '0 0 10px var(--teal-glow)' : 'none',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="avatar-dot" style={{ background: c.color, width: 18, height: 18, fontSize: 8 }}>{c.initials}</span>
                {c.name.split(' ')[0]}
              </span>
              <span style={{ fontSize: 10.5, color: isSent ? 'var(--green)' : c.opted ? 'var(--text-dim)' : 'var(--red)' }}>
                {c.fit}% · {isSent ? '✓ Sent' : c.opted ? 'Ready' : '⚠ No consent'}
              </span>
            </button>
          );
        })}
      </div>

      <div className="two-col" style={{ gridTemplateColumns: '1.6fr 1fr' }}>
        {/* Email editor */}
        <div className="panel">
          <div className="panel-title">
            ✉ Draft — {active.name.split(' ')[0]}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" onClick={generate}>✨ Generate</button>
              <button className="btn" onClick={regenerate}>↻ Regenerate</button>
            </div>
          </div>
          <label style={{ fontSize: 11.5, color: 'var(--text-faint)', display: 'block', marginBottom: 4 }}>Subject</label>
          <input className="input" style={{ marginBottom: 12 }} value={draft.subject} onChange={e => setDraft({ subject: e.target.value })} />
          <label style={{ fontSize: 11.5, color: 'var(--text-faint)', display: 'block', marginBottom: 4 }}>Message</label>
          <textarea className="input" rows={11} value={draft.body} onChange={e => setDraft({ body: e.target.value })} />
          <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--text-faint)', marginTop: 6 }}>{draft.body.length} chars</div>
        </div>

        {/* Sending history */}
        <div className="panel">
          <div className="panel-title">
            Sending History
            <span style={{ fontSize: 11.5, color: 'var(--text-dim)', fontWeight: 500 }}>All ▾</span>
          </div>
          {shortlisted.map(c => (
            <div className="activity-row" key={c.id}>
              <div className="avatar-dot" style={{ background: c.color, width: 24, height: 24, fontSize: 9 }}>{c.initials}</div>
              <span style={{ flex: 1, fontSize: 12.5 }}>{c.name}</span>
              <span className={`badge ${outreachStatus[c.id] === 'Sent' ? 'badge-green' : 'badge-gray'}`}>
                {outreachStatus[c.id] === 'Sent' ? '✓ Sent' : '✎ Draft'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Consent + send */}
      <div className="panel" style={{ marginTop: 14 }}>
        <div className="panel-title">📝 Consent & Send — {active.name}</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          <span className="pill-skill">Ref: {active.skills[0]} on GitHub</span>
          <span className="pill-skill">{active.experience?.length ?? 3}+ yrs exp</span>
          <span className="pill-skill">Open to relocation</span>
        </div>

        {!isConsented ? (
          <div className="alert alert-warn">⚠ Candidate has not opted in — toggle consent before sending.</div>
        ) : sent ? (
          <div className="alert alert-success">✓ Outreach sent to {active.name}. Stage moved to Contacted.</div>
        ) : (
          <div className="alert alert-info">✓ Candidate has opted in and can be contacted.</div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
          <button
            className={`toggle ${isConsented ? 'on' : ''}`}
            onClick={() => actions.toggleConsent(active.id)}
            role="switch"
            aria-checked={isConsented}
            title="Toggle consent"
          >
            <div className="knob" />
          </button>
          <span style={{ fontSize: 12.5, flex: 1 }}>
            Consent —&nbsp;
            <span style={{ color: isConsented ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
              {isConsented ? 'opted in' : 'opted out'}
            </span>
          </span>
          <button className="btn btn-primary" disabled={!isConsented || sent} onClick={markSent}>
            {sent ? '✓ Sent' : '✓ Approve & mark as sent'}
          </button>
        </div>
      </div>
    </div>
  );
}
