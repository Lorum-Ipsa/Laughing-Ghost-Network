import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { pocketbaseClient as pb } from '@/lib/pocketbase-client';
import { type Work } from '@/lib/network';

export function TableTalks() {
  const [work, setWork] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    pb.collection('ghost_work').getFullList<Work>({ filter: "kind = 'exercise'", sort: '-created', expand: 'author', requestKey: null })
      .then((rows) => { if (active) { setWork(rows); setError(''); } })
      .catch(() => { if (active) setError('Could not load Table Talks.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [revision]);

  async function setStatus(id: string, status: string, label: string) {
    setBusy(id); setError(''); setNotice('');
    try {
      await pb.collection('ghost_work').update(id, { status });
      setNotice(`${label}. Recorded in the audit log.`);
      setRevision((v) => v + 1);
    } catch { setError('The status change was not recorded.'); }
    finally { setBusy(''); }
  }

  if (loading) return <div className="loading-state"><div className="loading-bar" />Loading Table Talks…</div>;

  return (
    <div className="admin-section">
      {error && <div className="status-message error-message" role="alert">{error}</div>}
      {notice && <div className="status-message" role="status">{notice}</div>}
      {!work.length ? <div className="empty-state">No Table Talks yet.</div> : (
        <div className="admin-list">
          {work.map((item) => (
            <article className="dashboard-item" key={item.id}>
              <div className="admin-work-head">
                <span className="work-category">Table Talk</span>
                <span className="validation-badge">{item.status}</span>
                {item.exercise_status && <span className="validation-badge">{item.exercise_status}</span>}
                {item.difficulty && <span className="validation-badge">{item.difficulty}</span>}
              </div>
              <h3><Link to={`/work/${item.id}`} className="text-link">{item.title}</Link></h3>
              <p>{item.summary}</p>
              <p className="muted-note">By {item.expand?.author?.handle || 'member'}</p>
              <div className="item-actions">
                {item.status !== 'published' && <button disabled={busy === item.id} onClick={() => setStatus(item.id, 'published', 'Published')}>Publish</button>}
                {item.status !== 'archived' && <button disabled={busy === item.id} onClick={() => setStatus(item.id, 'archived', 'Archived')}>Archive</button>}
                {item.status !== 'rejected' && <button disabled={busy === item.id} onClick={() => setStatus(item.id, 'rejected', 'Rejected')}>Reject</button>}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
