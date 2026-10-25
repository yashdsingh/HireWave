import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Intake() {
  const [description, setDescription] = useState(() => {
    const saved = localStorage.getItem('hirewave_job_description') || '';
    localStorage.removeItem('hirewave_job_description');
    return saved;
  });
  const [instructions, setInstructions] = useState('');
  const [job, setJob] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const nav = useNavigate();

  async function analyze() {
    setBusy(true); setMessage('Analyzing job description…');
    try {
      const r = await fetch('/api/sourcing/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, instructions }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Analysis failed');
      setJob(d.job);
      setMessage('Review the extracted requirements before searching.');
    } catch (e) {
      setMessage(e.message);
    } finally { setBusy(false); }
  }

  async function search() {
    setBusy(true); setMessage('Searching public web results and retrieving permitted pages…');
    try {
      const r = await fetch('/api/sourcing/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Search failed');
      localStorage.setItem('hirewave_active_run', d.run_id);
      setMessage(`Search complete. ${d.candidates_discovered} results discovered; ${d.pages_retrieved} pages retrieved.`);
      nav('/slate');
    } catch (e) {
      setMessage(e.message);
    } finally { setBusy(false); }
  }

  function update(field, value) { setJob({ ...job, [field]: value }); }

  return (
    <div>
      <div className="page-header">
        <h1>Job Intake</h1>
        <p>Analyze the role, review requirements, then search the public web for real results.</p>
      </div>

      {/* Step 1 */}
      <div className="panel" style={{ marginBottom: 14 }}>
        <div className="panel-title">
          Step 1 — Paste job description
          <span className="badge badge-blue">Required</span>
        </div>
        <textarea
          className="input"
          rows={8}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Paste the full job description here. Any role, any format — we'll extract requirements automatically."
          style={{ marginBottom: 12 }}
        />
        <label style={{ fontSize: 11.5, color: 'var(--text-faint)', display: 'block', marginBottom: 4 }}>
          Additional sourcing instructions (optional)
        </label>
        <textarea
          className="input"
          rows={2}
          value={instructions}
          onChange={e => setInstructions(e.target.value)}
          placeholder="Location preferences, exclusions, target seniority…"
          style={{ marginBottom: 14 }}
        />
        <button
          className="btn btn-primary"
          disabled={busy || !description.trim()}
          onClick={analyze}
        >
          {busy ? '⏳ Analyzing…' : '🔍 Analyze requirements'}
        </button>
      </div>

      {/* Step 2 — only shown after analysis */}
      {job && (
        <div className="panel" style={{ marginBottom: 14 }}>
          <div className="panel-title">
            Step 2 — Review and edit requirements
            <span className="badge badge-teal">Ready</span>
          </div>
          <div className="slate-grid" style={{ marginBottom: 12 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, color: 'var(--text-dim)' }}>
              Role title
              <input className="input" value={job.title} onChange={e => update('title', e.target.value)} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, color: 'var(--text-dim)' }}>
              Location
              <input className="input" value={job.location} onChange={e => update('location', e.target.value)} placeholder="Location" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, color: 'var(--text-dim)' }}>
              Work arrangement
              <select className="input" value={job.work_arrangement} onChange={e => update('work_arrangement', e.target.value)}>
                {['unspecified', 'remote', 'hybrid', 'onsite'].map(x => <option key={x}>{x}</option>)}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, color: 'var(--text-dim)' }}>
              Min. experience (years)
              <input className="input" type="number" value={job.minimum_experience_years ?? ''} onChange={e => update('minimum_experience_years', e.target.value ? Number(e.target.value) : null)} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, color: 'var(--text-dim)' }}>
              Target results
              <input className="input" type="number" min="1" max="50" value={job.target_count} onChange={e => update('target_count', Number(e.target.value))} />
            </label>
          </div>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, color: 'var(--text-dim)', marginBottom: 10 }}>
            Required skills (comma separated)
            <input className="input" value={job.required_skills.join(', ')} onChange={e => update('required_skills', e.target.value.split(',').map(x => x.trim()).filter(Boolean))} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, color: 'var(--text-dim)', marginBottom: 14 }}>
            Preferred skills (comma separated)
            <input className="input" value={job.preferred_skills.join(', ')} onChange={e => update('preferred_skills', e.target.value.split(',').map(x => x.trim()).filter(Boolean))} />
          </label>
          <p className="slate-k" style={{ marginBottom: 14 }}>Deterministic first-pass parser. Confirm extracted details; unsupported fields stay unknown.</p>
          <button className="btn btn-primary" disabled={busy} onClick={search}>
            {busy ? '⏳ Searching…' : '▶ Start real web search'}
          </button>
        </div>
      )}

      {/* Status / message */}
      {message && (
        <div className={`panel ${message.includes('failed') || message.includes('error') ? 'alert-error' : ''}`} role="status">
          <p style={{ margin: 0, fontSize: 13.5, color: message.includes('complete') ? 'var(--green)' : 'var(--text)' }}>
            {message}
          </p>
          {message.includes('BRAVE_SEARCH_API_KEY') && (
            <p className="slate-k" style={{ marginTop: 8 }}>Configure the key on the backend using the setup notes in README.md. Search credentials are never sent to the browser.</p>
          )}
        </div>
      )}
    </div>
  );
}
