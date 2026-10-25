import { Link } from 'react-router-dom';
import { currentUser, activeJob, dashboardStats, funnel } from '../data/mockData.js';
import { useStore } from '../store/candidatesStore.js';

export default function Dashboard() {
  const { candidates } = useStore();

  const liveFeed = candidates.slice(0, 6);
  const topShortlisted = candidates.filter(c => c.stage === 'Shortlisted' || c.fit >= 84).slice(0, 3);

  // Live counts derived from store
  const sourcedToday = candidates.filter(c => c.stage === 'Sourced').length;
  const shortlistedCount = candidates.filter(c => c.stage === 'Shortlisted').length;
  const screenedCount = candidates.filter(c => c.stage === 'Screened').length;
  const avgFit = Math.round(candidates.reduce((a, c) => a + c.fit, 0) / candidates.length);

  const liveStats = [
    { label: 'Sourced', value: sourcedToday, delta: dashboardStats[0].delta, icon: '👥' },
    { label: 'Shortlisted', value: shortlistedCount, delta: dashboardStats[1].delta, icon: '🔖' },
    { label: 'Screened', value: screenedCount, delta: dashboardStats[2].delta, icon: '💬' },
    { label: 'Avg Fit', value: `${avgFit}%`, delta: dashboardStats[3].delta, icon: '🎯' },
  ];

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Good morning, {currentUser.name} 👋</h1>
          <p>Your hiring pipeline is moving. Here's what's happening with <strong style={{ color: 'var(--teal)' }}>{activeJob.title}</strong>.</p>
        </div>
        <span style={{ color: 'var(--text-faint)', fontSize: 12 }}>Keep building great teams.</span>
      </div>

      {/* Live stats */}
      <div className="stat-grid">
        {liveStats.map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-label"><span>{s.icon}</span>{s.label}</div>
            <div>
              <span className="stat-value">{s.value}</span>
              <span className="stat-delta">↑ {s.delta}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Activity + Funnel */}
      <div className="two-col">
        <div className="panel">
          <div className="panel-title">
            Live Sourcing Activity
            <span className="badge badge-green" style={{ gap: 4 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
              Live
            </span>
          </div>
          {liveFeed.map(c => (
            <Link to={`/candidates/${c.id}`} key={c.id} className="activity-row" style={{ textDecoration: 'none' }}>
              <div className="avatar-dot" style={{ background: c.color }}>{c.initials}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</div>
                <div style={{ color: 'var(--text-dim)', fontSize: 11.5 }}>{c.title} · {c.location}</div>
              </div>
              <span className={`badge ${c.source === 'Job Board' ? 'badge-blue' : c.source === 'Community' ? 'badge-orange' : c.source === 'Referral' ? 'badge-purple' : 'badge-gray'}`}>
                {c.source}
              </span>
              <span className={`badge ${c.stage === 'Shortlisted' ? 'badge-teal' : c.stage === 'Screened' ? 'badge-purple' : 'badge-gray'}`} style={{ fontSize: 10 }}>
                {c.stage}
              </span>
              <span className="fit-ring" style={{ minWidth: 36, textAlign: 'right' }}>{c.fit}%</span>
            </Link>
          ))}
        </div>

        <div className="panel">
          <div className="panel-title">
            Pipeline Funnel
          </div>
          {[
            { stage: 'Sourced',     value: candidates.filter(c => c.stage === 'Sourced').length,     color: '#2dd4bf' },
            { stage: 'Screened',    value: candidates.filter(c => c.stage === 'Screened').length,    color: '#22a596' },
            { stage: 'Shortlisted', value: candidates.filter(c => c.stage === 'Shortlisted').length, color: '#176b61' },
            { stage: 'Contacted',   value: candidates.filter(c => c.stage === 'Contacted').length,   color: '#0e4a42' },
          ].map((f, i, arr) => {
            const pct = arr[0].value > 0 ? Math.round((f.value / arr[0].value) * 100) : 0;
            return (
              <div className="funnel-row" key={f.stage}>
                <div className="funnel-bar" style={{ background: f.color, color: '#04201c', width: `${Math.max(10, 30 + pct * 0.6)}%` }}>
                  {f.value}
                </div>
                <div style={{ fontSize: 12.5 }}>
                  <div style={{ fontWeight: 500 }}>{f.stage}</div>
                </div>
                <span style={{ marginLeft: 'auto', color: 'var(--teal)', fontWeight: 700, fontSize: 13 }}>{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active job banner */}
      <div className="panel" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 10, background: 'var(--teal-dim)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--teal)', fontSize: 18, flexShrink: 0,
        }}>{'</>'}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10.5, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 2 }}>Active Job</div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{activeJob.title}</div>
          <div style={{ color: 'var(--text-dim)', fontSize: 12 }}>{activeJob.location} · {activeJob.type} · {activeJob.tag}</div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {activeJob.skills.map(s => <span className="pill-skill" key={s}>{s}</span>)}
        </div>
        <Link to="/intake" className="btn btn-primary">▶ Start sourcing run</Link>
      </div>

      {/* Top shortlisted */}
      <div className="panel">
        <div className="panel-title">
          Top Shortlisted Candidates
          <Link to="/candidates" style={{ color: 'var(--teal)', fontSize: 12.5, fontWeight: 600 }}>View all →</Link>
        </div>
        {topShortlisted.length === 0 && (
          <div className="empty-note">Shortlist candidates from the Candidates page to see them here.</div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {topShortlisted.map(c => (
            <Link key={c.id} to={`/candidates/${c.id}`} className="candidate-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div className="avatar-dot" style={{ background: c.color }}>{c.initials}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{c.name}</div>
                  <div style={{ color: 'var(--text-dim)', fontSize: 11.5 }}>{c.title} · {c.location}</div>
                </div>
                <span style={{
                  border: '2px solid var(--teal)', borderRadius: '50%', width: 34, height: 34,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: 'var(--teal)',
                }}>{c.fit}%</span>
              </div>
              <div className="btn" style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}>Open screening →</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
