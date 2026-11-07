import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, ExternalLink, Settings, ListChecks, Flag, Users, FileText, GitBranch, Radio, BookOpen } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { pocketbaseClient as pb } from '@/lib/pocketbase-client';
import { kindLabels, paragraphs, safeExternal, tagsOf, type GhostProfile, type Participation, type Work, type WorkRevision } from '@/lib/network';
import { PROJECT_STATUSES, projectStatusLabel } from '@/data/projects';
import { contentLanguageLabel } from '@/lib/languages';
import { ProjectTasks } from '@/components/ghost-space/projects/project-tasks';
import { ProjectGhosts } from '@/components/ghost-space/projects/project-ghosts';
import { ProjectUpdates } from '@/components/ghost-space/projects/project-updates';

type SubTab = 'overview' | 'tasks' | 'milestones' | 'ghosts' | 'contributions' | 'related' | 'updates' | 'settings';

const SUB_TABS: { key: SubTab; label: string; icon: typeof Settings }[] = [
	{ key: 'overview', label: 'Overview', icon: BookOpen },
	{ key: 'tasks', label: 'Tasks', icon: ListChecks },
	{ key: 'milestones', label: 'Milestones', icon: Flag },
	{ key: 'ghosts', label: 'Ghosts', icon: Users },
	{ key: 'contributions', label: 'Contributions', icon: FileText },
	{ key: 'related', label: 'Related Work', icon: GitBranch },
	{ key: 'updates', label: 'Updates', icon: Radio },
	{ key: 'settings', label: 'Settings', icon: Settings },
];

/**
 * The project workspace — opened from a project card. A maintainer manages
 * tasks, milestones, contributors, open roles, updates, and settings; a
 * contributor or watcher sees the same surface with the management actions
 * hidden. Publication and lifecycle status stay separate; no popularity
 * metrics appear.
 */
