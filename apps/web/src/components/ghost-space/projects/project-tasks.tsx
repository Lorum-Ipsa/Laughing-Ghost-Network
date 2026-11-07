import { useEffect, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { pocketbaseClient as pb } from '@/lib/pocketbase-client';
import type { ProjectTask, ProjectTaskStatus, Work } from '@/lib/network';

const STATUSES: { value: ProjectTaskStatus; label: string }[] = [
	{ value: 'open', label: 'Open' },
	{ value: 'in_progress', label: 'In Progress' },
	{ value: 'complete', label: 'Complete' },
];

/**
 * The Tasks tab of a project workspace. Maintainers create, assign, edit, and
 * delete tasks; an assigned Ghost may move their task between states. Tasks are
 * intentionally simple: title, description, assignee, skill, optional due date,
 * optional related artifact, and an Open / In Progress / Complete status.
 */
export function ProjectTasks({ work, isMaintainer }: { work: Work; isMaintainer: boolean }) {
	const { user } = useAuth();
	const [tasks, setTasks] = useState<ProjectTask[]>([]);
	const [loading, setLoading] = useState(true);
	const [creating, setCreating] = useState(false);
	const [error, setError] = useState('');

	useEffect(() => {
		let active = true;
		setLoading(true);
		pb.collection('ghost_project_tasks')
			.getFullList<ProjectTask>({
				filter: pb.filter('work = {:id}', { id: work.id }),
				expand: 'assigned_to',
				sort: '-created',
				requestKey: null,
			})
			.then((rows) => { if (active) setTasks(rows); })
			.catch(() => { if (active) setError('Could not load tasks.'); })
			.finally(() => { if (active) setLoading(false); });
		return () => { active = false; };
	}, [work]);

	async function setStatus(task: ProjectTask, status: ProjectTaskStatus) {
		try {
			const rec = await pb.collection('ghost_project_tasks').update<ProjectTask>(task.id, { status });
			setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, ...rec } : t)));
		} catch {
			setError('Could not update the task.');
		}
	}

	async function remove(id: string) {
		try {
			await pb.collection('ghost_project_tasks').delete(id);
			setTasks((prev) => prev.filter((t) => t.id !== id));
		} catch {
			setError('Could not delete the task.');
		}
	}

	function onCreated(task: ProjectTask) {
		setTasks((prev) => [task, ...prev]);
		setCreating(false);
	}

	const grouped = STATUSES.map((s) => ({ ...s, items: tasks.filter((t) => (t.status || 'open') === s.value) }));

	return (
		<div className="gs-detail-section">
			{error && <div className="status-message error-message" role="alert">{error}</div>}
			{isMaintainer && !creating && (
				<button type="button" className="button button-outline gs-add-btn" onClick={() => setCreating(true)}>
					<Plus size={14} strokeWidth={1.5} /> Add task
				</button>
			)}
			{creating && (
				<TaskForm work={work} onDone={onCreated} onCancel={() => setCreating(false)} />
			)}
			{loading ? (
				<p className="muted-note">Loading tasks…</p>
			) : tasks.length === 0 && !creating ? (
				<p className="muted-note">No tasks yet. {isMaintainer && 'Add a task to coordinate work and assign it to a contributor.'}</p>
			) : (
				<div className="gs-task-columns">
					{grouped.map((col) => (
						<div key={col.value} className="gs-task-column">
							<h3 className="gs-task-column-head">{col.label} <span className="gs-tab-count">{col.items.length}</span></h3>
							{col.items.length === 0 ? (
								<p className="gs-task-empty">—</p>
							) : col.items.map((task) => {
								const assignee = task.expand?.assigned_to;
								const canEdit = isMaintainer || task.assigned_to === user?.id;
								return (
									<article key={task.id} className="gs-task">
										<h4 className="gs-task-title">{task.title}</h4>
										{task.description && <p className="gs-task-desc">{task.description}</p>}
										<div className="gs-task-meta">
											{assignee && <span>Assigned: {assignee.name || 'Ghost'}</span>}
											{task.skill && <span>Skill: {task.skill}</span>}
											{task.due_date && <span>Due: {task.due_date.slice(0, 10)}</span>}
										</div>
										{canEdit && (
											<div className="gs-task-actions">
												<select value={task.status || 'open'} onChange={(e) => setStatus(task, e.target.value as ProjectTaskStatus)} aria-label="Task status">
													{STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
												</select>
												{isMaintainer && <button type="button" className="gs-icon-btn" aria-label="Delete task" onClick={() => remove(task.id)}><Trash2 size={13} strokeWidth={1.5} /></button>}
											</div>
										)}
									</article>
								);
							})}
						</div>
					))}
				</div>
			)}
		</div>
	);
}

function TaskForm({ work, onDone, onCancel }: { work: Work; onDone: (t: ProjectTask) => void; onCancel: () => void }) {
	const { user } = useAuth();
	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
	const [skill, setSkill] = useState('');
	const [due, setDue] = useState('');
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');

	async function save() {
		if (!user || !title.trim()) return;
		setBusy(true);
		setError('');
		try {
			const rec = await pb.collection('ghost_project_tasks').create<ProjectTask>({
				owner: user.id,
				work: work.id,
				title: title.trim(),
				description,
				skill,
				due_date: due || '',
				status: 'open',
			});
			onDone(rec);
		} catch {
			setError('The task was not saved.');
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className="gs-inline-form">
			<div className="field"><label htmlFor="task-title">Title *</label><input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="Validate Sigma rule against synthetic telemetry" /></div>
			<div className="field"><label htmlFor="task-desc">Description</label><textarea id="task-desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={5000} style={{ minHeight: 70 }} /></div>
			<div className="field-row">
				<div className="field"><label htmlFor="task-skill">Skill needed</label><input id="task-skill" value={skill} onChange={(e) => setSkill(e.target.value)} maxLength={200} placeholder="Sigma, Windows" /></div>
				<div className="field"><label htmlFor="task-due">Due date</label><input id="task-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} /></div>
			</div>
			{error && <div className="status-message error-message" role="alert">{error}</div>}
			<div className="gs-editor-actions">
				<button type="button" className="button button-light" disabled={busy || !title.trim()} onClick={save}>{busy ? 'Saving…' : 'Add task'}</button>
				<button type="button" className="button button-outline" onClick={onCancel}><X size={13} strokeWidth={1.5} /> Cancel</button>
			</div>
		</div>
	);
}
