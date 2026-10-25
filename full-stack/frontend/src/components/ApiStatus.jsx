import { useEffect, useState } from 'react';
import { probe } from '../api/client.js';

export default function ApiStatus() {
  const [s, setS] = useState(null);

  useEffect(() => {
    let alive = true;
    const check = async () => { const r = await probe(); if (alive) setS(r); };
    check();
    const id = setInterval(check, 60000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  if (!s) return null;
  const ok = s.ok;
  return (
    <div title={ok ? `API ${s.health?.version || 'ok'}` : s.error}
      style={{
        position: 'fixed', bottom: 12, right: 12, zIndex: 90,
        display: 'flex', alignItems: 'center', gap: 7, cursor: 'help',
        background: ok ? '#052e16' : '#450a0a',
        border: `1px solid ${ok ? '#22c55e55' : '#ef444455'}`,
        color: ok ? '#22c55e' : '#ef4444',
        borderRadius: 999, padding: '5px 11px', fontSize: 11, fontWeight: 600,
      }}>
      <span style={{ width: 7, height: 7, borderRadius: 99, background: ok ? '#22c55e' : '#ef4444' }} />
      {ok ? 'API connected' : 'API unreachable'}
    </div>
  );
}
