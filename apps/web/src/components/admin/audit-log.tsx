import { useEffect, useState } from 'react';
import { pocketbaseClient as pb } from '@/lib/pocketbase-client';
import { actionLabel, type AdminAuditEntry } from '@/lib/admin';

const ACTION_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'role_changed', label: 'Role changes' },
  { value: 'account_suspended', label: 'Suspensions' },
  { value: 'work_published', label: 'Publications' },
  { value: 'work_rejected', label: 'Rejections' },
  { value: 'report_submitted', label: 'Reports' },
  { value: 'handle_change_approved', label: 'Handle changes' },
] as const;

export function AuditLog() {
  const [filter, setFilter] = useState<string>('all');
  const [entries, setEntries] = useState<AdminAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const f = filter === 'all' ? '' : pb.filter('action = {:action}', { action: filter });
    pb.collection('ghost_audit_log').getList<AdminAuditEntry>(page, 25, { filter: f, sort: '-created', expand: 'actor', requestKey: null })
      .then((res) => { if (active) { setEntries(res.items); setTotalPages(res.totalPages); setError(''); } })
      .catch(() => { if (active) setError('Could not load the audit log.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filter, page]);

  return (
    <div className="admin-section">
      {error && <div className="status-message error-message" role="alert">{error}</div>}
      <div className="filter-bar">
        {ACTION_FILTERS.map((s) => (
          <button key={s.value} className={`filter-button ${filter === s.value ? 'active' : ''}`} onClick={() => { setFilter(s.value); setPage(1); }}>{s.label}</button>
        ))}
      </div>
      {loading ? <div className="loading-state"><div className="loading-bar" />Loading audit log…</div> : (
        !entries.length ? <div className="empty-state">No audit entries match this filter.</div> : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>When</th><th>Action</th><th>Actor</th><th>Target</th><th>Details</th></tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td className="mono">{new Date(e.created).toISOString().replace('T', ' ').slice(0, 16)}</td>
                    <td>{actionLabel(e.action)}</td>
                    <td>{e.expand?.actor?.email || e.actor || 'system'}</td>
                    <td className="mono">{e.target_type || '—'}{e.target_id ? ` · ${e.target_id.slice(0, 8)}` : ''}</td>
                    <td>{e.details || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="admin-pagination">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
              <span className="muted-note">Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          </div>
        )
      )}
    </div>
  );
}
