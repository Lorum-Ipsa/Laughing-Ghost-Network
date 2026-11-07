import { useState } from 'react';
import { Link } from 'react-router';
import { MailWarning, RefreshCw, ArrowUpRight } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { pocketbaseClient as pb } from '@/lib/pocketbase-client';

/**
 * Shown at the top of Ghost Space when the signed-in member's email is not yet
 * verified. Unverified members may finish onboarding and resend the
 * verification email, but publishing, projects, and Table Talks are gated
 * server-side until the email is confirmed.
 */
export function VerificationBanner() {
	const { user } = useAuth();
	const [busy, setBusy] = useState(false);
	const [sent, setSent] = useState(false);
	const [error, setError] = useState('');

	if (user?.verified) return null;

	async function resend() {
		if (!user?.email) return;
		setBusy(true);
		setError('');
		setSent(false);
		try {
			await pb.collection('users').requestVerification(user.email);
			setSent(true);
		} catch {
			setError('The verification email could not be sent. Try again in a moment.');
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className="gs-verify-banner" role="status">
			<div className="gs-verify-banner-head">
				<MailWarning size={16} />
				<div>
					<strong>Your email is not verified yet.</strong>
					<span>Verify your email to unlock publishing, projects, and Table Talks. You can still finish setting up your profile.</span>
				</div>
			</div>
			<div className="gs-verify-banner-actions">
				<button type="button" className="button button-light" onClick={resend} disabled={busy}>
					<RefreshCw size={14} /> {busy ? 'Sending…' : 'Resend email'}
				</button>
				<Link className="button button-outline" to="/verify-email">Verify now <ArrowUpRight size={14} /></Link>
			</div>
			{sent && <p className="gs-verify-banner-note">Verification request accepted for {user?.email}. Check your inbox; delivery is not confirmed.</p>}
			{error && <p className="gs-verify-banner-note gs-verify-banner-error">{error}</p>}
		</div>
	);
}
