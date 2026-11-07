import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowUpRight, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { pocketbaseClient as pb } from '@/lib/pocketbase-client';

type Mode = 'signin' | 'reset' | 'verify';

export function LoginForm() {
	const { login, user, isLoading } = useAuth();
	const navigate = useNavigate();
	const [mode, setMode] = useState<Mode>('signin');
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');
	const [message, setMessage] = useState('');

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const data = new FormData(event.currentTarget);
		const email = String(data.get('email'));
		setBusy(true);
		setError('');
		setMessage('');
		try {
			if (mode === 'reset') {
				await pb.collection('users').requestPasswordReset(email);
				setMessage('If an account matches this address, a password-reset request was accepted. Check your inbox; delivery depends on the configured email service.');
			} else if (mode === 'verify') {
				await pb.collection('users').requestVerification(email);
				setMessage('If an account matches this address, a verification request was accepted. Check your inbox; delivery depends on the configured email service.');
			} else {
				await login(email, String(data.get('password')));
				// Unverified members may sign in only far enough to resend the
				// verification email or finish onboarding — gate them at the
				// verification page, not Ghost Space.
				if (!pb.authStore.record?.verified) {
					navigate('/verify-email', { state: { email } });
				} else {
					navigate('/ghost-space');
				}
			}
		} catch (err) {
			setError(describeAuthError(err, mode));
		} finally {
			setBusy(false);
		}
	}

	if (isLoading) return <div className="form-panel loading-state">Loading your session…</div>;
	if (user) return <div className="form-panel"><p>Your session is already open.</p><Link className="button button-light full-width" to="/ghost-space">Go to Ghost Space <ArrowUpRight size={16} /></Link></div>;

	return (
		<form className="form-panel" onSubmit={submit}>
			<h2>{mode === 'reset' ? 'Recover your access' : mode === 'verify' ? 'Resend verification email' : 'Private sign-in'}</h2>
			<p>{mode === 'reset' ? 'Reset your password by email.' : mode === 'verify' ? 'Send a new verification link to your email address.' : 'Your email address never appears on your public profile.'}</p>
			<div className="field"><label htmlFor="login-email">Email address</label><input id="login-email" name="email" required type="email" autoComplete="email" placeholder="you@example.com" /></div>
			{mode === 'signin' && <div className="field"><label htmlFor="login-password">Password</label><input id="login-password" name="password" type="password" required autoComplete="current-password" /></div>}
			{error && <p className="status-message error-message" role="alert">{error}</p>}
			{message && <p className="status-message" role="status">{message}</p>}
			<button className="button button-light full-width" disabled={busy}>
				{busy ? 'Please wait…' : mode === 'reset' ? 'Send reset link' : mode === 'verify' ? <><RefreshCw size={15} /> Send verification email</> : 'Sign in'}
				{mode === 'signin' && <ArrowUpRight size={17} />}
			</button>
			<div className="auth-switch">
				<button type="button" onClick={() => { setMode(mode === 'reset' ? 'signin' : 'reset'); setError(''); setMessage(''); }}>{mode === 'reset' ? 'Back to sign-in' : 'Forgot password?'}</button>
				<button type="button" onClick={() => { setMode(mode === 'verify' ? 'signin' : 'verify'); setError(''); setMessage(''); }}>{mode === 'verify' ? 'Back to sign-in' : "Didn't get a verification email?"}</button>
			</div>
			<div className="auth-switch">No account yet? <Link to="/join">Become a Ghost</Link></div>
		</form>
	);
}

function describeAuthError(err: unknown, mode: Mode): string {
	const e = err as { message?: string; status?: number; response?: { data?: Record<string, unknown> } };
	// Suspended accounts fail auth with a recognizable message.
	const msg = e?.message || '';
	if (/suspended|disabled|inactive/i.test(msg)) {
		return 'This account is suspended. Contact a moderator if you believe this is an error.';
	}
	if (mode === 'reset') return 'Sending failed. Please try again in a moment.';
	if (mode === 'verify') return 'Could not send the verification email. Please try again in a moment.';
	return 'Sign-in failed. Check your email address and password.';
}
