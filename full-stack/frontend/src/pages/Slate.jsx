import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

const PAGE_SIZE = 10;

const SCORE_COLORS = { skills: '#2dd4bf', title: '#3b82f6', commute: '#f59e0b', experience: '#a855f7', certs: '#5b6b7a' };

export default function Slate() {
  const [live, setLive] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null);
  const [selected, setSelected] = useState([]);

  // Filters
  const [minScore, setMinScore] = useState(0);
  const [titleOrLocation, setTitleOrLocation] = useState('');
  const [skill, setSkill] = useState('');
  const [verification, setVerification] = useState('all');
  const [sort, setSort] = useState('score');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const runId = localStorage.getItem('hirewave_active_run');
    if (!runId) { setLive({ candidates: [] }); return; }
    fetch(`/api/sourcing/candidates?run_id=${encodeURIComponent(runId)}`)
      .then(r => {
        if (!r.ok) throw new Error('Could not load sourcing results.');
        return r.json();
      })
      .then(setLive)
      .catch(e => { setError(e.message); setLive({ candidates: [] }); });
  }, []);

  const candidates = live?.candidates || [];

  const filtered = useMemo(() => {
    const q = titleOrLocation.trim().toLowerCase();
    const s = skill.trim().toLowerCase();
    return candidates
      .filter(c =>
        c.score >= minScore &&
        (!q || `${c.title} ${c.location} ${c.name}`.toLowerCase().includes(q)) &&
        (!s || c.skills.some(x => x.toLowerCase().includes(s))) &&
        (verification === 'all' ||
          (verification === 'retrieved' ? c.retrieval_status === 'retrieved' : c.retrieval_status !== 'retrieved'))
      )
      .sort((a, b) =>
        sort === 'score' ? b.score - a.score :
        sort === 'name'  ? a.name.localeCompare(b.name) :
                           new Date(b.retrieved_at) - new Date(a.retrieved_at)
      );
  }, [candidates, minScore, titleOrLocation, skill, verification, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const toggle = id => setSelected(v => v.includes(id) ? v.filter(x => x !== id) : [...v, id]);

  if (!live) {
    return (
      <div className="panel" style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)' }}>
        <div style={{ fontSize: 22, marginBottom: 8 }}>⏳</div>
        Loading saved sourcing results…
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>
          Ranked Slate
          <span style={{ color: 'var(--text-dim)', fontWeight: 500, fontSize: 16, marginLeft: 8 }}>
            {filtered.length} results
          </span>
        </h1>
        <p>Sorted by evidence-based match score. Match quality and evidence confidence are shown separately.</p>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 14 }}>{error}</div>}

      <div className="panel">
        {/* Toolbar */}
        <div className="slate-toolbar">
          <span className="slate-k">
            {selected.length > 0 ? `${selected.length} selected` : 'Search results only — no profiles are invented.'}
          </span>
          {live.run_id && (
            <a className="btn" href={`/api/sourcing/runs/${encodeURIComponent(live.run_id)}/export.xlsx`}>
              ⬇ Export Excel
            </a>
          )}
        </div>

        {/* Filters */}
        <div className="slate-grid" style={{ marginBottom: 16 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--text-dim)' }}>
            Min match score
            <input className="input" type="number" min="0" max="100" value={minScore}
              onChange={e => { setMinScore(Number(e.target.value)); setPage(1); }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--text-dim)' }}>
            Title or location
            <input className="input" value={titleOrLocation}
              onChange={e => { setTitleOrLocation(e.target.value); setPage(1); }}
              placeholder="Filter title or location" />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--text-dim)' }}>
            Technical skill
            <input className="input" value={skill}
              onChange={e => { setSkill(e.target.value); setPage(1); }}
              placeholder="Filter by skill" />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--text-dim)' }}>
            Page verification
            <select className="input" value={verification}
              onChange={e => { setVerification(e.target.value); setPage(1); }}>
              <option value="all">All</option>
              <option value="retrieved">Page retrieved</option>
              <option value="snippet">Search snippet only</option>
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--text-dim)' }}>
            Sort by
            <select className="input" value={sort} onChange={e => setSort(e.target.value)}>
              <option value="score">Match score</option>
              <option value="name">Name</option>
              <option value="date">Retrieval time</option>
            </select>
          </label>
        </div>

        {/* Empty states */}
        {!candidates.length ? (
          <div className="empty-note">
            No real search results for this run yet.{' '}
            <Link to="/intake" style={{ color: 'var(--teal)' }}>Start a search from Job Intake →</Link>
          </div>
        ) : !visible.length ? (
          <div className="empty-note">No results match these filters.</div>
        ) : (
          <div className="slate-scroll">
            <table className="slate-table">
              <thead>
                <tr>
                  <th style={{ width: 32 }}>
                    <input type="checkbox"
                      checked={selected.length === visible.length && visible.length > 0}
                      onChange={e => setSelected(e.target.checked ? visible.map(c => c.id) : [])}
                    />
                  </th>
                  <th>Candidate / Result</th>
                  <th>Score</th>
                  <th>Evidence</th>
                  <th>Skills matched</th>
                  <th>Missing required</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(c => (
                  <Fragment key={c.id}>
                    {/* Main row */}
                    <tr style={{ background: open === c.id ? 'var(--bg-hover)' : 'transparent' }}>
                      <td onClick={e => e.stopPropagation()}>
                        <input type="checkbox" aria-label={`Select ${c.name}`}
                          checked={selected.includes(c.id)} onChange={() => toggle(c.id)} />
                      </td>
                      <td>
                        <button className="slate-link" onClick={() => setOpen(open === c.id ? null : c.id)}>
                          {c.name}
                        </button>
                        <div className="slate-k">{c.title} · {c.location}</div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: c.score >= 80 ? 'var(--teal)' : c.score >= 60 ? 'var(--orange)' : 'var(--text)' }}>
                          {c.score}%
                        </span>
                        {/* Mini score bar */}
                        <div className="slate-bar" style={{ marginTop: 6 }}>
                          {Object.entries(c.score_breakdown || {}).map(([k, v]) => (
                            <i key={k} style={{ width: `${v}%`, background: SCORE_COLORS[k] || 'var(--teal)' }} title={`${k}: ${v}`} />
                          ))}
                        </div>
                      </td>
                      <td><span className="slate-k">{c.evidence_confidence}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {(c.skills || []).slice(0, 3).map(s => (
                            <span key={s} className="pill-skill" style={{ fontSize: 11 }}>{s}</span>
                          ))}
                          {(c.skills || []).length === 0 && <span className="slate-k">Unknown</span>}
                        </div>
                      </td>
                      <td>
                        {(c.missing_requirements || []).length > 0
                          ? <span style={{ color: 'var(--orange)', fontSize: 12 }}>{c.missing_requirements.join(', ')}</span>
                          : <span style={{ color: 'var(--green)', fontSize: 12 }}>None evidenced</span>}
                      </td>
                      <td>
                        <a href={c.source_url} target="_blank" rel="noreferrer" style={{ color: 'var(--teal)', fontSize: 12.5 }}>
                          Open source ↗
                        </a>
                        <div className="slate-k">{c.retrieval_status} · {c.retrieved_at}</div>
                      </td>
                    </tr>

                    {/* Expanded detail row */}
                    {open === c.id && (
                      <tr>
                        <td colSpan={7} style={{ background: 'var(--bg-panel-2)', padding: '14px 16px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 13 }}>
                            <div>
                              <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--text)' }}>Evidence</div>
                              <p style={{ color: 'var(--text-dim)', lineHeight: 1.6, margin: 0 }}>
                                {c.evidence || c.snippet || 'No evidence extracted.'}
                              </p>
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--text)' }}>Ranking explanation</div>
                              <p style={{ color: 'var(--text-dim)', lineHeight: 1.6, margin: '0 0 8px' }}>
                                {c.ranking_explanation}
                              </p>
                              <p className="slate-k">{c.limitation || c.information_status}</p>
                              <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {Object.entries(c.score_breakdown || {}).map(([k, v]) => (
                                  <span key={k} style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: SCORE_COLORS[k] || 'var(--teal)', marginRight: 4 }} />
                                    {k.replaceAll('_', ' ')} {v}
                                  </span>
                                ))}
                              </div>
                              <a href={c.source_url} target="_blank" rel="noreferrer"
                                style={{ color: 'var(--teal)', fontSize: 12.5, display: 'inline-block', marginTop: 10 }}>
                                Review source profile ↗
                              </a>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="slate-toolbar" style={{ marginTop: 12 }}>
          <span className="slate-k">
            Page {page} of {pageCount} · {filtered.length} total results
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Previous</button>
            <button className="btn" disabled={page >= pageCount} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
