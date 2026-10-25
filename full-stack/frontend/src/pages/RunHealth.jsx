import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

export default function RunHealth() {
  const [h, setH] = useState(null);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const health = await api.health();
        const ev = await api.events().catch(() => ({ events: [] }));
        if (alive) { setH(health); setEvents(ev?.events || []); setError(null); }
      } catch (e) {
        if (alive) setError(e.message);
      }
    }
    load();
    const id = setInterval(load, 15000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const items = h ? [
    { label: 'Database',        value: h.db ? 'reachable' : 'down',             ok: h.db },
    { label: 'SMTP Egress',     value: h.smtp_ready ? `${h.smtp_egress} IPs` : 'not configured', ok: h.smtp_ready },
    { label: 'Tracked Sources', value: h.sources?.domains ?? 0,                 ok: true },
    { label: 'API Version',     value: h.version ?? '—',                        ok: true },
  ] : [];

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Run Health</h1>
          <p>Live status from the backend API — auto-refreshes every 15 s.</p>
        </div>
        {h && (
          <span className="badge badge-green" style={{ marginTop: 4 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
            &nbsp;Connected
          </span>
        )}
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          ⚠ {error}
        </div>
      )}

      {!h && !error && (
        <div className="panel" style={{ textAlign: 'center', padding: 32, color: 'var(--text-dim)' }}>
          <div style={{ fontSize: 22, marginBottom: 8 }}>⏳</div>
          <div>Connecting to API…</div>
        </div>
      )}

      {items.length > 0 && (
        <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
          {items.map(({ label, value, ok }) => (
            <div className="stat-card" key={label}>
              <div className="stat-label">
                <span style={{ color: ok ? 'var(--green)' : 'var(--red)' }}>{ok ? '●' : '●'}</span>
                {label}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: ok ? 'var(--text)' : 'var(--red)' }}>{String(value)}</div>
            </div>
          ))}
        </div>
      )}

      <div className="panel">
        <div className="panel-title">
          Recent Audit Events
          <span style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 400 }}>{events.length} events</span>
        </div>
        {events.length === 0 && (
          <div className="empty-note">No events recorded yet.</div>
        )}
        {events.slice(0, 40).map((e, i) => (
          <div key={e.id ?? i} className="activity-row">
            <span className="badge badge-gray">{e.kind}</span>
            <span style={{ flex: 1, fontSize: 12.5 }}>{e.subject ?? '—'}</span>
            <span style={{ color: 'var(--text-faint)', fontSize: 11 }}>
              {e.createdAt ? new Date(e.createdAt).toLocaleString() : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
