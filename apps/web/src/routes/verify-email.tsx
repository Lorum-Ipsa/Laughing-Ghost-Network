import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation } from 'react-router';
import { ArrowUpRight, RefreshCw } from 'lucide-react';
import type { Route } from './+types/verify-email';
import { seo } from '@/lib/seo';
import { supabaseBrowser, verifyEmailRedirect } from '@/lib/supabase-browser';

export function meta({ matches, location }: Route.MetaArgs) {
  return seo({ matches, location }, {
    title: 'Confirm your Ghost email — LGN',
    description: 'Confirm your email address to activate your pseudonymous LGN account.',
    noindex: true,
  });
}

type Status = 'checking' | 'pending' | 'verified' | 'error';

/** The normal Supabase email link returns here; the browser client consumes the
 * returned implicit-flow session fragment without sending it to the server. */
export default function VerifyEmail() {
  const location = useLocation();
  const incomingEmail = (location.state as { email?: string } | null)?.email || '';
  const [email, setEmail] = useState(incomingEmail);
  const [status, setStatus] = useState<Status>('checking');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    let alive = true;
    try {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const returnedError = hash.get('error_description') || hash.get('error');
      if (returnedError) {
        setStatus('error');
        setError(returnedError);
        return;
      }
      const api = supabaseBrowser();
      void api.auth.getSession().then(async ({ error: sessionError }) => {
        if (sessionError) throw sessionError;
        const { data, error: userError } = await api.auth.getUser();
        if (!alive) return;
        if (userError || !data.user) { setStatus('pending'); return; }
        if (data.user.email_confirmed_at) setStatus('verified');
        else setStatus('pending');
      }).catch(e => {
        if (!alive) return;
        setStatus('error');
        setError(e instanceof Error ? e.message : 'Could not check the verification link.');
      });
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : 'Unable to initialize verification.');
    }
    return () => { alive = false; };
  }, []);

  async function resend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !email.trim()) return;
    setBusy(true);
    setError('');
    setResent(false);
    try {
      const { error } = await supabaseBrowser().auth.resend({
        type: 'signup',
        email: email.trim(),
        options: { emailRedirectTo: verifyEmailRedirect() },
      });
      if (error) throw error;
      setResent(true);
      setStatus('pending');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification request failed.');
      setStatus('error');
    } finally { setBusy(false); }
  }

  return <main className="login-wrap">
    <span className="eyebrow"><span className="tiny-dot" /> GHOST ACCOUNT / EMAIL CONFIRMATION</span>
    <h1>{status === 'verified' ? 'Email verified' : status === 'checking' ? 'Checking link' : 'Verify your email'}<span className="accent-period">.</span></h1>
    <div className="form-panel">
      {status === 'checking' && <div className="loading-state">Checking your confirmation link…</div>}
      {status === 'verified' && <>
        <p className="status-message" role="status">Your email is confirmed. Your account is ready for Ghost Space.</p>
        <p className="muted-note">On first entry, your reserved Ghost handle and profile will be created. If the handle has since been claimed, you can choose another.</p>
        <Link to="/ghost-space" className="button button-light full-width">Enter Ghost Space <ArrowUpRight size={17}/></Link>
      </>}
      {(status === 'pending' || status === 'error') && <>
        <p>{status === 'pending'
          ? 'Your account has not yet been confirmed in this browser. Check your inbox and spam folder, then follow the confirmation link.'
          : 'The confirmation could not be completed. You can request a new link below.'}</p>
        <p className="muted-note">An accepted email request does not guarantee delivery. The sender is configured in LGN Supabase Auth.</p>
        <form onSubmit={resend}>
          <div className="field">
            <label htmlFor="verify-email">Registration email</label>
            <input id="verify-email" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)}/>
          </div>
          <button type="submit" disabled={busy} className="button button-light full-width">
            <RefreshCw size={15}/> {busy ? 'Requesting…' : 'Resend verification link'}
          </button>
        </form>
        {resent && <p className="status-message" role="status">A verification request was accepted. Check your inbox.</p>}
        {error && <p className="status-message error-message" role="alert">{error}</p>}
        <div className="auth-switch">Already confirmed? <Link to="/login">Sign in</Link></div>
      </>}
    </div>
  </main>;
}
