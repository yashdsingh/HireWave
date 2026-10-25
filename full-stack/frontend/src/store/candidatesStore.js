/**
 * Shared candidates store — all pages read/write through here so
 * shortlisting, stage changes, and consent toggles persist across navigation.
 */
import { useSyncExternalStore } from 'react';
import { candidates as initial, jobs as initialJobs } from '../data/mockData.js';

// ── State ─────────────────────────────────────────────────────────────────────
let state = {
  candidates: initial.map(c => ({ ...c })),
  jobs: initialJobs.map(j => ({ ...j })),
  // outreach send status: { [candidateId]: 'Draft' | 'Sent' }
  outreachStatus: Object.fromEntries(
    initial.map(c => [c.id, c.stage === 'Contacted' ? 'Sent' : 'Draft'])
  ),
};

const subscribers = new Set();
function emit() { subscribers.forEach(f => f()); }
function set(patch) { state = { ...state, ...patch }; emit(); }

// ── Subscribe ─────────────────────────────────────────────────────────────────
export function useStore() {
  return useSyncExternalStore(
    cb => { subscribers.add(cb); return () => subscribers.delete(cb); },
    () => state,
  );
}

// ── Actions ───────────────────────────────────────────────────────────────────
export const actions = {
  /** Move a candidate to a new pipeline stage */
  setStage(id, stage) {
    set({
      candidates: state.candidates.map(c => c.id === id ? { ...c, stage } : c),
    });
  },

  /** Toggle shortlist — moves to Shortlisted or back to Screened */
  toggleShortlist(id) {
    set({
      candidates: state.candidates.map(c => {
        if (c.id !== id) return c;
        return { ...c, stage: c.stage === 'Shortlisted' ? 'Screened' : 'Shortlisted' };
      }),
    });
  },

  /** Toggle opted-in consent for a candidate */
  toggleConsent(id) {
    set({
      candidates: state.candidates.map(c => c.id === id ? { ...c, opted: !c.opted } : c),
    });
  },

  /** Mark outreach as sent for a candidate */
  markSent(id) {
    set({
      outreachStatus: { ...state.outreachStatus, [id]: 'Sent' },
      candidates: state.candidates.map(c => c.id === id ? { ...c, stage: 'Contacted' } : c),
    });
  },

  /** Add a brand-new job (from Jobs page) */
  addJob(job) {
    set({ jobs: [job, ...state.jobs] });
  },

  /** Update an existing job */
  updateJob(id, patch) {
    set({ jobs: state.jobs.map(j => j.id === id ? { ...j, ...patch } : j) });
  },
};
