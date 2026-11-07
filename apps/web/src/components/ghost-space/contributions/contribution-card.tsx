import { Link } from 'react-router';
import { FileText, Eye, Send, Archive, Undo2, RefreshCw, MessageSquare, ExternalLink, Edit3 } from 'lucide-react';
import type { Work, WorkStatus } from '@/lib/network';
import { kindLabels, reviewStatusLabel } from '@/lib/network';
import { contentLanguageLabel } from '@/lib/languages';

export type ContributionTab = 'drafts' | 'in_review' | 'needs_revision' | 'published' | 'archived';

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

const STATUS_LABEL: Record<WorkStatus, string> = {
	draft: 'Draft',
	submitted: 'In Review',
	revision_requested: 'Needs Revision',
	published: 'Published',
	rejected: 'Rejected',
	archived: 'Archived',
};

const STATUS_CLASS: Record<WorkStatus, string> = {
	draft: 'gs-status-draft',
	submitted: 'gs-status-review',
	revision_requested: 'gs-status-revision',
	published: 'gs-status-published',
	rejected: 'gs-status-rejected',
	archived: 'gs-status-archived',
};

type Action = { key: string; label: string; icon: typeof FileText; onClick: () => void; primary?: boolean };
type LinkAction = { key: string; label: string; icon: typeof FileText; to: string; primary?: boolean };

/**
 * A single contribution in the workspace list. The card surfaces the identity
 * of the work — type, original language, status, review state, and the related
 * project or Table Talk if it is one — and offers the workflow actions that are
 * legal for its current state. No popularity metrics appear anywhere.
 */
export function ContributionCard({
	work,
	reviewCount,
	onEdit,
	onPreview,
	onViewFeedback,
	onSubmit,
	onWithdraw,
	onRevise,
	onArchive,
	onRestore,
}: {
	work: Work;
	reviewCount: number;
	onEdit: () => void;
	onPreview: () => void;
	onViewFeedback: () => void;
	onSubmit: () => void;
	onWithdraw: () => void;
	onRevise: () => void;
	onArchive: () => void;
	onRestore: () => void;
}) {
	const status = work.status;
	const actions: (Action | LinkAction)[] = [];

	if (status === 'draft') {
		actions.push({ key: 'edit', label: 'Edit', icon: Edit3, onClick: onEdit });
		actions.push({ key: 'preview', label: 'Preview', icon: Eye, onClick: onPreview });
		actions.push({ key: 'submit', label: 'Submit for Review', icon: Send, onClick: onSubmit, primary: true });
		actions.push({ key: 'archive', label: 'Archive', icon: Archive, onClick: onArchive });
	} else if (status === 'submitted') {
		actions.push({ key: 'feedback', label: 'View feedback', icon: MessageSquare, onClick: onViewFeedback });
		actions.push({ key: 'preview', label: 'Open submission', icon: Eye, onClick: onPreview });
		actions.push({ key: 'withdraw', label: 'Withdraw to draft', icon: Undo2, onClick: onWithdraw });
		actions.push({ key: 'archive', label: 'Archive', icon: Archive, onClick: onArchive });
	} else if (status === 'revision_requested' || status === 'rejected') {
		actions.push({ key: 'feedback', label: 'View feedback', icon: MessageSquare, onClick: onViewFeedback });
		actions.push({ key: 'edit', label: 'Edit', icon: Edit3, onClick: onEdit });
		actions.push({ key: 'revise', label: status === 'rejected' ? 'Resubmit' : 'Revise', icon: RefreshCw, onClick: onRevise, primary: true });
		actions.push({ key: 'archive', label: 'Archive', icon: Archive, onClick: onArchive });
	} else if (status === 'published') {
		actions.push({ key: 'view', label: 'View public page', icon: ExternalLink, to: `/work/${work.id}`, primary: true });
		actions.push({ key: 'feedback', label: 'View feedback', icon: MessageSquare, onClick: onViewFeedback });
		actions.push({ key: 'revise', label: 'Create revision', icon: Edit3, onClick: onEdit });
	} else if (status === 'archived') {
		actions.push({ key: 'preview', label: 'Preview', icon: Eye, onClick: onPreview });
		actions.push({ key: 'restore', label: 'Restore to draft', icon: Undo2, onClick: onRestore });
	}

	const related = work.kind === 'project'
		? `Project · ${work.project_status || 'proposed'}`
		: work.kind === 'exercise'
			? `Table Talk · ${work.exercise_status || 'open'}`
			: work.domain
				? work.domain
				: '';

	return (
		<article className="gs-card">
			<div className="gs-card-main">
				<div className="gs-card-head">
					<span className="gs-card-type">{kindLabels[work.kind] || work.kind}</span>
					<span className={`gs-status ${STATUS_CLASS[status]}`}>{STATUS_LABEL[status]}</span>
				</div>
				<h3 className="gs-card-title">{work.title}</h3>
				<div className="gs-card-meta">
					{related && <span>{related}</span>}
					{work.language && <span>{contentLanguageLabel(work.language)}</span>}
					{work.version && <span>v{work.version}</span>}
					<span>Updated {relativeTime(work.updated)}</span>
				</div>
				<div className="gs-card-foot">
					<span className="gs-review-state">
						{reviewStatusLabel(work.review_status)}
						{reviewCount > 0 && <span className="gs-review-count">{reviewCount} review{reviewCount > 1 ? 's' : ''}</span>}
					</span>
				</div>
			</div>
			<div className="gs-card-actions">
				{actions.map((action) => 'to' in action ? (
					<Link key={action.key} to={action.to} className={`gs-card-action ${action.primary ? 'primary' : ''}`}>
						<action.icon size={13} strokeWidth={1.5} />
						{action.label}
					</Link>
				) : (
					<button key={action.key} type="button" className={`gs-card-action ${action.primary ? 'primary' : ''}`} onClick={action.onClick}>
						<action.icon size={13} strokeWidth={1.5} />
						{action.label}
					</button>
				))}
			</div>
		</article>
	);
}
