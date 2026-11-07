import { useEffect, useMemo, useState } from 'react';
import { Plus, FolderGit2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { pocketbaseClient as pb } from '@/lib/pocketbase-client';
import type { GhostProfile, Participation, Work } from '@/lib/network';
import { ContributionEditor } from '@/components/ghost-space/contributions/contribution-editor';
import { ProjectCard } from '@/components/ghost-space/projects/project-card';
import { ProjectDetail } from '@/components/ghost-space/projects/project-detail';

type Tab = 'maintaining' | 'contributing' | 'watching' | 'recruiting' | 'completed' | 'archived';

const TABS: { key: Tab; label: string }[] = [
	{ key: 'maintaining', label: 'Maintaining' },
	{ key: 'contributing', label: 'Contributing' },
	{ key: 'watching', label: 'Watching' },
	{ key: 'recruiting', label: 'Recruiting' },
	{ key: 'completed', label: 'Completed' },
	{ key: 'archived', label: 'Archived' },
];

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
	return `${Math.round(days / 30)}mo ago`;
}

/**
 * The Projects workspace — the collaboration layer of Ghost Space. A member
 * sees the projects they maintain, contribute to, or watch, plus focused views
 * for recruiting, completed, and archived work. "Start Project" opens the
 * contribution editor seeded as a project. Opening a project enters the
 * ProjectDetail workspace (tasks, milestones, Ghosts, updates, settings).
 *
 * No popularity rankings or social metrics appear anywhere — only lifecycle
 * status, roles, contributors, and the work itself.
 */
