import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { pocketbaseClient as pb } from '@/lib/pocketbase-client';
import { verdictLabel, type AdminReview } from '@/lib/admin';

export function Reviews() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    pb.collection('ghost_reviews').getFullList<AdminReview>({ sort: '-created', expand: 'work,profile,owner', requestKey: null })
      .then((rows) => { if (active) { setReviews(rows); setError(''); } })
      .catch(() => { if (active) setError('Could not load reviews.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [revision]);

  async function remove(id: string) {
    setBusy(id); setError(''); setNotice('');
    try {
      await pb.collection('ghost_reviews').delete(id);
      setNotice('Review removed.');
      setRevision((v) => v + 1);
    } catch { setError('Could not remove the review.'); }
    finally { setBusy(''); }
  }

  async function togglePublish(item: AdminReview) {
    setBusy(item.id); setError(''); setNotice('');
    try {
      const status = item.status === 'published' ? 'draft' : 'published';
      await pb.collection('ghost_reviews').update(item.id, { status });
      setNotice(status === 'published' ? 'Review published.' : 'Review unpublished.');
      setRevision((v) => v + 1);
    } catch { setError('Could not change the review state.'); }
    finally { setBusy(''); }
  }

  if (loading) return <div className="loading-state"><div className="loading-bar" />Loading reviews…</div>;

  return (
    <div className="admin-section">
      {error && <div className="status-message error-message" role="alert">{error}</div>}
      {notice && <div className="status-message" role="status">{notice}</div>}
      {!reviews.length ? <div className="empty-state">No reviews yet.</div> : (
        <div className="admin-list">
          {reviews.map((r) => (
            <article className="dashboard-item" key={r.id}>
              <div className="admin-work-head">
                <span className="validation-badge validation-tested">{verdictLabel(r.verdict)}</span>
                <span className="validation-badge">{r.status}</span>
              </div>
              <h3>{r.expand?.work?.title ? <Link to={`/work/${r.work}`} className="text-link">{r.expand.work.title}</Link> : 'Review'}</h3>
              <p>{r.body}</p>
              <p className="muted-note">By {r.expand?.profile?.handle || 'member'} · {r.expand?.owner?.email || ''}</p>
              <div className="item-actions">
                <button disabled={busy === r.id} onClick={() => togglePublish(r)}>{r.status === 'published' ? 'Unpublish' : 'Publish'}</button>
                <button disabled={busy === r.id} onClick={() => remove(r.id)}>Remove</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
