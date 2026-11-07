import { useEffect, useMemo, useState } from 'react';
import { Bell, CheckCheck, Archive, BellOff } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { pocketbaseClient as pb } from '@/lib/pocketbase-client';
import { NOTIFICATION_TABS, type NotificationTab } from '@/data/notifications';
import { NotificationItem, type NotificationRecord } from '@/components/ghost-space/notifications/notification-item';
import { NotificationPreferences } from '@/components/ghost-space/notifications/notification-preferences';

/**
 * The Notifications workspace — a low-noise inbox for actions that require
 * attention or matter to a Ghost's work. Tabs filter by category plus Unread
 * and Archived; each item can be marked read/unread and archived. Security and
 * moderation notices stay visible until acknowledged.
 *
 * No engagement notifications exist here: no profile views, likes, followers,
 * popularity, or streaks. Only contribution reviews, project invitations, Table
 * Talk assignments, collaboration requests, mentions, moderation, and
 * account/security notices.
 */
export function NotificationsWorkspace() {
	const { user } = useAuth();
	const [items, setItems] = useState<NotificationRecord[]>([]);
	const [tab, setTab] = useState<NotificationTab>('all');
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [busy, setBusy] = useState(false);
	const [showPrefs, setShowPrefs] = useState(false);

	useEffect(() => {
		if (!user) return;
		const active = true;
		setLoading(true);
		pb.collection('ghost_notifications')
			.getFullList<NotificationRecord>({ sort: '-created', requestKey: null })
			.then((rows) => { if (active) { setItems(rows); setError(''); } })
			.catch(() => { if (active) setError('Could not load notifications. Try again in a moment.'); })
			.finally(() => { if (active) setLoading(false); });

		// Live updates: new notices appear without a manual refresh.
		void pb
			.collection('ghost_notifications')
			.subscribe('*', (e) => {
				setItems((prev) => {
					const rec = e.record as unknown as NotificationRecord;
					if (e.action === 'create') return [rec, ...prev];
					if (e.action === 'update') return prev.map((n) => (n.id === rec.id ? rec : n));
					if (e.action === 'delete') return prev.filter((n) => n.id !== e.record.id);
					return prev;
				});
			})
			.catch(() => { /* realtime optional */ });

		return () => { void pb.collection('ghost_notifications').unsubscribe('*').catch(() => {}); };
	}, [user]);

	const counts = useMemo(() => {
		const map: Record<NotificationTab, number> = {
			all: items.length, unread: 0, contributions: 0, reviews: 0, projects: 0,
			table_talks: 0, collaboration: 0, mentions: 0, moderation: 0, security: 0, archived: 0,
		};
		for (const n of items) {
			if (!n.read) map.unread += 1;
			if (n.archived) { map.archived += 1; continue; }
			if (n.category in map) map[n.category as NotificationTab] += 1;
		}
		return map;
	}, [items]);

	const visible = useMemo(() => {
		if (tab === 'all') return items.filter((n) => !n.archived);
		if (tab === 'unread') return items.filter((n) => !n.read && !n.archived);
		if (tab === 'archived') return items.filter((n) => n.archived);
		return items.filter((n) => !n.archived && n.category === tab);
	}, [items, tab]);

	async function patch(id: string, data: Partial<NotificationRecord>) {
		setBusy(true);
		try {
			await pb.collection('ghost_notifications').update(id, data);
			setItems((prev) => prev.map((n) => (n.id === id ? { ...n, ...data } : n)));
		} catch {
			setError('Could not update that notification.');
		} finally {
			setBusy(false);
		}
	}

	async function markAllRead() {
		setBusy(true);
		const unread = visible.filter((n) => !n.read);
		if (!unread.length) { setBusy(false); return; }
		try {
			await Promise.all(unread.map((n, i) => pb.collection('ghost_notifications').update(n.id, { read: true }, { requestKey: `read-${n.id}-${i}` })));
			setItems((prev) => prev.map((n) => (unread.some((u) => u.id === n.id) ? { ...n, read: true } : n)));
		} catch {
			setError('Could not mark all as read.');
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className="gs-notifications">
			<header className="gs-section-head">
				<div>
					<span className="eyebrow"><span className="tiny-dot" /> GHOST SPACE / NOTIFICATIONS</span>
					<h1>Notifications</h1>
					<p className="gs-section-lede">Low-noise notices for actions that require attention or matter to your work — contribution reviews, project invitations, Table Talk assignments, collaboration requests, mentions, moderation, and security. No profile views, likes, or streaks.</p>
				</div>
				<div className="gs-notif-head-actions">
					<button type="button" className="button button-outline" onClick={() => setShowPrefs((v) => !v)}>
						<Bell size={14} strokeWidth={1.5} /> Preferences
					</button>
					<button type="button" className="button button-light" onClick={markAllRead} disabled={busy || counts.unread === 0}>
						<CheckCheck size={14} strokeWidth={1.5} /> Mark all read
					</button>
				</div>
			</header>

			{error && <div className="status-message error-message" role="alert">{error}</div>}

			{showPrefs && user && (
				<NotificationPreferences ownerId={user.id} />
			)}

			<nav className="gs-tabs" role="tablist" aria-label="Notification categories">
				{NOTIFICATION_TABS.map((t) => (
					<button
						key={t.key}
						type="button"
						role="tab"
						aria-selected={tab === t.key}
						className={`gs-tab ${tab === t.key ? 'active' : ''}`}
						onClick={() => setTab(t.key)}
					>
						{t.label}
						{counts[t.key] > 0 && <span className="gs-tab-count">{counts[t.key]}</span>}
					</button>
				))}
			</nav>

			{loading ? (
				<div className="loading-state" style={{ padding: '40px 0' }}>Loading notifications…</div>
			) : visible.length === 0 ? (
				<div className="gs-empty-state">
					{tab === 'archived' ? <Archive size={28} strokeWidth={1} /> : tab === 'unread' ? <BellOff size={28} strokeWidth={1} /> : <Bell size={28} strokeWidth={1} />}
					<p>{emptyMessage(tab)}</p>
				</div>
			) : (
				<ul className="gs-notif-list">
					{visible.map((n) => (
						<li key={n.id}>
							<NotificationItem
								notification={n}
								onToggleRead={() => patch(n.id, { read: !n.read })}
								onArchive={() => patch(n.id, { archived: true })}
								onUnarchive={() => patch(n.id, { archived: false })}
							/>
						</li>
					))}
				</ul>
			)}

			<p className="sample-note">Security and moderation notices remain visible until you acknowledge them. Archived notices are kept for your records but hidden from the active list. No engagement notifications — profile views, likes, follower activity, popularity, or streaks — are ever generated.</p>
		</div>
	);
}

function emptyMessage(tab: NotificationTab): string {
	switch (tab) {
		case 'unread': return 'You are all caught up. No unread notifications right now.';
		case 'archived': return 'No archived notifications. Archive a notice once you have dealt with it to keep your inbox focused.';
		case 'contributions': return 'No contribution notices. Reviewer feedback and publication outcomes will appear here.';
		case 'reviews': return 'No review notices yet. When a reviewer assesses your work, it lands here.';
		case 'projects': return 'No project notices. Invitations, task assignments, and participation requests appear here.';
		case 'table_talks': return 'No Table Talk notices. Role assignments and scheduling land here.';
		case 'collaboration': return 'No collaboration requests right now. Incoming requests will appear here.';
		case 'mentions': return 'No mentions yet.';
		case 'moderation': return 'No moderation notices. Good standing.';
		case 'security': return 'No security notices. If a new session signs in or your account changes, it appears here.';
		default: return 'No notifications yet. As you contribute, collaborate, and participate, notices that matter to your work will appear here.';
	}
}