export function ProjectsWorkspace({
	profile,
	work,
	onRefresh,
}: {
	profile: GhostProfile | null;
	work: Work[];
	onRefresh: () => void;
}) {
	const { user } = useAuth();
	const [tab, setTab] = useState<Tab>('maintaining');
	const [editor, setEditor] = useState<{ mode: 'create' | 'edit'; work: Work | null } | null>(null);
	const [openProject, setOpenProject] = useState<Work | null>(null);
	const [participations, setParticipations] = useState<Participation[]>([]);
	const [contributorCounts, setContributorCounts] = useState<Record<string, number>>({});
	const [revision, setRevision] = useState(0);

	const myProjects = useMemo(
		() => work.filter((w) => w.kind === 'project' || w.kind === 'community'),
		[work],
	);

	// The signed-in member's own participations (expand the related work + author).
	useEffect(() => {
		if (!user) return;
		let active = true;
		pb.collection('ghost_participations')
			.getFullList<Participation>({
				filter: pb.filter('owner = {:id}', { id: user.id }),
				expand: 'work.author',
				requestKey: null,
			})
			.then((rows) => { if (active) setParticipations(rows); })
			.catch(() => { if (active) setParticipations([]); });
		return () => { active = false; };
	}, [user, revision]);

	// Contributor counts for every project the member can see (maintained + joined).
	useEffect(() => {
		const ids = new Set<string>();
		for (const w of myProjects) ids.add(w.id);
		for (const p of participations) if (p.work) ids.add(p.work);
		if (!ids.size) { setContributorCounts({}); return; }
		let active = true;
		const filter = [...ids].map((id) => `work = "${id}"`).join(' || ');
		pb.collection('ghost_participations')
			.getFullList<{ work: string; relation?: string }>({
				filter: filter || 'id = ""',
				requestKey: null,
			})
			.then((rows) => {
				if (!active) return;
				const counts: Record<string, number> = {};
				for (const r of rows) {
					if (r.relation === 'contributor' || (!r.relation)) counts[r.work] = (counts[r.work] || 0) + 1;
				}
				setContributorCounts(counts);
			})
			.catch(() => { if (active) setContributorCounts({}); });
		return () => { active = false; };
	}, [myProjects, participations]);

	const membershipByWork = useMemo(() => {
		const map = new Map<string, Participation>();
		for (const p of participations) map.set(p.work, p);
		return map;
	}, [participations]);

	const visible = useMemo(() => {
		const isMine = (w: Work) => w.owner === user?.id;
		if (tab === 'maintaining') {
			return myProjects.filter((w) => isMine(w) && w.project_status !== 'archived' && w.project_status !== 'complete' && w.status !== 'archived');
		}
		if (tab === 'recruiting') {
			return myProjects.filter((w) => isMine(w) && (w.accepting_contributors || w.project_status === 'recruiting') && w.status !== 'archived');
		}
		if (tab === 'completed') {
			return myProjects.filter((w) => isMine(w) && w.project_status === 'complete');
		}
		if (tab === 'archived') {
			return myProjects.filter((w) => isMine(w) && (w.project_status === 'archived' || w.status === 'archived'));
		}
		if (tab === 'contributing') {
			return participations
				.filter((p) => (p.relation || 'contributor') === 'contributor' && p.expand?.work && p.expand.work.owner !== user?.id)
				.map((p) => p.expand!.work!);
		}
		if (tab === 'watching') {
			return participations
				.filter((p) => p.relation === 'watcher' && p.expand?.work)
				.map((p) => p.expand!.work!);
		}
		return [];
	}, [tab, myProjects, participations, user]);

	const counts = useMemo(() => {
		const map: Record<Tab, number> = { maintaining: 0, contributing: 0, watching: 0, recruiting: 0, completed: 0, archived: 0 };
		const isMine = (w: Work) => w.owner === user?.id;
		map.maintaining = myProjects.filter((w) => isMine(w) && w.project_status !== 'archived' && w.project_status !== 'complete' && w.status !== 'archived').length;
		map.recruiting = myProjects.filter((w) => isMine(w) && (w.accepting_contributors || w.project_status === 'recruiting') && w.status !== 'archived').length;
		map.completed = myProjects.filter((w) => isMine(w) && w.project_status === 'complete').length;
		map.archived = myProjects.filter((w) => isMine(w) && (w.project_status === 'archived' || w.status === 'archived')).length;
		map.contributing = participations.filter((p) => (p.relation || 'contributor') === 'contributor' && p.expand?.work && p.expand.work.owner !== user?.id).length;
		map.watching = participations.filter((p) => p.relation === 'watcher' && p.expand?.work).length;
		return map;
	}, [myProjects, participations, user]);

	function refreshAll() {
		setRevision((r) => r + 1);
		onRefresh();
	}

	if (editor) {
		return (
			<ContributionEditor
				profile={profile}
				existing={editor.mode === 'edit' ? editor.work : null}
				defaultKind="project"
				onDone={(saved) => {
					setEditor(null);
					if (saved) refreshAll();
				}}
			/>
		);
	}

	if (openProject) {
		return (
			<ProjectDetail
				work={openProject}
				profile={profile}
				membership={membershipByWork.get(openProject.id) || null}
				onBack={() => setOpenProject(null)}
				onRefresh={refreshAll}
				onEdit={(w) => { setOpenProject(null); setEditor({ mode: 'edit', work: w }); }}
			/>
		);
	}

	return (
		<div className="gs-contributions">
			<header className="gs-section-head">
				<div>
					<span className="eyebrow"><span className="tiny-dot" /> GHOST SPACE / PROJECTS</span>
					<h1>Projects</h1>
					<p className="gs-section-lede">A real collaboration layer, not a showcase. Maintain projects, recruit Ghosts, assign tasks, and track milestones — without rankings or social metrics.</p>
				</div>
				<button type="button" className="button button-light gs-create-btn" onClick={() => setEditor({ mode: 'create', work: null })}>
					<Plus size={15} strokeWidth={1.5} /> Start Project
				</button>
			</header>

			<nav className="gs-tabs" role="tablist" aria-label="Project views">
				{TABS.map((t) => (
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

			{visible.length === 0 ? (
				<div className="gs-empty-state">
					<FolderGit2 size={28} strokeWidth={1} />
					<p>{emptyMessage(tab)}</p>
					{(tab === 'maintaining' || tab === 'recruiting') && (
						<button type="button" className="button button-outline" onClick={() => setEditor({ mode: 'create', work: null })}>
							<Plus size={14} strokeWidth={1.5} /> Start a project
						</button>
					)}
				</div>
			) : (
				<ul className="gs-card-list">
					{visible.map((item) => {
						const membership = membershipByWork.get(item.id) || null;
						const isMaintainer = item.owner === user?.id;
						const role = isMaintainer ? 'Maintainer' : membership?.relation === 'watcher' ? 'Watcher' : membership?.role || 'Contributor';
						return (
							<li key={item.id}>
								<ProjectCard
									work={item}
									role={role}
									contributors={contributorCounts[item.id] || 0}
									updated={relativeTime(item.updated || item.created)}
									onOpen={() => setOpenProject(item)}
								/>
							</li>
						);
					})}
				</ul>
			)}
			<p className="sample-note">Projects separate discovery from participation. Lifecycle status (Proposed → Recruiting → Active → Paused → Complete → Archived) is independent of publication. Contributor counts reflect accepted participation. No popularity rankings — only chronological order and lifecycle state.</p>
		</div>
	);
}

function emptyMessage(tab: Tab): string {
	switch (tab) {
		case 'maintaining': return 'You are not maintaining any active projects yet. Start a project to recruit Ghosts, assign tasks, and track milestones.';
		case 'contributing': return 'You are not contributing to any projects. Open a project on the Projects page and request to join a role.';
		case 'watching': return 'You are not watching any projects. Watch a project to follow its updates without joining.';
		case 'recruiting': return 'None of your projects are recruiting right now. Open a project and turn on “looking for contributors”.';
		case 'completed': return 'No completed projects yet. Projects you mark Complete appear here.';
		case 'archived': return 'No archived projects. Archived projects are kept but hidden from the public network.';
	}
}
