import { Link } from 'react-router';

type Placeholder = {
	title: string;
	description: string;
	hint: string;
};

const PLACEHOLDERS: Record<string, Placeholder> = {
	profile: {
		title: 'My Profile',
		description: 'A modular identity editor: handle, bio, practice specialties, skills, tools, platforms, industries, developing areas, location disclosure, languages with proficiency, availability, and external identities.',
		hint: 'This section is built next. For now, your profile editor lives in the legacy account space.',
	},
	contributions: {
		title: 'Contributions workspace',
		description: 'Drafts, In Review, Published, Needs Revision, and Archived — with a dynamic contribution editor that adapts to each type (Research, Arsenal, Writeup, Project, Table Talk) and a Draft → Review → Revision → Published workflow.',
		hint: 'You can already submit work from the legacy contribute flow.',
	},
	projects: {
		title: 'Projects workspace',
		description: 'Maintaining, Contributing, and Watching — with project Overview, Tasks, Contributions, Ghosts, Updates, Related Work, and Settings. Tasks track Open, In progress, and Complete.',
		hint: 'Public project discovery is available on the Projects page.',
	},
	'table-talks': {
		title: 'Table Talks workspace',
		description: 'Upcoming sessions you are joining or facilitating, completed exercises with debriefs, and your participation history — which becomes evidence on your public profile.',
		hint: 'Public Table Talks discovery is available on the Table Talks page.',
	},
	network: {
		title: 'Network search',
		description: 'A more powerful member search than the public directory: find a Ghost by skill, tool, platform, language, and specialty — then invite to project or request collaboration.',
		hint: 'The public Ghosts directory is available now.',
	},
	notifications: {
		title: 'Notifications',
		description: 'Low-noise notices: contribution reviews, project invitations and changes, Table Talk registrations, collaboration requests, mentions, and moderation/account notices. No "someone viewed your profile."',
		hint: 'This section is built later in the roadmap.',
	},
	settings: {
		title: 'Settings & security',
		description: 'Account, privacy, language, notifications, identity (handle-change request), and security — passkeys, authenticator MFA, recovery codes, and active sessions.',
		hint: 'For a cybersecurity network, MFA and passkeys are an early priority on the roadmap.',
	},
};

/**
 * Placeholder for Ghost Space sections that have not been built yet. The
 * dashboard is the first functional section; each remaining section is built
 * one at a time after review.
 */
export function SectionPlaceholder({ section }: { section: string }) {
	const content = PLACEHOLDERS[section];
	if (!content) return null;
	return (
		<div className="gs-placeholder">
			<span className="eyebrow"><span className="tiny-dot" /> COMING NEXT</span>
			<h1>{content.title}</h1>
			<p className="gs-placeholder-desc">{content.description}</p>
			<p className="muted-note">{content.hint}</p>
			<div className="gs-placeholder-actions">
				<Link to="/ghost-space?section=dashboard" className="button button-outline">Back to dashboard</Link>
			</div>
		</div>
	);
}
