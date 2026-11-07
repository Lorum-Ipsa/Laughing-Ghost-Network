import { useEffect, useState } from 'react';
import { pocketbaseClient as pb } from '@/lib/pocketbase-client';
import type { AdminReport } from '@/lib/admin';

export function Reports() {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    pb.collection('ghost_reports').getFullList<AdminReport>({ sort: '-created', expand: 'owner', requestKey: null })
      .then((rows) => { if (active) { setReports(rows); setError(''); } })
      .catch(() => { if (active) setError('Could not load reports.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [revision]);

  async function remove(id: string) {
    setBusy(id); setError(''); setNotice('');
    try {
      await pb.collection('ghost_reports').delete(id);
      setNotice('Report dismissed and removed.');
      setRevision((v) => v + 1);
    } catch { setError('Could not remove the report.'); }
    finally { setBusy(''); }
  }

  if (loading) return <div className="loading-state"><div className="loading-bar" />Loading reports…</div>;

  return (
    <div className="admin-section">
      {error && <div className="status-message error-message" role="alert">{error}</div>}
      {notice && <div className="status-message" role="status">{notice}</div>}
      {!reports.length ? <div className="empty-state">No reports submitted.</div> : (
        <div className="admin-list">
          {reports.map((r) => (
            <article className="dashboard-item" key={r.id}>
              <h3>{r.subject}</h3>
              <p style={{ whiteSpace: 'pre-wrap' }}>{r.body}</p>
              <p className="muted-note">From {r.expand?.owner?.email || 'a member'}</p>
              <div className="item-actions">
                <button disabled={busy === r.id} onClick={() => remove(r.id)}>Dismiss &amp; remove</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
