// Notifications workspace taxonomy — categories, type labels, and the
// category each notification type belongs to. Categories drive the workspace
// tabs and server-side filtering; types drive the per-item label and icon.
//
// No engagement notifications (profile views, likes, followers, popularity,
// streaks) exist anywhere in this taxonomy. Security and moderation notices
// are always surfaced and cannot be fully suppressed.

export type NotificationCategory =
	| 'contributions'
	| 'reviews'
	| 'projects'
	| 'table_talks'
	| 'collaboration'
	| 'mentions'
	| 'moderation'
	| 'security'
	| 'system';

export type NotificationType =
	| 'welcome'
	| 'system_notice'
	| 'work_published'
	| 'followed_work_published'
	| 'work_rejected'
	| 'work_revision_requested'
	| 'work_archived'
	| 'review_received'
	| 'review_feedback'
	| 'project_invitation'
	| 'project_task_assigned'
	| 'project_update'
	| 'participation_received'
	| 'table_talk_role_assigned'
	| 'table_talk_scheduled'
	| 'table_talk_decision'
	| 'collaboration_request_received'
	| 'collaboration_request_updated'
	| 'mention'
	| 'moderation_notice'
	| 'report_received'
	| 'security_notice'
	| 'application_accepted'
	| 'application_declined';

export const CATEGORY_LABELS: Record<NotificationCategory, string> = {
	contributions: 'Contributions',
	reviews: 'Reviews',
	projects: 'Projects',
	table_talks: 'Table Talks',
	collaboration: 'Collaboration',
	mentions: 'Mentions',
	moderation: 'Moderation',
	security: 'Security',
	system: 'System',
};

export const TYPE_CATEGORY: Record<NotificationType, NotificationCategory> = {
	welcome: 'system',
	system_notice: 'system',
	work_published: 'contributions',
	followed_work_published: 'contributions',
	work_rejected: 'contributions',
	work_revision_requested: 'contributions',
	work_archived: 'contributions',
	review_received: 'reviews',
	review_feedback: 'reviews',
	project_invitation: 'projects',
	project_task_assigned: 'projects',
	project_update: 'projects',
	participation_received: 'projects',
	table_talk_role_assigned: 'table_talks',
	table_talk_scheduled: 'table_talks',
	table_talk_decision: 'table_talks',
	collaboration_request_received: 'collaboration',
	collaboration_request_updated: 'collaboration',
	mention: 'mentions',
	moderation_notice: 'moderation',
	report_received: 'moderation',
	security_notice: 'security',
	application_accepted: 'security',
	application_declined: 'security',
};

export const TYPE_LABELS: Record<NotificationType, string> = {
	welcome: 'Welcome',
	system_notice: 'System Notice',
	work_published: 'Contribution Published',
	followed_work_published: 'New Work From a Followed Ghost',
	work_rejected: 'Contribution Not Published',
	work_revision_requested: 'Revision Requested',
	work_archived: 'Contribution Archived',
	review_received: 'Contribution Review',
	review_feedback: 'Reviewer Feedback',
	project_invitation: 'Project Invitation',
	project_task_assigned: 'Task Assigned',
	project_update: 'Project Update',
	participation_received: 'Participation Request',
	table_talk_role_assigned: 'Table Talk Role',
	table_talk_scheduled: 'Table Talk Scheduled',
	table_talk_decision: 'Table Talk Decision',
	collaboration_request_received: 'Collaboration Request',
	collaboration_request_updated: 'Collaboration Update',
	mention: 'Mention',
	moderation_notice: 'Moderation Notice',
	report_received: 'Report Filed',
	security_notice: 'Security Notice',
	application_accepted: 'Application Accepted',
	application_declined: 'Application Declined',
};

// Categories that are security- or moderation-critical: they remain visible
// until acknowledged and their email channel cannot be fully suppressed.
export const CRITICAL_CATEGORIES: NotificationCategory[] = ['security', 'moderation'];

export type NotificationTab =
	| 'all'
	| 'unread'
	| 'contributions'
	| 'reviews'
	| 'projects'
	| 'table_talks'
	| 'collaboration'
	| 'mentions'
	| 'moderation'
	| 'security'
	| 'archived';

export const NOTIFICATION_TABS: { key: NotificationTab; label: string }[] = [
	{ key: 'all', label: 'All' },
	{ key: 'unread', label: 'Unread' },
	{ key: 'contributions', label: 'Contributions' },
	{ key: 'reviews', label: 'Reviews' },
	{ key: 'projects', label: 'Projects' },
	{ key: 'table_talks', label: 'Table Talks' },
	{ key: 'collaboration', label: 'Collaboration' },
	{ key: 'mentions', label: 'Mentions' },
	{ key: 'moderation', label: 'Moderation' },
	{ key: 'security', label: 'Security' },
	{ key: 'archived', label: 'Archived' },
];

// Email-channel preference definitions. `locked` flags the ones that are
// always on (security-critical) and cannot be turned off — shown disabled
// in the UI for transparency.
export type PreferenceKey =
	| 'email_contribution_reviews'
	| 'email_project_invitations'
	| 'email_table_talks'
	| 'email_collaboration_requests'
	| 'email_security_events'
	| 'email_moderation_notices';

export const EMAIL_PREFERENCES: { key: PreferenceKey; label: string; description: string; locked?: boolean }[] = [
	{ key: 'email_contribution_reviews', label: 'Contribution reviews', description: 'Reviewer feedback and review outcomes on your submissions.' },
	{ key: 'email_project_invitations', label: 'Project invitations', description: 'When a Ghost invites you to join a project or assigns you a task.' },
	{ key: 'email_table_talks', label: 'Table Talks', description: 'Role assignments, scheduling, and decisions for exercises you are in.' },
	{ key: 'email_collaboration_requests', label: 'Collaboration requests', description: 'When another Ghost sends you a structured collaboration request.' },
	{ key: 'email_moderation_notices', label: 'Moderation notices', description: 'Moderation actions and clarifications required on your work.' },
	{ key: 'email_security_events', label: 'Security events', description: 'New sessions and account-security changes. Always on — cannot be suppressed.', locked: true },
];

export const DEFAULT_PREFERENCES: Record<PreferenceKey, boolean> = {
	email_contribution_reviews: true,
	email_project_invitations: true,
	email_table_talks: true,
	email_collaboration_requests: true,
	email_security_events: true,
	email_moderation_notices: true,
};
