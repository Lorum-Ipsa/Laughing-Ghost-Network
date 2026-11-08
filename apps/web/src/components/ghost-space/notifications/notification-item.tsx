import { Link } from 'react-router';
import {
	Bell,
	FileText,
	MessageSquare,
	FolderGit2,
	Radio,
	Users,
	AtSign,
	ShieldAlert,
	ShieldCheck,
	Info,
	Archive,
	ArchiveRestore,
	CheckCheck,
} from 'lucide-react';
import type { NotificationCategory, NotificationType } from '@/data/notifications';
import { TYPE_LABELS } from '@/data/notifications';

export interface NotificationRecord {
	id: string;
	type: NotificationType;
	category: NotificationCategory;
	title: string;
	body: string;
	link: string;
	read: boolean;
	archived: boolean;
	related_work: string;
	created: string;
	updated: string;
}

const CATEGORY_ICON: Record<NotificationCategory, typeof Bell> = {
	contributions: FileText,
	reviews: MessageSquare,
	projects: FolderGit2,
	table_talks: Radio,
	collaboration: Users,
	mentions: AtSign,
	moderation: ShieldAlert,
	security: ShieldCheck,
	system: Info,
};

function relativeTime(iso: string): string {
	const then = new Date(iso).getTime();
	if (Number.isNaN(then)) return '';
	const diff = Date.now() - then;
	const mins = Math.round(diff / 60000);
	if (mins < 60) return `${mins}m ago`;
	const hours = Math.round(mins / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.round(hours / 24);
	if (days < 30) return `${days}d ago`;
	return `${Math.round(days / 30)}mo ago`;
}

/**
 * A single notification row. Unread items get a left accent and bolder title;
 * security/moderation notices keep a distinct accent and stay visible until
 * acknowledged (marked read). Action button follows the notice's `link` when
 * present.
 */
export function NotificationItem({
	notification,
	onToggleRead,
	onArchive,
	onUnarchive,
}: {
	notification: NotificationRecord;
	onToggleRead: () => void;
	onArchive: () => void;
	onUnarchive: () => void;
}) {
	const n = notification;
	const Icon = CATEGORY_ICON[n.category] || Bell;
	const critical = n.category === 'security' || n.category === 'moderation';
	const actionLabel = actionLabelFor(n.type);

	return (
		<article className={`gs-notif ${n.read ? '' : 'unread'} ${critical ? 'critical' : ''}`}>
			<span className="gs-notif-icon" aria-hidden="true"><Icon size={16} strokeWidth={1.5} /></span>
			<div className="gs-notif-body">
				<div className="gs-notif-head">
					<span className="gs-notif-type">{TYPE_LABELS[n.type] || n.type}</span>
					{critical && !n.read && <span className="gs-notif-flag">Requires attention</span>}
					<time className="gs-notif-time" dateTime={n.created}>{relativeTime(n.created)}</time>
				</div>
				<p className="gs-notif-title">{n.title}</p>
				{n.body && <p className="gs-notif-text">{n.body}</p>}
				<div className="gs-notif-actions">
					{n.link && actionLabel && (
						<Link to={n.link} className="gs-card-action primary" onClick={() => { if (!n.read) onToggleRead(); }}>
							{actionLabel}
						</Link>
					)}
					<button type="button" className="gs-card-action" onClick={onToggleRead}>
						<CheckCheck size={13} strokeWidth={1.5} /> {n.read ? 'Mark unread' : 'Mark read'}
					</button>
					<button type="button" className="gs-card-action" onClick={n.archived ? onUnarchive : onArchive}>
						{n.archived ? <ArchiveRestore size={13} strokeWidth={1.5} /> : <Archive size={13} strokeWidth={1.5} />}
						{n.archived ? 'Unarchive' : 'Archive'}
					</button>
				</div>
			</div>
		</article>
	);
}

function actionLabelFor(type: NotificationType): string {
	switch (type) {
		case 'review_received':
		case 'review_feedback':
		case 'work_revision_requested':
			return 'View feedback';
		case 'work_published':
			return 'View public page';
		case 'work_rejected':
		case 'work_archived':
		case 'moderation_notice':
			return 'View notice';
		case 'project_invitation':
		case 'participation_received':
			return 'Review invitation';
		case 'project_task_assigned':
			return 'View task';
		case 'project_update':
			return 'View project';
		case 'table_talk_role_assigned':
		case 'table_talk_scheduled':
			return 'View briefing';
		case 'table_talk_decision':
			return 'View decisions';
		case 'collaboration_request_received':
		case 'collaboration_request_updated':
			return 'Review request';
		case 'mention':
			return 'View mention';
		case 'report_received':
			return 'View report';
		case 'security_notice':
			return 'Review sessions';
		case 'application_accepted':
			return 'Open Ghost Space';
		case 'application_declined':
			return 'View status';
		default:
			return '';
	}
}
