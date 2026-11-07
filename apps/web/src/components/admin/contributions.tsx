import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { pocketbaseClient as pb } from '@/lib/pocketbase-client';
import { kindLabels, safeExternal, type Work } from '@/lib/network';

const STATUS_FILTERS = [
  { value: 'submitted', label: 'Awaiting review' },
  { value: 'draft', label: 'Drafts' },
  { value: 'published', label: 'Published' },
  { value: 'revision_requested', label: 'Revision requested' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'archived', label: 'Archived' },
  { value: 'all', label: 'All' },
] as const;

export function Contributions() {
  const [filter, setFilter] = useState<string>('submitted');
  const [work, setWork] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const f = filter === 'all' ? '' : pb.filter('status = {:status}', { status: filter });
    pb.collection('ghost_work').getFullList<Work>({ filter: f, sort: '-created', expand: 'author', requestKey: null })
      .then((rows) => { if (active) { setWork(rows); setError(''); } })
      .catch(() => { if (active) setError('Could not load contributions.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filter, revision]);

  async function setStatus(id: string, status: string, label: string) {
    setBusy(id); setError(''); setNotice('');
    try {
      await pb.collection('ghost_work').update(id, { status });
      setNotice(`${label}. The action is recorded in the audit log.`);
      setRevision((v) => v + 1);
    } catch { setError('The status change was not recorded.'); }
    finally { setBusy(''); }
  }

  async function toggleDelete(item: Work) {
    setBusy(item.id); setError(''); setNotice('');
    try {
      await pb.collection('ghost_work').update(item.id, { deleted: !item.deleted, deleted_at: !item.deleted ? new Date().toISOString() : null });
      setNotice(!item.deleted ? 'Contribution hidden (soft-deleted).' : 'Contribution restored.');
      setRevision((v) => v + 1);
    } catch { setError('Could not change the contribution state.'); }
    finally { setBusy(''); }
  }

  return (
    <div className="admin-section">
      {error && <div className="status-message error-message" role="alert">{error}</div>}
      {notice && <div className="status-message" role="status">{notice}</div>}
      <div className="filter-bar">
        {STATUS_FILTERS.map((s) => (
          <button key={s.value} className={`filter-button ${filter === s.value ? 'active' : ''}`} onClick={() => setFilter(s.value)}>{s.label}</button>
        ))}
      </div>
      {loading ? <div className="loading-state"><div className="loading-bar" />Loading contributions…</div> : (
        !work.length ? <div className="empty-state">No contributions in this view.</div> :
        <div className="admin-list">
          {work.map((item) => (
            <article className="dashboard-item admin-work-row" key={item.id}>
              <div className="admin-work-head">
                <span className="work-category">{kindLabels[item.kind] || item.kind}</span>
                <span className="validation-badge">{item.status}</span>
                {item.deleted && <span className="validation-badge validation-deprecated">Hidden</span>}
              </div>
              <h3><Link to={`/work/${item.id}`} className="text-link">{item.title}</Link></h3>
              <p>{item.summary}</p>
              <p className="muted-note">By {item.expand?.author?.handle || 'member'}</p>
              {safeExternal(item.source) && <a className="text-link" href={item.source} target="_blank" rel="noopener noreferrer">Source ↗</a>}
              <div className="item-actions">
                {item.status !== 'published' && <button disabled={busy === item.id} onClick={() => setStatus(item.id, 'published', 'Published')}>Publish</button>}
                {item.status !== 'rejected' && <button disabled={busy === item.id} onClick={() => setStatus(item.id, 'rejected', 'Rejected')}>Reject</button>}
                {item.status !== 'archived' && <button disabled={busy === item.id} onClick={() => setStatus(item.id, 'archived', 'Archived')}>Archive</button>}
                <button disabled={busy === item.id} onClick={() => setStatus(item.id, 'revision_requested', 'Revision requested')}>Request revision</button>
                <button disabled={busy === item.id} onClick={() => toggleDelete(item)}>{item.deleted ? 'Restore' : 'Hide'}</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
