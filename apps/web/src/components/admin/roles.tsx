import { useEffect, useState } from 'react';
import { pocketbaseClient as pb } from '@/lib/pocketbase-client';
import { useAuth } from '@/hooks/use-auth';
import { ROLE_OPTIONS, roleLabel, type AdminUser } from '@/lib/admin';

export function Roles() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    pb.collection('users').getFullList<AdminUser>({ sort: 'created', requestKey: null })
      .then((rows) => { if (active) { setUsers(rows); setError(''); } })
      .catch(() => { if (active) setError('Could not load member accounts.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [revision]);

  async function changeRole(u: AdminUser, role: string) {
    if (role === u.role) return;
    setBusy(u.id); setError(''); setNotice('');
    try {
      await pb.collection('users').update(u.id, { role });
      setNotice(`${u.email} is now ${roleLabel(role)}. Recorded in the audit log.`);
      setRevision((v) => v + 1);
    } catch { setError('The role change was not recorded.'); }
    finally { setBusy(''); }
  }

  async function toggleSuspend(u: AdminUser) {
    setBusy(u.id); setError(''); setNotice('');
    try {
      const suspended = !u.suspended;
      await pb.collection('users').update(u.id, { suspended });
      setNotice(suspended ? `${u.email} suspended. They can no longer sign in.` : `${u.email} reactivated.`);
      setRevision((v) => v + 1);
    } catch { setError('The suspension change was not recorded.'); }
    finally { setBusy(''); }
  }

  if (loading) return <div className="loading-state"><div className="loading-bar" />Loading accounts…</div>;

  return (
    <div className="admin-section">
      {error && <div className="status-message error-message" role="alert">{error}</div>}
      {notice && <div className="status-message" role="status">{notice}</div>}
      <section className="dashboard-panel">
        <h2>Member accounts ({users.length})</h2>
        <p className="muted-note">Roles are server-controlled. Changes to role, moderator, or suspension status are written to the audit log.</p>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Email</th><th>Role</th><th>Moderator</th><th>State</th><th>Created</th><th></th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.email}{u.id === me?.id && <span className="muted-note"> (you)</span>}</td>
                  <td>
                    <select
                      className="admin-role-select"
                      value={u.role || 'ghost'}
                      disabled={busy === u.id || u.id === me?.id}
                      onChange={(e) => changeRole(u, e.target.value)}
                    >
                      {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </td>
                  <td>{u.moderator ? 'Yes' : 'No'}</td>
                  <td>{u.suspended ? <span className="validation-badge validation-deprecated">Suspended</span> : <span className="validation-badge validation-tested">Active</span>}</td>
                  <td className="mono">{new Date(u.created).toISOString().slice(0, 10)}</td>
                  <td>
                    {u.id !== me?.id && (
                      <button disabled={busy === u.id} onClick={() => toggleSuspend(u)}>
                        {u.suspended ? 'Reactivate' : 'Suspend'}
                      </button>
                    )}
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
