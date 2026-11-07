import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router';
import { ArrowUpRight, MailCheck, MailWarning, RefreshCw, ShieldCheck } from 'lucide-react';
import type { Route } from './+types/verify-email';
import { seo } from '@/lib/seo';
import { useAuth } from '@/hooks/use-auth';
import { pocketbaseClient as pb } from '@/lib/pocketbase-client';

export function meta({ matches, location }: Route.MetaArgs) {
	return seo({ matches, location }, {
		title: 'Verify your email — LGN',
		description: 'Confirm your email address to activate your Ghost account and enter Ghost Space.',
		noindex: true,
	});
}

type VerifyState = 'verifying' | 'success' | 'error' | 'pending';

/** Pulls the real backend/email error out of a PocketBase ClientResponseError. */
function describeError(err: unknown): string {
	if (err && typeof err === 'object') {
		const e = err as { message?: string; response?: { data?: Record<string, unknown> }; status?: number };
		if (e.response?.data) {
			// PocketBase nests a human-readable message under the data key.
			const data = e.response.data;
			const first = Object.values(data)[0];
			if (first && typeof first === 'object' && 'message' in (first as Record<string, unknown>)) {
				return String((first as { message: string }).message);
			}
		}
		if (e.message) return e.message;
	}
	return 'Something went wrong. Please try again in a moment.';
}

export default function VerifyEmail() {
	const [params] = useSearchParams();
	const token = params.get('token');
	const location = useLocation();
	const { user, isLoading } = useAuth();
	const navigationState = location.state as { email?: string; error?: string } | null;
	const stateEmail = navigationState?.email;
	const initialRequestError = navigationState?.error || '';
	const email = stateEmail || user?.email || '';

	const [status, setStatus] = useState<VerifyState>(token ? 'verifying' : 'pending');
	const [error, setError] = useState(() => initialRequestError);
	const [resending, setResending] = useState(false);
	const [resent, setResent] = useState(false);

	useEffect(() => {
		if (!token) return;
		let active = true;
		setStatus('verifying');
		setError('');
		pb.collection('users').confirmVerification(token)
			.then(() => { if (active) setStatus('success'); })
			.catch((err) => { if (active) { setStatus('error'); setError(describeError(err)); } });
		return () => { active = false; };
	}, [token]);

	async function resend(event: FormEvent) {
		event.preventDefault();
		if (!email) return;
		setResending(true);
		setError('');
		setResent(false);
		try {
			await pb.collection('users').requestVerification(email);
			setResent(true);
		} catch (err) {
			setError(describeError(err));
		} finally {
			setResending(false);
		}
	}

	return (
		<main className="login-wrap">
			<span className="eyebrow"><span className="tiny-dot" /> EMAIL VERIFICATION</span>

			{status === 'verifying' && (
				<>
					<h1>Verifying<span className="accent-period">.</span></h1>
					<div className="form-panel">
						<div className="loading-state"><div className="loading-bar" />Confirming your email address…</div>
					</div>
				</>
			)}

			{status === 'success' && (
				<>
					<h1>Email verified<span className="accent-period">.</span></h1>
					<div className="form-panel">
						<p className="status-message" role="status" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
							<MailCheck size={16} /> Your email is verified. Your Ghost account is active.
						</p>
						<p className="muted-note">You can now publish contributions, join projects, and participate in Table Talks.</p>
						<Link className="button button-light full-width" to="/ghost-space">Enter Ghost Space <ArrowUpRight size={17} /></Link>
						<div className="auth-switch">Want to sign in elsewhere? <Link to="/login">Sign in</Link></div>
					</div>
				</>
			)}

			{status === 'error' && (
				<>
					<h1>Verification failed<span className="accent-period">.</span></h1>
					<div className="form-panel">
						<p className="status-message error-message" role="alert" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
							<MailWarning size={16} /> {error || 'The verification link is invalid or has expired.'}
						</p>
						<p className="muted-note">Links expire for security. Request a new verification email and try again.</p>
						{email ? (
							<form onSubmit={resend}>
								<button className="button button-light full-width" type="submit" disabled={resending}>
									<RefreshCw size={15} /> {resending ? 'Sending…' : 'Resend verification email'}
								</button>
							</form>
						) : (
							<Link className="button button-light full-width" to="/login">Sign in to resend <ArrowUpRight size={16} /></Link>
						)}
						{resent && <p className="status-message" role="status">Verification request accepted for {email}. Check your inbox; delivery is not confirmed.</p>}
						<div className="auth-switch">Need to sign in? <Link to="/login">Sign in</Link></div>
					</div>
				</>
			)}

			{status === 'pending' && (
				<>
					<h1>Check your email<span className="accent-period">.</span></h1>
					<div className="form-panel">
						<p className="muted-note" style={{ marginBottom: 20 }}>
							{error ? <>We could not request a verification email{email ? <> for <strong>{email}</strong></> : null}. Your Ghost account may exist, but its email is still unverified. Check the error below and retry once email delivery is configured.</> : <>A verification email was requested{email ? <> for <strong>{email}</strong></> : null}. Check your inbox and spam folder. Delivery requires a configured email service; a successful request alone does not confirm that a message arrived.</>}
						</p>
						{!isLoading && !user && (
							<p className="muted-note" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
								<ShieldCheck size={14} /> Until verified, you can sign in to resend the email or finish setting up your profile, but cannot publish or join network activities.
							</p>
						)}
						{error && <p className="status-message error-message" role="alert">{error}</p>}
						{email && (
							<form onSubmit={resend}>
								<button className="button button-light full-width" type="submit" disabled={resending}>
									<RefreshCw size={15} /> {resending ? 'Sending…' : 'Resend verification email'}
								</button>
							</form>
						)}
						{resent && <p className="status-message" role="status">Verification request accepted for {email}. Check your inbox; delivery is not confirmed.</p>}
						{!isLoading && user ? (
							<Link className="button button-outline full-width" to="/ghost-space" style={{ marginTop: 12 }}>Go to Ghost Space <ArrowUpRight size={16} /></Link>
						) : (
							<div className="auth-switch">Already verified? <Link to="/login">Sign in</Link></div>
						)}
					</div>
				</>
			)}
		</main>
	);
}
