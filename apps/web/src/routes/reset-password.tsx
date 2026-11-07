import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import type { Route } from './+types/reset-password';
import { seo } from '@/lib/seo';
import { supabaseBrowser } from '@/lib/supabase-browser';

export function meta({ matches, location }: Route.MetaArgs) {
  return seo({ matches, location }, { title: 'Recover Ghost account — LGN', description: 'Reset your private LGN Ghost account password securely.', noindex: true });
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const recoveryLink = hash.get('type') === 'recovery';
    const api = supabaseBrowser();
    const { data: { subscription } } = api.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' && active) { setReady(true); setChecking(false); }
    });
    if (!recoveryLink) {
      setChecking(false);
      setError('Open the password recovery link from your email to reset your password.');
    } else {
      void api.auth.getSession().then(({ data, error: sessionError }) => {
        if (!active) return;
        if (sessionError) setError(sessionError.message);
        else if (data.session) setReady(true);
        else setError('This recovery link is invalid or expired. Request a new one.');
        setChecking(false);
      }).catch(e => {
        if (!active) return;
        setError(e instanceof Error ? e.message : 'Invalid recovery link.');
        setChecking(false);
      });
    }
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (password.length < 12 || password !== confirm) {
      setError('Passwords must match and contain at least 12 characters.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const { error } = await supabaseBrowser().auth.updateUser({ password });
      if (error) throw error;
      await supabaseBrowser().auth.signOut();
      navigate('/login', { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update your password.');
    } finally { setBusy(false); }
  }
  return <main className="login-wrap"><span className="eyebrow">ACCOUNT RECOVERY</span>
    <h1>Reset your password<span className="accent-period">.</span></h1>
    {checking ? <div className="form-panel loading-state">Validating recovery link…</div>
      : <div className="form-panel">
        {ready && <form onSubmit={submit}>
          <div className="field"><label htmlFor="new-password">New password</label>
            <input id="new-password" type="password" required minLength={12} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)}/></div>
          <div className="field"><label htmlFor="confirm-password">Confirm new password</label>
            <input id="confirm-password" type="password" required minLength={12} autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)}/></div>
          <button className="button button-light full-width" disabled={busy}>{busy?'Saving…':'Update password'}</button>
        </form>}
        {error && <p role="alert" className="status-message error-message">{error}</p>}
        <div className="auth-switch"><Link to="/login">Return to sign in</Link></div>
      </div>}
  </main>;
}
