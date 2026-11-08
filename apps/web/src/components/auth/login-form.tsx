import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowUpRight } from 'lucide-react';
import { useSupabaseAuth } from '@/hooks/use-supabase-auth';
import { resetPasswordRedirect, supabaseBrowser } from '@/lib/supabase-browser';

type Mode = 'signin' | 'reset' | 'verify';
export function LoginForm() {
  const { user, isLoading, error: sessionError } = useSupabaseAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('signin');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') || '').trim();
    const api = supabaseBrowser();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (mode === 'reset') {
        const { error } = await api.auth.resetPasswordForEmail(email, { redirectTo: resetPasswordRedirect() });
        if (error) throw error;
        setMessage('If the address has an account, a password recovery request was accepted. Check your inbox.');
      } else if (mode === 'verify') {
        const { error } = await api.auth.resend({
          type: 'signup', email,
          options: { emailRedirectTo: window.location.origin + '/verify-email' },
        });
        if (error) throw error;
        setMessage('Verification request accepted. Check your inbox and spam folder.');
      } else {
        const { data, error } = await api.auth.signInWithPassword({ email, password: String(form.get('password')) });
        if (error) {
          if (/email not confirmed/i.test(error.message)) {
            navigate('/verify-email', { state: { email } });
            return;
          }
          throw error;
        }
        if (!data.user?.email_confirmed_at) {
          navigate('/verify-email', { state: { email } });
        } else navigate('/ghost-space', { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed. Please try again.');
    } finally { setBusy(false); }
  }

  if (isLoading) return <div className="form-panel loading-state">Loading your session…</div>;
  if (user?.email_confirmed_at) return <div className="form-panel"><p>Your Ghost session is already active.</p>
    <Link className="button button-light full-width" to="/ghost-space">Go to Ghost Space <ArrowUpRight size={17}/></Link></div>;

  return <form className="form-panel" onSubmit={submit}>
    <h2>{mode === 'reset' ? 'Recover your access' : mode === 'verify' ? 'Resend verification email' : 'Private sign-in'}</h2>
    <p>{mode === 'signin' ? 'Your email address is never displayed in your public Ghost profile.' : 'We will send a link if the email address is eligible.'}</p>
    <div className="field"><label htmlFor="login-email">Email address</label>
      <input id="login-email" name="email" type="email" required autoComplete="email" /></div>
    {mode === 'signin' && <div className="field"><label htmlFor="login-password">Password</label>
      <input id="login-password" name="password" type="password" required autoComplete="current-password" /></div>}
    {(error || sessionError) && <p className="status-message error-message" role="alert">{error || sessionError}</p>}
    {message && <p className="status-message" role="status">{message}</p>}
    <button className="button button-light full-width" disabled={busy}>
      {busy ? 'Please wait…' : mode === 'reset' ? 'Send recovery link' : mode === 'verify' ? 'Resend verification' : 'Sign in'}
      {mode === 'signin' && <ArrowUpRight size={17}/>}
    </button>
    <div className="auth-switch">
      <button type="button" onClick={() => { setMode(mode === 'reset' ? 'signin' : 'reset'); setError(''); setMessage(''); }}>
        {mode === 'reset' ? 'Back to sign in' : 'Forgot password?'}</button>
      <button type="button" onClick={() => { setMode(mode === 'verify' ? 'signin' : 'verify'); setError(''); setMessage(''); }}>
        {mode === 'verify' ? 'Back to sign in' : "Didn't get a verification email?"}</button>
    </div>
    <div className="auth-switch">No account yet? <Link to="/join">Become a Ghost</Link></div>
  </form>;
}
