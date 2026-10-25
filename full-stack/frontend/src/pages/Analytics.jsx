import { candidates, funnel } from '../data/mockData.js';

export default function Analytics() {
  const avgFit = Math.round(candidates.reduce((a, c) => a + c.fit, 0) / candidates.length);
  const bySource = candidates.reduce((acc, c) => { acc[c.source] = (acc[c.source] || 0) + 1; return acc; }, {});
  const maxSource = Math.max(...Object.values(bySource));

  const stats = [
    { label: 'Total Candidates', value: candidates.length, icon: '👤' },
    { label: 'Avg Fit Score',    value: `${avgFit}%`,       icon: '🎯' },
    { label: 'Shortlist Rate',   value: '17%',              icon: '📋' },
    { label: 'Time to Shortlist',value: '28m',              icon: '⏱' },
  ];

  const sourceColors = ['var(--teal)', 'var(--blue)', 'var(--purple)', 'var(--orange)'];

  return (
    <div>
      <div className="page-header">
        <h1>Analytics</h1>
        <p>Pipeline health and sourcing performance across your active jobs.</p>
      </div>

      <div className="stat-grid">
        {stats.map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-label"><span>{s.icon}</span>{s.label}</div>
            <div className="stat-value">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="two-col">
        <div className="panel">
          <div className="panel-title">Sourcing by Channel</div>
          {Object.entries(bySource).map(([src, count], i) => (
            <div key={src} className="funnel-row">
              <div className="funnel-bar" style={{
                background: sourceColors[i % sourceColors.length],
                color: '#04201c',
                width: `${12 + (count / maxSource) * 60}%`,
              }}>{count}</div>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{src}</span>
            </div>
          ))}
        </div>

        <div className="panel">
          <div className="panel-title">Conversion Funnel</div>
          {funnel.map((f, i) => (
            <div key={f.stage} className="funnel-row">
              <div className="funnel-bar" style={{ background: f.color, color: '#04201c', width: `${30 + f.pct * 0.6}%` }}>
                {f.value}
              </div>
              <span style={{ fontSize: 13 }}>
                <span style={{ fontWeight: 500 }}>{f.stage}</span>
                <span style={{ color: 'var(--text-dim)' }}> · {f.pct}%</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Fit score distribution */}
      <div className="panel">
        <div className="panel-title">Fit Score Distribution</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 80 }}>
          {[
            ['< 60', candidates.filter(c => c.fit < 60).length],
            ['60–70', candidates.filter(c => c.fit >= 60 && c.fit < 70).length],
            ['70–80', candidates.filter(c => c.fit >= 70 && c.fit < 80).length],
            ['80–90', candidates.filter(c => c.fit >= 80 && c.fit < 90).length],
            ['90+',   candidates.filter(c => c.fit >= 90).length],
          ].map(([label, n]) => {
            const max = Math.max(...[candidates.filter(c=>c.fit<60).length, candidates.filter(c=>c.fit>=60&&c.fit<70).length, candidates.filter(c=>c.fit>=70&&c.fit<80).length, candidates.filter(c=>c.fit>=80&&c.fit<90).length, candidates.filter(c=>c.fit>=90).length]);
            return (
              <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: '100%', borderRadius: '4px 4px 0 0',
                  background: 'var(--teal)', opacity: 0.4 + (n / max) * 0.6,
                  height: `${max > 0 ? (n / max) * 64 : 4}px`,
                  transition: 'height .5s cubic-bezier(.4,0,.2,1)',
                  minHeight: 4,
                }} />
                <span style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{label}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>{n}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="panel" style={{ marginTop: 14 }}>
        <div className="panel-title">Notes</div>
        <p className="empty-note">This view uses the same mock dataset as the rest of the app. Connect it to your real pipeline data once the backend is live.</p>
      </div>
    </div>
  );
}