export function ProjectDetail({
	work,
	profile,
	membership,
	onBack,
	onRefresh,
	onEdit,
}: {
	work: Work;
	profile: GhostProfile | null;
	membership: Participation | null;
	onBack: () => void;
	onRefresh: () => void;
	onEdit: (w: Work) => void;
}) {
	const { user } = useAuth();
	const [sub, setSub] = useState<SubTab>('overview');
	const [revisions, setRevisions] = useState<WorkRevision[]>([]);
	const [related, setRelated] = useState<Work[]>([]);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');

	const isMaintainer = work.owner === user?.id;
	const status = projectStatusLabel(work.project_status);

	useEffect(() => {
		let active = true;
		// Revision history (owner-visible).
		pb.collection('ghost_revisions')
			.getFullList<WorkRevision>({
				filter: pb.filter('work = {:id}', { id: work.id }),
				sort: '-created',
				requestKey: null,
			})
			.then((rows) => { if (active) setRevisions(rows); })
			.catch(() => { if (active) setRevisions([]); });
		// Related published work sharing domain or tags.
		pb.collection('ghost_work')
			.getFullList<Work>({
				filter: pb.filter('id != {:id} && status = "published"', { id: work.id }),
				expand: 'author',
				sort: '-created',
				requestKey: null,
			})
			.then((rows) => {
				if (!active) return;
				const tags = new Set(tagsOf(work.tags).map((t) => t.toLowerCase()));
				setRelated(rows.filter((item) => {
					if (work.domain && item.domain && item.domain === work.domain) return true;
					if (tags.size && tagsOf(item.tags).some((t) => tags.has(t.toLowerCase()))) return true;
					return false;
				}).slice(0, 8));
			})
			.catch(() => { if (active) setRelated([]); });
		return () => { active = false; };
	}, [work]);

	async function changeStatus(target: string) {
		setBusy(true);
		setError('');
		try {
			await pb.collection('ghost_work').update(work.id, { project_status: target });
			onRefresh();
		} catch {
			setError('Could not update the project status.');
		} finally {
			setBusy(false);
		}
	}

	async function archiveProject() {
		setBusy(true);
		setError('');
		try {
			await pb.collection('ghost_work').update(work.id, { status: 'archived' });
			onRefresh();
			onBack();
		} catch {
			setError('Could not archive the project.');
		} finally {
			setBusy(false);
		}
	}

	const milestones = tagsOf(work.milestones).filter(Boolean);
	const langLabel = contentLanguageLabel(work.language);

	return (
		<div className="gs-project-detail">
			<header className="gs-detail-head">
				<button type="button" className="gs-back" onClick={onBack}>
					<ArrowLeft size={15} strokeWidth={1.5} /> Projects
				</button>
				<div className="gs-detail-title-row">
					<div>
						<div className="gs-card-head">
							<span className="gs-card-type">{kindLabels[work.kind] || work.kind}</span>
							<span className={`gs-status gs-status-${work.project_status || 'proposed'}`}>{status}</span>
							{work.status === 'published'
								? <Link to={`/work/${work.id}`} className="gs-status gs-status-published"><ExternalLink size={11} /> Public page</Link>
								: <span className="gs-status gs-status-draft">{work.status === 'archived' ? 'Archived' : 'Private'}</span>}
						</div>
						<h1 className="gs-detail-title">{work.title}</h1>
						<div className="gs-card-meta">
							{work.domain && <span>{work.domain}</span>}
							{langLabel && <span>{langLabel}</span>}
							{work.repository && safeExternal(work.repository) && <a href={safeExternal(work.repository) ?? undefined} target="_blank" rel="noreferrer">Repository ↗</a>}
						</div>
					</div>
				</div>
			</header>

			{error && <div className="status-message error-message" role="alert">{error}</div>}

			<nav className="gs-subtabs" role="tablist" aria-label="Project workspace">
				{SUB_TABS.map((t) => (
					<button
						key={t.key}
						type="button"
						role="tab"
						aria-selected={sub === t.key}
						className={`gs-subtab ${sub === t.key ? 'active' : ''}`}
						onClick={() => setSub(t.key)}
					>
						<t.icon size={13} strokeWidth={1.5} />
						{t.label}
					</button>
				))}
			</nav>

			{sub === 'overview' && (
				<div className="gs-detail-section">
					{work.summary && <p className="gs-detail-summary">{work.summary}</p>}
					<dl className="project-meta gs-overview-meta">
						<div className="project-meta-row"><dt>Specialty / domain</dt><dd>{work.domain || '—'}</dd></div>
						<div className="project-meta-row"><dt>Technologies</dt><dd>{tagsOf(work.technologies).join(' · ') || '—'}</dd></div>
						<div className="project-meta-row"><dt>Open roles</dt><dd>{tagsOf(work.roles_needed).join(' · ') || '—'}</dd></div>
						<div className="project-meta-row"><dt>Looking for contributors</dt><dd>{work.accepting_contributors ? 'Yes' : 'No'}</dd></div>
						{work.version && <div className="project-meta-row"><dt>Version</dt><dd>{work.version}</dd></div>}
						{work.license && <div className="project-meta-row"><dt>License</dt><dd>{work.license}</dd></div>}
					</dl>
					{work.goals && <DetailBlock label="Goals" body={work.goals} />}
					{work.scope && <DetailBlock label="Scope" body={work.scope} />}
					{work.deliverables && <DetailBlock label="Deliverables" body={work.deliverables} />}
					{work.body && <DetailBlock label="Method and documentation" body={work.body} />}
				</div>
			)}

			{sub === 'tasks' && (
				<ProjectTasks work={work} isMaintainer={isMaintainer} />
			)}

			{sub === 'milestones' && (
				<div className="gs-detail-section">
					{milestones.length > 0 ? (
						<ol className="milestone-list">
							{milestones.map((m, i) => (
								<li key={i}><span className="milestone-index">{String(i + 1).padStart(2, '0')}</span>{m}</li>
							))}
						</ol>
					) : (
						<p className="muted-note">No milestones defined yet. {isMaintainer && 'Add milestones in the project editor (Settings → Edit project).'} </p>
					)}
				</div>
			)}

			{sub === 'ghosts' && (
				<ProjectGhosts work={work} profile={profile} membership={membership} onRefresh={onRefresh} />
			)}

			{sub === 'contributions' && (
				<div className="gs-detail-section">
					<p className="muted-note" style={{ marginBottom: 18 }}>Revision history — every saved change to this project's content, snapshotted automatically.</p>
					{revisions.length === 0 ? (
						<p className="muted-note">No revisions recorded yet.</p>
					) : (
						<ul className="gs-revision-list">
							{revisions.map((r) => (
								<li key={r.id}>
									<span className="gs-revision-version">v{r.version || '—'}</span>
									<span className="gs-revision-title">{r.title || work.title}</span>
									{r.reason && <span className="gs-revision-reason">{r.reason}</span>}
								</li>
							))}
						</ul>
					)}
				</div>
			)}

			{sub === 'related' && (
				<div className="gs-detail-section">
					{related.length === 0 ? (
						<p className="muted-note">No related work yet. Related research, Arsenal artifacts, and Table Talks surface here when they share this project's domain or tags.</p>
					) : (
						<ul className="gs-related-list">
							{related.map((item) => (
								<li key={item.id}>
									<Link to={`/work/${item.id}`}>
										<strong>{kindLabels[item.kind]}</strong>
										<span>{item.title}</span>
									</Link>
								</li>
							))}
						</ul>
					)}
				</div>
			)}

			{sub === 'updates' && (
				<ProjectUpdates work={work} isMaintainer={isMaintainer} />
			)}

			{sub === 'settings' && (
				<div className="gs-detail-section">
					{isMaintainer ? (
						<>
							<div className="gs-settings-row">
								<div>
									<h3 className="gs-settings-title">Project status</h3>
									<p className="muted-note">Lifecycle state, independent of publication. Visible on the public Projects page.</p>
								</div>
								<select value={work.project_status || 'proposed'} disabled={busy} onChange={(e) => changeStatus(e.target.value)} aria-label="Project status">
									{PROJECT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
								</select>
							</div>
							<div className="gs-settings-row">
								<div>
									<h3 className="gs-settings-title">Edit project</h3>
									<p className="muted-note">Change the title, summary, roles, technologies, goals, scope, deliverables, and milestones.</p>
								</div>
								<button type="button" className="button button-outline" onClick={() => onEdit(work)}>Edit project</button>
							</div>
							<div className="gs-settings-row">
								<div>
									<h3 className="gs-settings-title">Archive project</h3>
									<p className="muted-note">Hide from the public network. The project stays in your workspace and can be restored.</p>
								</div>
								<button type="button" className="button button-outline" disabled={busy} onClick={archiveProject}>Archive</button>
							</div>
						</>
					) : (
						<ProjectMembershipSettings work={work} membership={membership} onRefresh={onRefresh} />
					)}
				</div>
			)}
		</div>
	);
}

function DetailBlock({ label, body }: { label: string; body: string }) {
	return (
		<section className="gs-detail-block">
			<h2>{label}</h2>
			{paragraphs(body).map((p, i) => <p key={i}>{p}</p>)}
		</section>
	);
}

function ProjectMembershipSettings({ work, membership, onRefresh }: { work: Work; membership: Participation | null; onRefresh: () => void }) {
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');

	async function leave() {
		if (!membership) return;
		setBusy(true);
		setError('');
		try {
			await pb.collection('ghost_participations').delete(membership.id);
			onRefresh();
		} catch {
			setError('Could not update your membership.');
		} finally {
			setBusy(false);
		}
	}

	async function toggleWatch() {
		setBusy(true);
		setError('');
		try {
			if (membership) {
				await pb.collection('ghost_participations').update(membership.id, { relation: membership.relation === 'watcher' ? 'contributor' : 'watcher' });
			}
			onRefresh();
		} catch {
			setError('Could not update your membership.');
		} finally {
			setBusy(false);
		}
	}

	return (
		<>
			<div className="gs-settings-row">
				<div>
					<h3 className="gs-settings-title">{membership?.relation === 'watcher' ? 'You are watching this project' : 'Your membership'}</h3>
					<p className="muted-note">{membership?.relation === 'watcher' ? 'You follow updates without being a contributor. Switch to contributing to rejoin the roster.' : 'You are a contributor. Leave to remove yourself from the project roster.'}</p>
				</div>
				{membership && <button type="button" className="button button-outline" disabled={busy} onClick={toggleWatch}>{membership.relation === 'watcher' ? 'Switch to contributor' : 'Watch instead'}</button>}
			</div>
			{membership && (
				<div className="gs-settings-row">
					<div>
						<h3 className="gs-settings-title">Leave project</h3>
						<p className="muted-note">Remove your membership. You can request to join again later.</p>
					</div>
					<button type="button" className="button button-outline" disabled={busy} onClick={leave}>Leave project</button>
				</div>
			)}
			{error && <div className="status-message error-message" role="alert">{error}</div>}
		</>
	);
}
