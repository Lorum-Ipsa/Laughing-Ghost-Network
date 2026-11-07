import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { pocketbaseClient as pb } from '@/lib/pocketbase-client';
import { locationDisplay, type GhostProfile } from '@/lib/network';
import type { AdminHandleChange } from '@/lib/admin';

type ProfileRow = GhostProfile & { deleted?: boolean };

export function Ghosts() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [changes, setChanges] = useState<AdminHandleChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      pb.collection('ghost_profiles').getFullList<ProfileRow>({ sort: 'handle', requestKey: null }),
      pb.collection('ghost_handle_changes').getFullList<AdminHandleChange>({ sort: '-created', expand: 'owner,profile', filter: "status = 'pending'", requestKey: null }),
    ]).then(([p, c]) => { if (active) { setProfiles(p); setChanges(c); setError(''); } })
      .catch(() => { if (active) setError('Could not load Ghost profiles.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [revision]);

  async function decideChange(id: string, status: 'approved' | 'declined') {
    setBusy(id); setError(''); setNotice('');
    try {
      const change = changes.find((c) => c.id === id);
      await pb.collection('ghost_handle_changes').update(id, { status });
      if (status === 'approved' && change) {
        await pb.collection('ghost_profiles').update(change.profile, { handle: change.requested_handle });
      }
      setNotice(status === 'approved' ? 'Handle change approved and applied.' : 'Handle change declined.');
      setRevision((v) => v + 1);
    } catch { setError('The handle-change decision was not recorded.'); }
    finally { setBusy(''); }
  }

  async function toggleProfile(id: string, deleted: boolean) {
    setBusy(id); setError(''); setNotice('');
    try {
      await pb.collection('ghost_profiles').update(id, { deleted: !deleted, deleted_at: !deleted ? new Date().toISOString() : null });
      setNotice(!deleted ? 'Profile hidden (soft-deleted).' : 'Profile restored.');
      setRevision((v) => v + 1);
    } catch { setError('Could not change the profile state.'); }
    finally { setBusy(''); }
  }

  if (loading) return <div className="loading-state"><div className="loading-bar" />Loading Ghosts…</div>;

  return (
    <div className="admin-section">
      {error && <div className="status-message error-message" role="alert">{error}</div>}
      {notice && <div className="status-message" role="status">{notice}</div>}

      {changes.length > 0 && (
        <section className="dashboard-panel">
          <h2>Handle-change requests</h2>
          <p className="muted-note">Handles are persistent. Approve a request to rename a Ghost.</p>
          {changes.map((c) => (
            <article className="dashboard-item" key={c.id}>
              <h3>{c.current_handle} → {c.requested_handle}</h3>
              {c.reason && <p>{c.reason}</p>}
              <p className="muted-note">Requested by {c.expand?.owner?.email || 'member'}</p>
              <div className="item-actions">
                <button disabled={busy === c.id} onClick={() => decideChange(c.id, 'approved')}>Approve</button>
                <button disabled={busy === c.id} onClick={() => decideChange(c.id, 'declined')}>Decline</button>
              </div>
            </article>
          ))}
        </section>
      )}

      <section className="dashboard-panel">
        <h2>Ghost profiles ({profiles.length})</h2>
        {!profiles.length && <p className="muted-note">No profiles yet.</p>}
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Handle</th><th>Specialties</th><th>Location</th><th>Member</th><th>State</th><th></th></tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id}>
                  <td><Link to={`/ghosts/${p.handle}`} className="text-link">{p.handle}</Link></td>
                  <td>{p.specialties || '—'}</td>
                  <td>{locationDisplay(p)}</td>
                  <td>{p.member ? 'Yes' : 'No'}</td>
                  <td>{p.deleted ? <span className="validation-badge validation-deprecated">Hidden</span> : <span className="validation-badge validation-tested">Live</span>}</td>
                  <td>
                    <button disabled={busy === p.id} onClick={() => toggleProfile(p.id, !!p.deleted)}>
                      {p.deleted ? 'Restore' : 'Hide'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
