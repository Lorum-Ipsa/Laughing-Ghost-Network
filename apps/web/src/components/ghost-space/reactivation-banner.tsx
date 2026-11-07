import { useState } from 'react';
import { PauseCircle, RotateCcw } from 'lucide-react';
import { pocketbaseClient as pb } from '@/lib/pocketbase-client';
import type { GhostProfile } from '@/lib/network';

/**
 * Shown when the signed-in member's profile is soft-deleted (deactivated).
 * The account still authenticates, but the public profile is hidden. The
 * member can reactivate it here; published work stays attributed to the handle
 * either way.
 */
export function ReactivationBanner({ profile, onReactivated }: { profile: GhostProfile; onReactivated: () => void }) {
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');

	if (!profile.deleted) return null;

	async function reactivate() {
		setBusy(true);
		setError('');
		try {
			await pb.collection('ghost_profiles').update(profile.id, { deleted: false, deleted_at: '' });
			onReactivated();
		} catch {
			setError('Could not reactivate your profile. Try again in a moment.');
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className="gs-verify-banner" role="status" style={{ borderColor: 'hsl(var(--destructive) / .4)', background: 'hsl(var(--destructive) / .06)' }}>
			<div className="gs-verify-banner-head">
				<PauseCircle size={16} />
				<div>
					<strong style={{ color: 'hsl(var(--destructive))' }}>Your profile is deactivated.</strong>
					<span>Your public profile is hidden. Published work remains attributed to your handle. Reactivate to make your profile visible again.</span>
				</div>
			</div>
			<div className="gs-verify-banner-actions">
				<button type="button" className="button button-light" onClick={reactivate} disabled={busy}>
					<RotateCcw size={14} /> {busy ? 'Reactivating…' : 'Reactivate profile'}
				</button>
			</div>
			{error && <p className="gs-verify-banner-note gs-verify-banner-error">{error}</p>}
		</div>
	);
}
