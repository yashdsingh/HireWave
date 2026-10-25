import { useSyncExternalStore } from 'react';
import { slate, stages } from '../data/slateData.js';

let state = { parsed: false, run: null, list: [], picked: [] };
const subs = new Set();
let timer;
const set = patch => { state = { ...state, ...patch }; subs.forEach(f => f()); };

export const useSlate = () => useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f); }, () => state);

export const actions = {
  parse: () => set({ parsed: true }),
  startRun() {
    clearInterval(timer);
    set({ run: { i: 0, sec: 0 } });
    timer = setInterval(() => {
      const r = { ...state.run, i: state.run.i + 1, sec: state.run.sec + 1.2 };
      if (r.i >= stages.length) { r.done = true; clearInterval(timer); set({ run: r, list: slate.map(c => ({ ...c })) }); }
      else set({ run: r });
    }, 1200);
  },
  cancelRun() { clearInterval(timer); set({ run: { ...state.run, cancelled: true } }); },
  update: (id, patch) => set({ list: state.list.map(c => (c.id === id ? { ...c, ...patch } : c)) }),
  pick: id => set({ picked: state.picked.includes(id) ? state.picked.filter(x => x !== id) : [...state.picked, id].slice(-3) }),
};

export function exportCsv(list) {
  const cols = ['name', 'title', 'score', 'source', 'location', 'miles', 'mins', 'status', 'shortlisted', 'notes'];
  const q = v => { let s = String(v ?? ''); if (/^[=+\-@]/.test(s)) s = "'" + s; return `"${s.replace(/"/g, '""')}"`; };
  const csv = [cols.join(','), ...list.map(c => cols.map(k => q(c[k])).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = 'hirewave-candidates.csv'; a.click();
}
