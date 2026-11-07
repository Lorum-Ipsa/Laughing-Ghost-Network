import { GhostAvatar } from '@/components/ghost-avatar';
import type { GhostProfile } from '@/lib/network';

/**
 * The dashboard greeting. Personal, not promotional — it reinforces the
 * network's thesis: a Ghost's identity persists through what they build, not
 * through social metrics.
 */
export function Welcome({ profile }: { profile: GhostProfile | null }) {
	const handle = profile?.handle || 'Ghost';
	return (
		<header className="gs-welcome">
			{profile && <GhostAvatar profile={profile} size={56} className="gs-welcome-avatar" forceShow />}
			<div>
				<span className="eyebrow"><span className="tiny-dot" /> GHOST SPACE / DASHBOARD</span>
				<h1>Welcome back, {handle}<span className="accent-period">.</span></h1>
				<p className="gs-welcome-lede">Your identity persists through what you build.</p>
			</div>
		</header>
	);
}
