import { useEffect, useState } from 'react';

// Talks to the real Flask backend from your enhanced-contact-extractor project
// (app.py: /api/extract, /api/enrich, /api/verify-phone, /api/contacts, /api/suppress, /api/anonymize, /api/export)
const TOKEN = import.meta.env.VITE_API_TOKEN;
const auth = TOKEN ? { Authorization: 'Bearer ' + TOKEN } : {};

async function api(path, opts = {}) {
  const r = await fetch('/api' + path, { ...opts, headers: { ...auth, ...opts.headers } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Request failed');
  return j;
}
const post = body => ({ method: 'POST', headers: { 'Content-Type': 'application/json', ...auth }, body: JSON.stringify(body) });

export default function ContactExtractor() {
  const [mode, setMode] = useState('text'); // text | url | pdf
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [js, setJs] = useState(true);
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [warnings, setWarnings] = useState([]);
  const [backendOnline, setBackendOnline] = useState(null);

  const load = () => api('/contacts').then(r => { setRows(r); setBackendOnline(true); }).catch(() => setBackendOnline(false));
  useEffect(() => { load(); }, []);

  const run = async (fn) => {
    setBusy(true); setErr('');
    try { await fn(); await load(); } catch (e) { setErr(e.message); }
    setBusy(false);
  };

  const extract = () => run(async () => {
    let opts;
    if (mode === 'pdf') {
      if (!file) return;
      const f = new FormData(); f.append('file', file);
      opts = { method: 'POST', body: f };
    } else if (mode === 'url') {
      opts = post({ url, js });
    } else {
      opts = post({ text });
    }
    const res = await api('/extract', opts);
    setWarnings(res.warnings || []);
  });

  const bulk = path => run(() => api(path, post({ ids: selected })));
  const download = async fmt => {
    try {
      const r = await fetch('/api/export?format=' + fmt, { headers: auth });
      if (!r.ok) throw new Error('Export failed');
      const url2 = URL.createObjectURL(await r.blob());
      const a = document.createElement('a');
      a.href = url2; a.download = 'contacts.' + fmt; a.click();
    } catch (e) { setErr(e.message); }
  };

  const toggleAll = e => setSelected(e.target.checked ? rows.map(r => r.id) : []);
  const toggleOne = id => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const canExtract = mode === 'pdf' ? !!file : mode === 'url' ? !!url : !!text;

  return (
    <div>
      <div className="page-header">
        <h1>Contact Extractor</h1>
        <p>Pull verified contact details from text, URLs, or résumés — with provenance, consent and export built in.</p>
      </div>

      {backendOnline === false && (
        <div className="alert alert-warn">
          Can't reach the extractor API at <code>/api</code> right now. This screen is fully wired to your Flask backend
          (app.py) — start it locally with <code>flask --app app run</code> and the Vite dev proxy will connect automatically.
        </div>
      )}

      <div className="panel" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {['text', 'url', 'pdf'].map(m => (
            <button key={m} className={`tag-filter ${mode === m ? 'active' : ''}`} onClick={() => setMode(m)}>
              {m === 'text' ? 'Text' : m === 'url' ? 'URL' : 'PDF / scan'}
            </button>
          ))}
        </div>

        {mode === 'text' && (
          <textarea className="input" rows={5} placeholder="Paste a résumé, email signature, or any text containing contact info..."
            value={text} onChange={e => setText(e.target.value)} />
        )}
        {mode === 'url' && (
          <>
            <input className="input" placeholder="https://company.com/about" value={url} onChange={e => setUrl(e.target.value)} style={{ marginBottom: 10 }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--text-dim)', cursor: 'pointer' }}>
              <button
                className={`toggle ${js ? 'on' : ''}`}
                onClick={() => setJs(v => !v)}
                role="switch"
                aria-checked={js}
                title={js ? 'Disable JS rendering' : 'Enable JS rendering'}
              >
                <div className="knob" />
              </button>
              Render JavaScript (headless Chrome)
            </label>
          </>
        )}
        {mode === 'pdf' && (
          <input type="file" accept="application/pdf" onChange={e => setFile(e.target.files[0])} />
        )}

        <div style={{ marginTop: 14 }}>
          <button className="btn btn-primary" disabled={busy || !canExtract} onClick={extract}>
            {busy ? 'Working…' : '🔎 Extract contacts'}
          </button>
        </div>
        {err && <div className="alert alert-error" style={{ marginTop: 10 }}>{err}</div>}
        {warnings.map(w => <div key={w} className="alert alert-warn" style={{ marginTop: 10 }}>{w}</div>)}
      </div>

      <div className="panel">
        <div className="panel-title">
          Extracted Contacts <span style={{ fontWeight: 500, color: 'var(--text-dim)', fontSize: 12 }}>{rows.length} total</span>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <button className="btn" disabled={!selected.length || busy} onClick={() => bulk('/enrich')}>✨ Enrich emails</button>
          <button className="btn" disabled={!selected.length || busy} onClick={() => bulk('/verify-phone')}>☎ Verify phones</button>
          <button className="btn" disabled={!selected.length || busy} onClick={() => bulk('/anonymize')}>🕶 Anonymize</button>
          <button className="btn btn-danger" disabled={!selected.length || busy} onClick={() => bulk('/suppress')}>🚫 Opt out / delete</button>
          <div style={{ flex: 1 }} />
          <button className="btn" onClick={() => download('csv')}>⬇ Export CSV</button>
          <button className="btn" onClick={() => download('json')}>⬇ Export JSON</button>
        </div>

        {rows.length === 0 ? (
          <div className="empty-note">No contacts extracted yet. Paste text, a URL, or upload a résumé above to get started.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 30 }}><input type="checkbox" className="checkbox" onChange={toggleAll} /></th>
                <th>Type</th><th>Value</th><th>Confidence</th><th>Verified</th>
                <th>Name</th><th>Company</th><th>Title</th><th>Location</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td onClick={e => e.stopPropagation()}>
                    <input type="checkbox" className="checkbox" checked={selected.includes(r.id)} onChange={() => toggleOne(r.id)} />
                  </td>
                  <td><span className="badge badge-blue">{r.type}</span></td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.anonymized ? '🕶 ' : ''}{r.value}</td>
                  <td>{Math.round((r.confidence || 0) * 100)}%</td>
                  <td>{r.phone_valid == null ? '—' : <span className={`badge ${r.phone_valid ? 'badge-green' : 'badge-red'}`}>{r.phone_valid ? 'Valid' : 'Invalid'}</span>}</td>
                  <td>{r.name || '—'}</td>
                  <td>{r.company || '—'}</td>
                  <td>{r.job_title || '—'}</td>
                  <td>{r.location || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
