import { Link } from 'react-router';
import { ArrowUpRight, UserPlus, Handshake } from 'lucide-react';
import { GhostAvatar } from '@/components/ghost-avatar';
import { locationDisplay, tagsOf, type GhostProfile, type Work } from '@/lib/network';

/**
 * A Ghost card in the Network workspace. Shows the public identity, key tags,
 * languages, disclosure-capped location, and availability signals — then three
 * actions: view the public profile, invite to one of the member's projects, or
 * send a structured collaboration request. No followers, likes, or rankings.
 */
export function NetworkGhostCard({
	profile,
	myProjects,
	onRequest,
}: {
	profile: GhostProfile;
	myProjects: Work[];
	onRequest: (recipient: GhostProfile, relatedWork?: Work | null) => void;
}) {
	const specialties = tagsOf(profile.specialties).slice(0, 4);
	const tags = [...tagsOf(profile.skills || ''), ...tagsOf(profile.tools || '')].slice(0, 5);
	const languages = tagsOf(profile.languages || '');
	const openness = [
		profile.available_for_work && 'Work',
		profile.open_to_collaboration && 'Collaboration',
		profile.open_to_research && 'Research',
		profile.open_to_mentorship && 'Mentorship',
		profile.open_to_speaking && 'Speaking',
	].filter(Boolean) as string[];

	return (
		<article className="gs-network-card">
			<div className="gs-network-head">
				<GhostAvatar profile={profile} size={48} className="directory-avatar" />
				<span className="example-badge">{profile.example ? 'EXAMPLE' : profile.member ? 'MEMBER' : 'GHOST'}</span>
			</div>
			<h3 className="gs-network-handle">{profile.handle}</h3>
			{specialties.length > 0 && <p className="gs-network-specialties">{specialties.join(' · ')}</p>}
			{tags.length > 0 && <div className="tags">{tags.map((tag) => <span key={tag}>{tag}</span>)}</div>}
			<div className="gs-network-meta">
				{languages.length > 0 && <span className="gs-network-meta-row"><span className="meta-label">Languages</span><span>{languages.join(' · ')}</span></span>}
				<span className="gs-network-meta-row"><span className="meta-label">Location</span><span>{locationDisplay(profile)}</span></span>
			</div>
			{openness.length > 0 && (
				<div className="gs-network-open">
					<span className="meta-label">Open to</span>
					<div className="gs-network-open-tags">{openness.map((o) => <span key={o} className="status-pill">{o}</span>)}</div>
				</div>
			)}
			<div className="gs-network-actions">
				<Link to={`/ghosts/${encodeURIComponent(profile.handle)}`} className="gs-card-action">View profile <ArrowUpRight size={13} strokeWidth={1.5} /></Link>
				<button type="button" className="gs-card-action" onClick={() => onRequest(profile, null)}><Handshake size={13} strokeWidth={1.5} /> Request collaboration</button>
				{myProjects.length > 0 && (
					<button type="button" className="gs-card-action" onClick={() => onRequest(profile, myProjects[0])}><UserPlus size={13} strokeWidth={1.5} /> Invite to project</button>
				)}
			</div>
		</article>
	);
}
