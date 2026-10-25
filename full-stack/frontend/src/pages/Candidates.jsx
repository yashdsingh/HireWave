import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, actions } from '../store/candidatesStore.js';

const stageTabs = ['All', 'Sourced', 'Screened', 'Shortlisted', 'Contacted', 'Opted out'];
const skillTags = ['React', 'Python', 'DevOps', 'AWS', 'TypeScript'];

const stageBadge = s => ({
  Sourced: 'badge-blue', Screened: 'badge-purple', Shortlisted: 'badge-teal',
  Contacted: 'badge-green', 'Opted out': 'badge-orange',
}[s] || 'badge-gray');

const sourceClass = s => s === 'Job Board' ? 'badge-blue' : s === 'Community' ? 'badge-orange' : s === 'Referral' ? 'badge-purple' : 'badge-gray';

export default function Candidates() {
  const navigate = useNavigate();
  const { candidates } = useStore();

  const [stage, setStage] = useState('All');
  const [skill, setSkill] = useState(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState([]);
  const [bulkStage, setBulkStage] = useState('Shortlisted');

  const rows = useMemo(() => {
    return candidates.filter(c => {
      if (stage !== 'All' && c.stage !== stage) return false;
      if (skill && !c.skills.includes(skill)) return false;
      if (query && !(`${c.name} ${c.title} ${c.skills.join(' ')}`).toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    }).sort((a, b) => b.fit - a.fit);
  }, [candidates, stage, skill, query]);

  const toggleAll = e => setSelected(e.target.checked ? rows.map(r => r.id) : []);
  const toggleOne = id => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const applyBulkStage = () => {
    selected.forEach(id => actions.setStage(id, bulkStage));
    setSelected([]);
  };

  const clearFilters = () => { setStage('All'); setSkill(null); setQuery(''); };
  const hasFilters = skill || stage !== 'All' || query;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Candidate Pool <span style={{ color: 'var(--text-dim)', fontWeight: 500, fontSize: 16 }}>{candidates.length} candidates</span></h1>
          <p>Ranked by fit score — shortlist, move stages, or open individual profiles.</p>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 14 }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
          {/* Stage tabs */}
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {stageTabs.map(s => (
              <button key={s} className={`tag-filter ${stage === s ? 'active' : ''}`} onClick={() => setStage(s)}>
                {s}
                <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.7 }}>
                  {s === 'All' ? candidates.length : candidates.filter(c => c.stage === s).length}
                </span>
              </button>
            ))}
          </div>

          {/* Skill pills */}
          <div style={{ display: 'flex', gap: 5, marginLeft: 6, flexWrap: 'wrap' }}>
            {skillTags.map(s => (
              <button key={s} className={`tag-filter ${skill === s ? 'active' : ''}`} onClick={() => setSkill(skill === s ? null : s)}>
                {s}
              </button>
            ))}
          </div>

          <input
            className="input"
            placeholder="Search name, title, skill…"
            style={{ marginLeft: 'auto', width: 240 }}
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {hasFilters && (
            <button className="btn" onClick={clearFilters}>✕ Clear</button>
          )}
        </div>

        {/* Bulk action bar */}
        {selected.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--teal-dim)', borderRadius: 'var(--radius-sm)', marginBottom: 12, border: '1px solid var(--teal)' }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--teal)' }}>{selected.length} selected</span>
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Move to:</span>
            <select
              className="input"
              style={{ width: 'auto', padding: '4px 8px', fontSize: 12 }}
              value={bulkStage}
              onChange={e => setBulkStage(e.target.value)}
            >
              {stageTabs.filter(s => s !== 'All').map(s => <option key={s}>{s}</option>)}
            </select>
            <button className="btn btn-primary" style={{ padding: '5px 12px', fontSize: 12 }} onClick={applyBulkStage}>
              Apply
            </button>
            <button className="btn" style={{ padding: '5px 12px', fontSize: 12 }} onClick={() => setSelected([])}>
              Cancel
            </button>
          </div>
        )}

        {/* Table */}
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 30 }}>
                <input type="checkbox" className="checkbox" onChange={toggleAll}
                  checked={selected.length === rows.length && rows.length > 0}
                  ref={el => { if (el) el.indeterminate = selected.length > 0 && selected.length < rows.length; }}
                />
              </th>
              <th>Candidate</th>
              <th>Skills</th>
              <th>Source</th>
              <th>Fit ↓</th>
              <th>Stage</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-faint)', padding: 28 }}>
                  No candidates match the current filters.
                </td>
              </tr>
            )}
            {rows.map(c => (
              <tr key={c.id} onClick={() => navigate(`/candidates/${c.id}`)}>
                <td onClick={e => e.stopPropagation()}>
                  <input type="checkbox" className="checkbox" checked={selected.includes(c.id)} onChange={() => toggleOne(c.id)} />
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="avatar-dot" style={{ background: c.color, width: 28, height: 28, fontSize: 10 }}>{c.initials}</div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{c.name}</div>
                      <div style={{ color: 'var(--text-faint)', fontSize: 11.5 }}>{c.title} · {c.location}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {c.skills.slice(0, 2).map(s => <span className="pill-skill" key={s}>{s}</span>)}
                    {c.extraSkills > 0 && <span className="pill-skill">+{c.extraSkills}</span>}
                  </div>
                </td>
                <td><span className={`badge ${sourceClass(c.source)}`}>{c.source}</span></td>
                <td>
                  <span style={{
                    border: `2px solid ${c.fit >= 80 ? 'var(--teal)' : c.fit >= 65 ? 'var(--orange)' : 'var(--text-faint)'}`,
                    borderRadius: '50%', width: 32, height: 32, display: 'inline-flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700,
                    color: c.fit >= 80 ? 'var(--teal)' : c.fit >= 65 ? 'var(--orange)' : 'var(--text)',
                  }}>{c.fit}%</span>
                </td>
                <td><span className={`badge ${stageBadge(c.stage)}`}>{c.stage}</span></td>
                <td onClick={e => e.stopPropagation()}>
                  {c.stage === 'Opted out' ? (
                    <span style={{ color: 'var(--text-faint)', fontSize: 12 }}>Opted out</span>
                  ) : c.stage === 'Shortlisted' ? (
                    <button className="btn" style={{ fontSize: 12 }} onClick={() => actions.setStage(c.id, 'Screened')}>
                      ✕ Remove
                    </button>
                  ) : (
                    <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => actions.toggleShortlist(c.id)}>
                      ★ Shortlist
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paste resume panel */}
      <div className="panel" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ fontSize: 20 }}>⬆</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 13.5 }}>Paste a résumé to add candidates manually</div>
          <div style={{ color: 'var(--text-dim)', fontSize: 12 }}>Paste text or drag & drop a PDF, DOCX, or TXT file.</div>
        </div>
        <button className="btn btn-primary">📋 Paste from clipboard</button>
      </div>
    </div>
  );
}
