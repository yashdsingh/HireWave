import { useState } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import ApiStatus from './components/ApiStatus.jsx';
import { currentUser } from './data/mockData.js';
import Dashboard from './pages/Dashboard.jsx';
import Jobs from './pages/Jobs.jsx';
import Candidates from './pages/Candidates.jsx';
import CandidateDetail from './pages/CandidateDetail.jsx';
import Outreach from './pages/Outreach.jsx';
import Analytics from './pages/Analytics.jsx';
import ContactExtractor from './pages/ContactExtractor.jsx';
import Intake from './pages/Intake.jsx';
import Slate from './pages/Slate.jsx';
import RunHealth from './pages/RunHealth.jsx';
import ContactEngine from './components/ContactEngine';

const NAV = [
  { to: '/',          label: 'Dashboard',        icon: '⊞',  end: true },
  { to: '/jobs',      label: 'Jobs',             icon: '📄' },
  { to: '/intake',    label: 'Job Intake',        icon: '📝' },
  { to: '/candidates',label: 'Candidates',        icon: '👤' },
  { to: '/slate',     label: 'Ranked Slate',      icon: '🏁' },
  null, // separator
  { to: '/outreach',  label: 'Outreach',          icon: '✉' },
  { to: '/analytics', label: 'Analytics',         icon: '📊' },
  null,
  { to: '/extractor', label: 'Contact Extractor', icon: '🔎' },
  { to: '/contacts',  label: 'Contact Engine',    icon: '⚡' },
  { to: '/health',    label: 'Run Health',        icon: '🩺' },
];

export default function App() {
  const location = useLocation();
  const [search, setSearch] = useState('');

  return (
    <div className="app-shell">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-mark">H</span>
          HireWave
        </div>

        <nav className="sidebar-nav">
          {NAV.map((t, i) =>
            t === null
              ? <div key={`sep-${i}`} className="nav-sep" />
              : (
                <NavLink
                  key={t.to}
                  to={t.to}
                  end={t.end}
                  className={({ isActive }) => 'nav-tab' + (isActive ? ' active' : '')}
                >
                  <span className="nav-icon">{t.icon}</span>
                  {t.label}
                </NavLink>
              )
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="topbar-avatar">{currentUser.initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentUser.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>Recruiter</div>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="main-area">
        <div className="topbar">
          <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--text-dim)' }}>
            {location.pathname === '/' ? 'Dashboard' :
             NAV.find(t => t && t.to === location.pathname)?.label ?? ''}
          </div>
          <input
            className="topbar-search"
            placeholder="Search candidates, jobs…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>⌘K</span>
        </div>

        <div className="page-scroll">
          <Routes>
            <Route path="/"            element={<Dashboard />} />
            <Route path="/jobs"        element={<Jobs />} />
            <Route path="/candidates"  element={<Candidates />} />
            <Route path="/candidates/:id" element={<CandidateDetail />} />
            <Route path="/outreach"    element={<Outreach />} />
            <Route path="/analytics"   element={<Analytics />} />
            <Route path="/extractor"   element={<ContactExtractor />} />
            <Route path="/intake"      element={<Intake />} />
            <Route path="/slate"       element={<Slate />} />
            <Route path="/contacts"    element={<ContactEngine />} />
            <Route path="/health"      element={<RunHealth />} />
          </Routes>
        </div>
      </div>

      <ApiStatus />
    </div>
  );
}
