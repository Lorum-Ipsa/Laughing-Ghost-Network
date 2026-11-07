import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import type { Work } from '@/lib/network';
import { kindLabels } from '@/lib/network';

const FILTERS = ['all', 'research', 'projects', 'table-talks'] as const;
type Filter = typeof FILTERS[number];

const FILTER_LABELS: Record<Filter, string> = {
	all: 'All',
	research: 'Research',
	projects: 'Projects',
	'table-talks': 'Table Talks',
};

function matches(item: Work, filter: Filter): boolean {
	if (filter === 'all') return true;
	if (filter === 'research') return ['research', 'writeup', 'intelligence', 'investigation', 'analysis', 'experiment', 'case_study', 'papers', 'advisories'].includes(item.kind);
	if (filter === 'projects') return item.kind === 'project';
	if (filter === 'table-talks') return item.kind === 'exercise';
	return true;
}

function actionVerb(item: Work): string {
	if (item.kind === 'project') return item.project_status === 'recruiting' ? 'is looking for contributors' : 'updated a project';
	if (item.kind === 'exercise') return item.exercise_status === 'open' ? 'is accepting participants' : 'proposed a Table Talk';
	return 'published new ' + (kindLabels[item.kind] || 'work').toLowerCase();
}

/**
 * Useful activity from across the network — not an algorithmic engagement feed.
 * Surfaces new research, artifact updates, recruiting projects, and open Table
 * Talks so a Ghost can find work to join, read, or build on. No likes, no
 * "someone viewed your profile."
 */
export function NetworkActivity({ work }: { work: Work[] }) {
	const [filter, setFilter] = useState<Filter>('all');
	const items = useMemo(() => work.filter((w) => matches(w, filter)).slice(0, 8), [work, filter]);

	return (
		<section className="gs-panel gs-network-activity">
			<div className="gs-panel-head">
				<h2 className="gs-panel-title">From the Network</h2>
				<div className="gs-filter-row" role="tablist" aria-label="Network activity filter">
					{FILTERS.map((f) => (
						<button
							key={f}
							type="button"
							role="tab"
							aria-selected={filter === f}
							className={`gs-filter-chip ${filter === f ? 'active' : ''}`}
							onClick={() => setFilter(f)}
						>
							{FILTER_LABELS[f]}
						</button>
					))}
				</div>
			</div>
			{items.length === 0 ? (
				<div className="gs-empty"><p>No recent network activity in this view.</p></div>
			) : (
				<ul className="gs-activity-list">
					{items.map((item) => {
						const author = item.expand?.author;
						return (
							<li key={item.id} className="gs-activity-item">
								<span className="gs-activity-dot" aria-hidden="true" />
								<span className="gs-activity-text">
									{author ? (
										<Link to={`/ghosts/${author.handle}`} className="gs-activity-author">{author.handle}</Link>
									) : (
										<span className="gs-activity-author">A Ghost</span>
									)}
									{' '}{actionVerb(item)}
									{' — '}
									<Link to={`/work/${item.id}`} className="gs-activity-title">{item.title}</Link>
								</span>
							</li>
						);
					})}
				</ul>
			)}
		</section>
	);
}
