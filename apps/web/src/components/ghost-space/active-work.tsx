import { Link } from 'react-router';
import { FileText, FolderGit2, MessagesSquare } from 'lucide-react';
import type { Work } from '@/lib/network';
import { kindLabels } from '@/lib/network';

function relativeTime(iso: string): string {
	const then = new Date(iso).getTime();
	if (Number.isNaN(then)) return '';
	const diff = Date.now() - then;
	const mins = Math.round(diff / 60000);
	if (mins < 1) return 'just now';
	if (mins < 60) return `${mins}m ago`;
	const hours = Math.round(mins / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.round(hours / 24);
	if (days < 30) return `${days}d ago`;
	const months = Math.round(days / 30);
	return `${months}mo ago`;
}

type ActiveItem = {
	id: string;
	to: string;
	icon: typeof FileText;
	kindLabel: string;
	title: string;
	meta: string;
};

function activeItems(work: Work[]): ActiveItem[] {
	const items: ActiveItem[] = [];
	for (const w of work) {
		if (w.kind === 'project' && w.project_status && ['proposed', 'recruiting', 'active'].includes(w.project_status)) {
			items.push({
				id: w.id, to: `/work/${w.id}`, icon: FolderGit2,
				kindLabel: 'Project', title: w.title,
				meta: [w.project_status, w.accepting_contributors ? 'Recruiting' : '', relativeTime(w.updated)].filter(Boolean).join(' · '),
			});
		} else if (w.kind === 'exercise' && w.exercise_status && ['draft', 'open', 'scheduled'].includes(w.exercise_status)) {
			items.push({
				id: w.id, to: `/work/${w.id}`, icon: MessagesSquare,
				kindLabel: w.exercise_status === 'draft' ? 'Table Talk draft' : 'Table Talk',
				title: w.title, meta: [w.exercise_status, relativeTime(w.updated)].filter(Boolean).join(' · '),
			});
		} else if (w.status !== 'published') {
			items.push({
				id: w.id, to: `/work/${w.id}`, icon: FileText,
				kindLabel: `${kindLabels[w.kind] || 'Work'} draft`, title: w.title,
				meta: ['Draft', relativeTime(w.updated)].filter(Boolean).join(' · '),
			});
		}
	}
	return items.slice(0, 6);
}

/**
 * What a Ghost is actively working on — drafts awaiting review, live projects,
 * and upcoming Table Talks. This is what makes Ghost Space useful rather than
 * merely administrative.
 */
export function ActiveWork({ work }: { work: Work[] }) {
	const items = activeItems(work);
	return (
		<section className="gs-panel gs-active">
			<div className="gs-panel-head">
				<h2 className="gs-panel-title">In progress</h2>
				{items.length > 0 && <Link to="/ghost-space?section=contributions" className="gs-panel-link">All contributions ↗</Link>}
			</div>
			{items.length === 0 ? (
				<div className="gs-empty">
					<p>Nothing in progress yet.</p>
					<Link to="/contribute" className="gs-panel-link">Start your first contribution ↗</Link>
				</div>
			) : (
				<ul className="gs-active-list">
					{items.map((item) => (
						<li key={item.id}>
							<Link to={item.to} className="gs-active-item">
								<span className="gs-active-icon"><item.icon size={15} strokeWidth={1.5} /></span>
								<span className="gs-active-body">
									<span className="gs-active-kind">{item.kindLabel}</span>
									<span className="gs-active-title">{item.title}</span>
									<span className="gs-active-meta">{item.meta}</span>
								</span>
							</Link>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
