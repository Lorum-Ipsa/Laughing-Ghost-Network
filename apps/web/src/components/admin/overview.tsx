import { useEffect, useState } from 'react';
import { pocketbaseClient as pb } from '@/lib/pocketbase-client';
import { actionLabel, type AdminAuditEntry } from '@/lib/admin';

type Stats = {
  users: number;
  profiles: number;
  work: number;
  published: number;
  submitted: number;
  drafts: number;
  reports: number;
  reviews: number;
  projects: number;
  exercises: number;
  handleChanges: number;
  suspended: number;
};

export function Overview({ onJump }: { onJump: (id: 'overview' | 'ghosts' | 'contributions' | 'reviews' | 'projects' | 'table-talks' | 'reports' | 'roles' | 'audit' | 'settings') => void }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [audit, setAudit] = useState<AdminAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      pb.collection('users').getList(1, 1, { requestKey: 'a-users' }),
      pb.collection('ghost_profiles').getList(1, 1, { requestKey: 'a-profiles' }),
      pb.collection('ghost_work').getList(1, 1, { requestKey: 'a-work' }),
      pb.collection('ghost_work').getList(1, 1, { filter: "status = 'published'", requestKey: 'a-pub' }),
      pb.collection('ghost_work').getList(1, 1, { filter: "status = 'submitted'", requestKey: 'a-sub' }),
      pb.collection('ghost_work').getList(1, 1, { filter: "status = 'draft'", requestKey: 'a-draft' }),
      pb.collection('ghost_reports').getList(1, 1, { requestKey: 'a-reports' }),
      pb.collection('ghost_reviews').getList(1, 1, { requestKey: 'a-reviews' }),
      pb.collection('ghost_work').getList(1, 1, { filter: "kind = 'project'", requestKey: 'a-proj' }),
      pb.collection('ghost_work').getList(1, 1, { filter: "kind = 'exercise'", requestKey: 'a-ex' }),
      pb.collection('ghost_handle_changes').getList(1, 1, { filter: "status = 'pending'", requestKey: 'a-hc' }),
      pb.collection('users').getList(1, 1, { filter: "suspended = true", requestKey: 'a-susp' }),
      pb.collection('ghost_audit_log').getList<AdminAuditEntry>(1, 8, { sort: '-created', expand: 'actor', requestKey: 'a-audit' }),
    ]).then((res) => {
      if (!active) return;
      setStats({
        users: res[0].totalItems, profiles: res[1].totalItems, work: res[2].totalItems,
        published: res[3].totalItems, submitted: res[4].totalItems, drafts: res[5].totalItems,
        reports: res[6].totalItems, reviews: res[7].totalItems, projects: res[8].totalItems,
        exercises: res[9].totalItems, handleChanges: res[10].totalItems, suspended: res[11].totalItems,
      });
      setAudit(res[12].items);
      setError('');
    }).catch(() => { if (active) setError('Could not load network statistics.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (loading) return <div className="loading-state"><div className="loading-bar" />Loading network overview…</div>;
  if (error) return <div className="status-message error-message" role="alert">{error}</div>;
  if (!stats) return null;

  const cards: { label: string; value: number; tab: 'overview' | 'ghosts' | 'contributions' | 'reviews' | 'projects' | 'table-talks' | 'reports' | 'roles' | 'audit' | 'settings' }[] = [
    { label: 'Members', value: stats.users, tab: 'roles' },
    { label: 'Suspended', value: stats.suspended, tab: 'roles' },
    { label: 'Ghost profiles', value: stats.profiles, tab: 'ghosts' },
    { label: 'Contributions', value: stats.work, tab: 'contributions' },
    { label: 'Published', value: stats.published, tab: 'contributions' },
    { label: 'Awaiting review', value: stats.submitted, tab: 'contributions' },
    { label: 'Drafts', value: stats.drafts, tab: 'contributions' },
    { label: 'Reviews', value: stats.reviews, tab: 'reviews' },
    { label: 'Projects', value: stats.projects, tab: 'projects' },
    { label: 'Table Talks', value: stats.exercises, tab: 'table-talks' },
    { label: 'Reports', value: stats.reports, tab: 'reports' },
    { label: 'Handle changes', value: stats.handleChanges, tab: 'ghosts' },
  ];

  return (
    <div className="admin-overview">
      <section className="admin-stat-grid">
        {cards.map((c) => (
          <button key={c.label} className="admin-stat-card" onClick={() => onJump(c.tab)}>
            <span className="admin-stat-value">{c.value}</span>
            <span className="admin-stat-label">{c.label}</span>
          </button>
        ))}
      </section>
      <section className="dashboard-panel admin-audit-preview">
        <h2>Recent audit log</h2>
        {!audit.length && <p className="muted-note">No audit entries yet.</p>}
        <ul className="activity-list">
          {audit.map((entry) => (
            <li key={entry.id} className="activity-item">
              <span className="activity-action">{actionLabel(entry.action)}</span>
              <span className="activity-meta">{entry.details || '—'} · {entry.expand?.actor?.email || 'system'}</span>
              <span className="activity-date">{new Date(entry.created).toISOString().slice(0, 10)}</span>
            </li>
          ))}
        </ul>
        <button className="text-link" onClick={() => onJump('audit')}>Full audit log ↗</button>
      </section>
    </div>
  );
}
