import { Link } from 'react-router';
import { FileText, Package, FolderGit2, MessagesSquare } from 'lucide-react';

/**
 * The four primary creation actions on the dashboard. These are the most
 * important controls in Ghost Space — they are what turns a member from a
 * reader into a contributor. Each opens the contribution editor seeded with
 * the matching kind.
 */
const ACTIONS = [
	{ kind: 'research', label: 'Publish research', icon: FileText },
	{ kind: 'detection', label: 'Add artifact', icon: Package },
	{ kind: 'project', label: 'Start project', icon: FolderGit2 },
	{ kind: 'exercise', label: 'Propose Table Talk', icon: MessagesSquare },
] as const;

export function QuickActions() {
	return (
		<section className="gs-panel gs-quick-actions">
			<h2 className="gs-panel-title">Quick actions</h2>
			<div className="gs-action-grid">
				{ACTIONS.map(({ kind, label, icon: Icon }) => (
					<Link key={kind} to={`/contribute?kind=${kind}`} className="gs-action">
						<span className="gs-action-plus" aria-hidden="true">+</span>
						<span className="gs-action-label">
							<Icon size={15} strokeWidth={1.5} />
							{label}
						</span>
					</Link>
				))}
			</div>
		</section>
	);
}
