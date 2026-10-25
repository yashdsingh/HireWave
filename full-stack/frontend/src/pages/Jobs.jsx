import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, actions } from '../store/candidatesStore.js';

const emptyDraft = { title: '', location: '', type: 'Full-time', seniority: 'Mid-level', skills: '', description: '' };

const statusBadge = s => ({ Active: 'badge-teal', Draft: 'badge-gray', Paused: 'badge-orange', Closed: 'badge-red' }[s] || 'badge-gray');

export default function Jobs() {
  const navigate = useNavigate();
  const { jobs } = useStore();

  const [activeId, setActiveId] = useState(jobs[0]?.id);
  const [showNew, setShowNew] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [parsing, setParsing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(null);
  const [search, setSearch] = useState('');

  const active = jobs.find(j => j.id === activeId);
  const visibleJobs = search.trim()
    ? jobs.filter(j => `${j.title} ${j.location}`.toLowerCase().includes(search.toLowerCase()))
    : jobs;

  const selectJob = id => { setActiveId(id); setEditing(false); };

  const parseDescription = () => {
    if (!draft.description.trim()) return;
    setParsing(true);
    setTimeout(() => {
      const text = draft.description;
      const guessTitle = draft.title || text.split('\n')[0].slice(0, 60) || 'New Role';
      const knownSkills = ['React', 'TypeScript', 'Node.js', 'Python', 'Django', 'Postgres', 'AWS', 'Kubernetes', 'Terraform', 'Docker', 'Go', 'Java', 'SQL', 'GraphQL'];
      const foundSkills = knownSkills.filter(s => text.toLowerCase().includes(s.toLowerCase()));
      setDraft(d => ({ ...d, title: guessTitle, skills: (d.skills ? d.skills + ', ' : '') + foundSkills.join(', ') }));
      setParsing(false);
    }, 700);
  };

  const createJob = () => {
    if (!draft.title.trim()) return;
    const newJob = {
      id: 'j' + Date.now(),
      title: draft.title,
      location: draft.location || 'Remote',
      type: draft.type,
      tag: draft.seniority,
      status: 'Draft',
      postedDate: new Date().toISOString().slice(0, 10),
      skills: draft.skills.split(',').map(s => s.trim()).filter(Boolean),
      seniority: draft.seniority,
      salaryMin: null, salaryMax: null,
      description: draft.description,
      candidateCount: 0, shortlistedCount: 0,
    };
    actions.addJob(newJob);
    setActiveId(newJob.id);
    setShowNew(false);
    setDraft(emptyDraft);
  };

  const startEdit = () => {
    if (!active) return;
    setEditDraft({ ...active, skillsStr: active.skills.join(', ') });
    setEditing(true);
  };

  const saveEdit = () => {
    if (!editDraft?.title.trim()) return;
    actions.updateJob(active.id, {
      title: editDraft.title,
      location: editDraft.location,
      type: editDraft.type,
      seniority: editDraft.seniority,
      skills: editDraft.skillsStr.split(',').map(s => s.trim()).filter(Boolean),
      description: editDraft.description,
    });
    setEditing(false);
  };

  const publish = () => {
    if (!active) return;
    const next = active.status === 'Active' ? 'Paused' : 'Active';
    actions.updateJob(active.id, { status: next });
  };

  const runSourcing = () => {
    if (!active?.description) return;
    localStorage.setItem('hirewave_job_description', active.description);
    navigate('/intake');
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Jobs</h1>
          <p>Paste or write any job description — HireWave sources and ranks candidates against it.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNew(s => !s)}>
          {showNew ? '✕ Cancel' : '+ New job'}
        </button>
      </div>

      {/* New job form */}
      {showNew && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <div className="panel-title">New job description</div>
          <div className="detail-grid" style={{ marginBottom: 10 }}>
            <div>
              <label style={{ fontSize: 11.5, color: 'var(--text-faint)', display: 'block', marginBottom: 4 }}>Job title</label>
              <input className="input" placeholder="e.g. Senior Full Stack Developer" value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 11.5, color: 'var(--text-faint)', display: 'block', marginBottom: 4 }}>Location</label>
              <input className="input" placeholder="e.g. Remote (US), Berlin, Hybrid NYC…" value={draft.location} onChange={e => setDraft({ ...draft, location: e.target.value })} />
            </div>
          </div>
          <div className="detail-grid" style={{ marginBottom: 10 }}>
            <div>
              <label style={{ fontSize: 11.5, color: 'var(--text-faint)', display: 'block', marginBottom: 4 }}>Type</label>
              <select className="input" value={draft.type} onChange={e => setDraft({ ...draft, type: e.target.value })}>
                <option>Full-time</option><option>Part-time</option><option>Contract</option><option>Internship</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11.5, color: 'var(--text-faint)', display: 'block', marginBottom: 4 }}>Seniority</label>
              <select className="input" value={draft.seniority} onChange={e => setDraft({ ...draft, seniority: e.target.value })}>
                <option>Junior</option><option>Mid-level</option><option>Mid-Senior</option><option>Senior</option><option>Staff / Principal</option>
              </select>
            </div>
          </div>
          <label style={{ fontSize: 11.5, color: 'var(--text-faint)', display: 'block', marginBottom: 4 }}>Full job description</label>
          <textarea className="input" rows={7} placeholder="Paste a job description here…" value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} style={{ marginBottom: 10 }} />
          <label style={{ fontSize: 11.5, color: 'var(--text-faint)', display: 'block', marginBottom: 4 }}>Key skills (comma separated)</label>
          <input className="input" placeholder="e.g. React, TypeScript, AWS" value={draft.skills} onChange={e => setDraft({ ...draft, skills: e.target.value })} style={{ marginBottom: 14 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" disabled={parsing || !draft.description.trim()} onClick={parseDescription}>
              {parsing ? 'Reading…' : '✨ Auto-fill from description'}
            </button>
            <button className="btn btn-primary" onClick={createJob} disabled={!draft.title.trim()}>
              ✓ Create job
            </button>
          </div>
        </div>
      )}

      <div className="two-col" style={{ gridTemplateColumns: '0.85fr 1.6fr', alignItems: 'start' }}>
        {/* Jobs list */}
        <div className="panel">
          <div className="panel-title">
            All jobs
            <span style={{ fontWeight: 500, color: 'var(--text-dim)', fontSize: 12 }}>{jobs.length}</span>
          </div>
          <input
            className="input"
            placeholder="Search jobs…"
            style={{ marginBottom: 10 }}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {visibleJobs.map(j => (
            <div
              key={j.id}
              onClick={() => selectJob(j.id)}
              className="activity-row"
              style={{
                cursor: 'pointer',
                background: activeId === j.id ? 'var(--bg-hover)' : 'transparent',
                borderRadius: 'var(--radius-sm)',
                padding: '9px 8px',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{j.title}</div>
                <div style={{ color: 'var(--text-faint)', fontSize: 11.5 }}>{j.location}</div>
              </div>
              <span className={`badge ${statusBadge(j.status)}`}>{j.status}</span>
            </div>
          ))}
          {visibleJobs.length === 0 && <div className="empty-note">No jobs match.</div>}
        </div>

        {/* Job detail / edit */}
        {active && (
          <div className="panel">
            {editing && editDraft ? (
              <>
                <div className="panel-title">
                  ✎ Editing — {editDraft.title || 'Untitled'}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary" onClick={saveEdit}>Save</button>
                    <button className="btn" onClick={() => setEditing(false)}>Cancel</button>
                  </div>
                </div>
                <div className="detail-grid" style={{ marginBottom: 10 }}>
                  <div>
                    <label style={{ fontSize: 11.5, color: 'var(--text-faint)', display: 'block', marginBottom: 4 }}>Title</label>
                    <input className="input" value={editDraft.title} onChange={e => setEditDraft({ ...editDraft, title: e.target.value })} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11.5, color: 'var(--text-faint)', display: 'block', marginBottom: 4 }}>Location</label>
                    <input className="input" value={editDraft.location} onChange={e => setEditDraft({ ...editDraft, location: e.target.value })} />
                  </div>
                </div>
                <div className="detail-grid" style={{ marginBottom: 10 }}>
                  <div>
                    <label style={{ fontSize: 11.5, color: 'var(--text-faint)', display: 'block', marginBottom: 4 }}>Type</label>
                    <select className="input" value={editDraft.type} onChange={e => setEditDraft({ ...editDraft, type: e.target.value })}>
                      <option>Full-time</option><option>Part-time</option><option>Contract</option><option>Internship</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11.5, color: 'var(--text-faint)', display: 'block', marginBottom: 4 }}>Seniority</label>
                    <select className="input" value={editDraft.seniority} onChange={e => setEditDraft({ ...editDraft, seniority: e.target.value })}>
                      <option>Junior</option><option>Mid-level</option><option>Mid-Senior</option><option>Senior</option><option>Staff / Principal</option>
                    </select>
                  </div>
                </div>
                <label style={{ fontSize: 11.5, color: 'var(--text-faint)', display: 'block', marginBottom: 4 }}>Skills (comma separated)</label>
                <input className="input" value={editDraft.skillsStr} onChange={e => setEditDraft({ ...editDraft, skillsStr: e.target.value })} style={{ marginBottom: 10 }} />
                <label style={{ fontSize: 11.5, color: 'var(--text-faint)', display: 'block', marginBottom: 4 }}>Description</label>
                <textarea className="input" rows={8} value={editDraft.description} onChange={e => setEditDraft({ ...editDraft, description: e.target.value })} />
              </>
            ) : (
              <>
                <div className="panel-title">
                  {active.title}
                  <span className={`badge ${statusBadge(active.status)}`}>{active.status}</span>
                </div>
                <div style={{ color: 'var(--text-dim)', fontSize: 12.5, marginBottom: 10 }}>
                  {active.location} · {active.type} · {active.seniority}
                  {active.salaryMin && ` · $${(active.salaryMin / 1000).toFixed(0)}k–$${(active.salaryMax / 1000).toFixed(0)}k`}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                  {active.skills.map(s => <span className="pill-skill" key={s}>{s}</span>)}
                </div>
                <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                  <div className="stat-card" style={{ flex: 1, padding: '12px 14px' }}>
                    <div className="stat-label">Candidates sourced</div>
                    <div className="stat-value" style={{ fontSize: 22 }}>{active.candidateCount}</div>
                  </div>
                  <div className="stat-card" style={{ flex: 1, padding: '12px 14px' }}>
                    <div className="stat-label">Shortlisted</div>
                    <div className="stat-value" style={{ fontSize: 22 }}>{active.shortlistedCount}</div>
                  </div>
                </div>
                <div className="panel-title" style={{ marginBottom: 8 }}>Full description</div>
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.6, margin: '0 0 16px' }}>
                  {active.description}
                </pre>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn btn-primary" onClick={runSourcing} disabled={!active.description}>
                    ▶ Start real web search
                  </button>
                  <button className="btn" onClick={startEdit}>✎ Edit</button>
                  <button
                    className="btn"
                    onClick={publish}
                    style={active.status === 'Active' ? { color: 'var(--orange)', borderColor: 'var(--orange)' } : {}}
                  >
                    {active.status === 'Active' ? '⏸ Pause' : active.status === 'Draft' ? '✓ Publish' : '▶ Re-activate'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
