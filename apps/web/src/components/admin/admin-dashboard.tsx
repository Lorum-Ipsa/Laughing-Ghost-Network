import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Overview } from '@/components/admin/overview';
import { Ghosts } from '@/components/admin/ghosts';
import { Contributions } from '@/components/admin/contributions';
import { Reviews } from '@/components/admin/reviews';
import { Projects } from '@/components/admin/projects';
import { TableTalks } from '@/components/admin/table-talks';
import { Reports } from '@/components/admin/reports';
import { Roles } from '@/components/admin/roles';
import { AuditLog } from '@/components/admin/audit-log';
import { Settings } from '@/components/admin/settings';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'ghosts', label: 'Ghosts' },
  { id: 'contributions', label: 'Contributions' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'projects', label: 'Projects' },
  { id: 'table-talks', label: 'Table Talks' },
  { id: 'reports', label: 'Reports' },
  { id: 'roles', label: 'Roles & Permissions' },
  { id: 'audit', label: 'Audit Log' },
  { id: 'settings', label: 'Settings' },
] as const;

type TabId = (typeof TABS)[number]['id'];

function tabFromHash(): TabId {
  if (typeof window === 'undefined') return 'overview';
  const hash = window.location.hash.replace('#', '');
  return (TABS.some((t) => t.id === hash) ? hash : 'overview') as TabId;
}

export function AdminDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabId>(tabFromHash);

  useEffect(() => {
    function onHash() { setTab(tabFromHash()); }
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  function selectTab(id: TabId) {
    setTab(id);
    if (typeof window !== 'undefined') window.location.hash = id;
  }

  return (
    <main className="rail admin">
      <div className="admin-head">
        <span className="eyebrow"><span className="tiny-dot" />Network administration</span>
        <h1>Admin dashboard</h1>
        <p className="muted-note">
          Signed in as {user?.email}. Every account, role, moderation, and publication action you take here is recorded in the audit log with a timestamp.
        </p>
      </div>
      <nav className="dashboard-tabs admin-tabs" aria-label="Admin sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            aria-pressed={tab === t.id}
            className={tab === t.id ? 'active' : ''}
            onClick={() => selectTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <div className="admin-body">
        {tab === 'overview' && <Overview onJump={selectTab} />}
        {tab === 'ghosts' && <Ghosts />}
        {tab === 'contributions' && <Contributions />}
        {tab === 'reviews' && <Reviews />}
        {tab === 'projects' && <Projects />}
        {tab === 'table-talks' && <TableTalks />}
        {tab === 'reports' && <Reports />}
        {tab === 'roles' && <Roles />}
        {tab === 'audit' && <AuditLog />}
        {tab === 'settings' && <Settings />}
      </div>
    </main>
  );
}
