import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { pocketbaseClient as pb } from '@/lib/pocketbase-client';
import type { ProjectUpdate, Work } from '@/lib/network';

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
 * The Updates tab — a maintainer's progress log. Maintainers post titled
 * updates; contributors and watchers read them. Updates are chronological,
 * with no engagement metrics.
 */
export function ProjectUpdates({ work, isMaintainer }: { work: Work; isMaintainer: boolean }) {
	const [updates, setUpdates] = useState<ProjectUpdate[]>([]);
	const [loading, setLoading] = useState(true);
	const [creating, setCreating] = useState(false);
	const [error, setError] = useState('');

	useEffect(() => {
		let active = true;
		setLoading(true);
		pb.collection('ghost_project_updates')
			.getFullList<ProjectUpdate>({
				filter: pb.filter('work = {:id}', { id: work.id }),
				sort: '-created',
				requestKey: null,
			})
			.then((rows) => { if (active) setUpdates(rows); })
			.catch(() => { if (active) setError('Could not load updates.'); })
			.finally(() => { if (active) setLoading(false); });
		return () => { active = false; };
	}, [work]);

	function onCreated(update: ProjectUpdate) {
		setUpdates((prev) => [update, ...prev]);
		setCreating(false);
	}

	return (
		<div className="gs-detail-section">
			{error && <div className="status-message error-message" role="alert">{error}</div>}
			{isMaintainer && !creating && (
				<button type="button" className="button button-outline gs-add-btn" onClick={() => setCreating(true)}>
					<Plus size={14} strokeWidth={1.5} /> Post update
				</button>
			)}
			{creating && <UpdateForm work={work} onDone={onCreated} onCancel={() => setCreating(false)} />}
			{loading ? (
				<p className="muted-note">Loading updates…</p>
			) : updates.length === 0 && !creating ? (
				<p className="muted-note">No updates yet. {isMaintainer && 'Post an update to keep contributors and watchers informed.'}</p>
			) : (
				<ul className="gs-update-list">
					{updates.map((u) => (
						<li key={u.id} className="gs-update">
							<div className="gs-update-head">
								<h3 className="gs-update-title">{u.title}</h3>
								<span className="gs-update-date">{relativeTime(u.created)}</span>
							</div>
							<p className="gs-update-body">{u.body}</p>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

function UpdateForm({ work, onDone, onCancel }: { work: Work; onDone: (u: ProjectUpdate) => void; onCancel: () => void }) {
	const { user } = useAuth();
	const [title, setTitle] = useState('');
	const [body, setBody] = useState('');
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');

	async function save() {
		if (!user || !title.trim() || !body.trim()) return;
		setBusy(true);
		setError('');
		try {
			const rec = await pb.collection('ghost_project_updates').create<ProjectUpdate>({
				owner: user.id, work: work.id, title: title.trim(), body: body.trim(),
			});
			onDone(rec);
		} catch {
			setError('The update was not saved.');
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className="gs-inline-form">
			<div className="field"><label htmlFor="update-title">Title *</label><input id="update-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="Dataset v0.3 published" /></div>
			<div className="field"><label htmlFor="update-body">Update *</label><textarea id="update-body" value={body} onChange={(e) => setBody(e.target.value)} maxLength={10000} style={{ minHeight: 100 }} placeholder="What changed, what is next, what you need from contributors." /></div>
			{error && <div className="status-message error-message" role="alert">{error}</div>}
			<div className="gs-editor-actions">
				<button type="button" className="button button-light" disabled={busy || !title.trim() || !body.trim()} onClick={save}>{busy ? 'Saving…' : 'Post update'}</button>
				<button type="button" className="button button-outline" onClick={onCancel}><X size={13} strokeWidth={1.5} /> Cancel</button>
			</div>
		</div>
	);
}
