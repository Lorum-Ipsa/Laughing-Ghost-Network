import { Link } from 'react-router';
import type { Work, WorkKind } from '@/lib/network';

const RESEARCH_KINDS: WorkKind[] = [
	'research', 'writeup', 'intelligence', 'investigation', 'analysis',
	'experiment', 'case_study', 'papers', 'advisories',
];

type EvidenceCategory = { key: string; label: string; count: number; section: string };

function categorize(work: Work[]): EvidenceCategory[] {
	const isResearch = (k: WorkKind) => RESEARCH_KINDS.includes(k);
	const counts = { research: 0, arsenal: 0, projects: 0, tableTalks: 0, peerReviews: 0 };
	for (const item of work) {
		if (item.kind === 'project') counts.projects += 1;
		else if (item.kind === 'exercise') counts.tableTalks += 1;
		else if (item.kind === 'peer_review') counts.peerReviews += 1;
		else if (item.kind === 'community') continue;
		else if (isResearch(item.kind)) counts.research += 1;
		else counts.arsenal += 1;
	}
	return [
		{ key: 'research', label: 'Research', count: counts.research, section: 'contributions' },
		{ key: 'arsenal', label: 'Arsenal', count: counts.arsenal, section: 'contributions' },
		{ key: 'projects', label: 'Projects', count: counts.projects, section: 'projects' },
		{ key: 'table-talks', label: 'Table Talks', count: counts.tableTalks, section: 'table-talks' },
		{ key: 'peer-reviews', label: 'Peer Reviews', count: counts.peerReviews, section: 'contributions' },
	];
}

/**
 * Mirrors the public reputation model: counts of what a Ghost has built, never
 * social engagement metrics. Each count opens the relevant management section.
 * No followers, likes, karma, rank, or profile views — those are deliberately
 * absent because they pull the product toward social-media incentives.
 */
export function EvidenceSummary({ work }: { work: Work[] }) {
	const categories = categorize(work);
	return (
		<section className="gs-panel gs-evidence">
			<h2 className="gs-panel-title">Your work</h2>
			<ul className="gs-evidence-list">
				{categories.map((cat) => (
					<li key={cat.key}>
						<Link to={`/ghost-space?section=${cat.section}`} className="gs-evidence-item">
							<span className="gs-evidence-count">{cat.count}</span>
							<span className="gs-evidence-label">{cat.label}</span>
						</Link>
					</li>
				))}
			</ul>
		</section>
	);
}
