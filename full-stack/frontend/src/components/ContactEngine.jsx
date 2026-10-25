import { useState } from 'react';
import { api } from '../api/client';

const TIER_COLOR = {
  VERIFIED: 'var(--green)',
  STRONG:   '#84cc16',
  PROBABLE: 'var(--orange)',
  GUESS:    'var(--red)',
};

export default function ContactEngine() {
  const [text, setText] = useState('');
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [infer, setInfer] = useState('');

  async function run() {
    setBusy(true);
    const people = infer.split('\n').map(l => {
      const [first, last, domain] = l.split(',').map(s => s.trim());
      return { first, last, domain };
    }).filter(p => p.first && p.last && p.domain);
    try {
      setRes(await api.extract({ text, html: text.includes('<') ? text : '', infer_for: people }));
    } catch (e) {
      setRes({ error: String(e) });
    } finally { setBusy(false); }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Contact Engine</h1>
        <p>SMTP-verified emails and validated phone numbers — no API spend.</p>
      </div>

      <div className="two-col" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="panel">
          <div className="panel-title">Input text or HTML</div>
          <textarea
            className="input"
            rows={8}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Paste page text or HTML to extract contacts from…"
            style={{ marginBottom: 12 }}
          />
          <div className="panel-title" style={{ margin: '0 0 8px' }}>Pattern inference (optional)</div>
          <textarea
            className="input"
            rows={3}
            value={infer}
            onChange={e => setInfer(e.target.value)}
            placeholder="One per line: first, last, company.com"
            style={{ marginBottom: 14 }}
          />
          <button
            className="btn btn-primary"
            onClick={run}
            disabled={busy || !text.trim()}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {busy ? '⏳ Extracting…' : '⚡ Extract & Verify'}
          </button>
        </div>

        <div className="panel">
          <div className="panel-title">Results</div>

          {!res && (
            <div className="empty-note">
              Paste text on the left and click Extract to see emails, phones, and inferred contacts.
            </div>
          )}

          {res?.error && (
            <div className="alert alert-error">{res.error}</div>
          )}

          {res?.warnings?.length > 0 && (
            <div className="alert alert-warn" style={{ marginBottom: 12 }}>
              {res.warnings.map((w, i) => <div key={i}>{w}</div>)}
            </div>
          )}

          {res?.emails?.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>
                Emails · {res.emails.length}
              </div>
              {res.emails.map((e, i) => (
                <div key={i} className="activity-row" style={{ padding: '8px 4px' }}>
                  <span style={{ flex: 1, fontWeight: 500 }}>{e.value}</span>
                  <span style={{ color: TIER_COLOR[e.tier] ?? 'var(--text-dim)', fontSize: 11.5, fontWeight: 600 }}>{e.tier}</span>
                  <span style={{ color: 'var(--text-faint)', fontSize: 11 }}>{e.confidence}</span>
                </div>
              ))}
            </>
          )}

          {res?.phones?.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.08em', margin: '14px 0 8px' }}>
                Phones · {res.phones.length}
              </div>
              {res.phones.map((p, i) => (
                <div key={i} className="activity-row" style={{ padding: '8px 4px' }}>
                  <span style={{ flex: 1, fontWeight: 500 }}>{p.e164}</span>
                  <span style={{ color: 'var(--text-dim)', fontSize: 11.5 }}>{p.line_type}{p.is_mobile ? ' · mobile' : ''}</span>
                  <span style={{ color: 'var(--text-faint)', fontSize: 11 }}>{p.carrier} {p.area}</span>
                  <span style={{ color: 'var(--text-faint)', fontSize: 11 }}>{p.confidence}</span>
                </div>
              ))}
            </>
          )}

          {res?.inferred?.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.08em', margin: '14px 0 8px' }}>
                Inferred (verified) · {res.inferred.length}
              </div>
              {res.inferred.map((p, i) => (
                <div key={i} className="activity-row" style={{ padding: '8px 4px', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                  <span style={{ fontWeight: 500 }}>{p.value}</span>
                  <span style={{ color: 'var(--text-dim)', fontSize: 11.5 }}>{p.evidence}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
