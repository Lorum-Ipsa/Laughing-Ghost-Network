import { Link } from 'react-router';
import { Check, Minus } from 'lucide-react';
import type { GhostProfile } from '@/lib/network';
import { parseExternalLinks, featuredIds } from '@/lib/network';

type CompletionItem = { label: string; filled: boolean };

function completionItems(profile: GhostProfile | null): CompletionItem[] {
	return [
		{ label: 'Specialties', filled: Boolean(profile?.specialties?.trim()) },
		{ label: 'Skills', filled: Boolean(profile?.skills?.trim()) },
		{ label: 'Languages', filled: Boolean(profile?.languages?.trim()) },
		{ label: 'External identities', filled: parseExternalLinks(profile?.external_links).length > 0 },
		{ label: 'Bio', filled: Boolean(profile?.bio?.trim()) },
		{ label: 'Featured work', filled: featuredIds(profile?.featured_work).length > 0 },
		{ label: 'Collaboration interests', filled: Boolean(profile?.collaboration_interests?.trim()) },
	];
}

export function ProfileStatus({ profile }: { profile: GhostProfile | null }) {
	const items = completionItems(profile);
	const filled = items.filter((item) => item.filled).length;
	const percent = Math.round((filled / items.length) * 100);

	return (
		<section className="gs-panel gs-profile-status">
			<div className="gs-panel-head">
				<h2 className="gs-panel-title">Profile status</h2>
				<span className="gs-completion">{percent}% COMPLETE</span>
			</div>
			<div className="gs-completion-bar" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
				<span style={{ width: `${percent}%` }} />
			</div>
			<ul className="gs-completion-list">
				{items.map((item) => (
					<li key={item.label} className={item.filled ? 'done' : 'missing'}>
						{item.filled ? <Check size={13} strokeWidth={2} /> : <Minus size={13} strokeWidth={2} />}
						<span>{item.label}</span>
						{!item.filled && <span className="gs-missing-tag">missing</span>}
					</li>
				))}
			</ul>
			{percent < 100 && (
				<Link to="/ghost-space?section=profile" className="gs-panel-link">
					Complete your profile ↗
				</Link>
			)}
		</section>
	);
}
