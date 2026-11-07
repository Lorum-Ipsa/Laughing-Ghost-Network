import { useEffect, useState } from 'react';
import { Plus, Trash2, Check, X, UserPlus, Eye, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { pocketbaseClient as pb } from '@/lib/pocketbase-client';
import type { GhostProfile, Participation, ProjectRole, Work } from '@/lib/network';

const COMMITMENT_LABELS: Record<string, string> = {
	flexible: 'Flexible', part_time: 'Part-time', full_time: 'Full-time', ad_hoc: 'Ad-hoc',
};

/**
 * The Ghosts tab — the human layer of a project. Maintainers see contributors,
 * pending requests, and invitations; they can accept or remove contributors,
 * define open roles, and invite Ghosts. Other members see the roster and open
 * roles and can request to join or watch. No popularity metrics — only named
 * roles and accepted participation.
 */
export function ProjectGhosts({ work, profile, membership, onRefresh }: { work: Work; profile: GhostProfile | null; membership: Participation | null; onRefresh: () => void }) {
	const { user } = useAuth();
	const isMaintainer = work.owner === user?.id;
	const [participations, setParticipations] = useState<Participation[]>([]);
	const [roles, setRoles] = useState<ProjectRole[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [creatingRole, setCreatingRole] = useState(false);

	useEffect(() => {
		let active = true;
		setLoading(true);
		Promise.all([
			pb.collection('ghost_participations').getFullList<Participation>({
				filter: pb.filter('work = {:id}', { id: work.id }),
				sort: 'created',
				requestKey: null,
			}),
			pb.collection('ghost_project_roles').getFullList<ProjectRole>({
				filter: pb.filter('work = {:id}', { id: work.id }),
				sort: 'created',
				requestKey: null,
			}),
		])
			.then(([parts, roleRows]) => { if (active) { setParticipations(parts); setRoles(roleRows); } })
			.catch(() => { if (active) setError('Could not load the project roster.'); })
			.finally(() => { if (active) setLoading(false); });
		return () => { active = false; };
	}, [work]);

	const contributors = participations.filter((p) => (p.relation || 'contributor') === 'contributor');
	const requests = participations.filter((p) => p.relation === 'request');
	const invitations = participations.filter((p) => p.relation === 'invited');

	async function accept(p: Participation) {
		setError('');
		try {
			await pb.collection('ghost_participations').update(p.id, { relation: 'contributor' });
			setParticipations((prev) => prev.map((x) => (x.id === p.id ? { ...x, relation: 'contributor' } : x)));
		} catch {
			setError('Could not accept the request.');
		}
	}

	async function decline(p: Participation) {
		setError('');
		try {
			await pb.collection('ghost_participations').delete(p.id);
			setParticipations((prev) => prev.filter((x) => x.id !== p.id));
		} catch {
			setError('Could not decline the request.');
		}
	}

	async function removeContributor(p: Participation) {
		setError('');
		try {
			await pb.collection('ghost_participations').delete(p.id);
			setParticipations((prev) => prev.filter((x) => x.id !== p.id));
			onRefresh();
		} catch {
			setError('Could not remove the contributor.');
		}
	}

	async function requestJoin(role?: ProjectRole) {
		if (!user || !profile) return;
		setError('');
		try {
			await pb.collection('ghost_participations').create({
				owner: user.id,
				work: work.id,
				message: role ? `Request to join as ${role.title}` : 'Request to join the project',
				relation: 'request',
				role: role?.title || '',
			});
			onRefresh();
		} catch {
			setError('Could not send your request. You may have already requested to join.');
		}
	}

	async function watch() {
		if (!user) return;
		setError('');
		try {
			if (membership) {
				await pb.collection('ghost_participations').update(membership.id, { relation: 'watcher' });
			} else {
				await pb.collection('ghost_participations').create({ owner: user.id, work: work.id, message: '', relation: 'watcher', role: '' });
			}
			onRefresh();
		} catch {
			setError('Could not watch the project.');
		}
	}

	async function deleteRole(id: string) {
		try {
			await pb.collection('ghost_project_roles').delete(id);
			setRoles((prev) => prev.filter((r) => r.id !== id));
		} catch {
			setError('Could not remove the role.');
		}
	}

	function onRoleCreated(role: ProjectRole) {
		setRoles((prev) => [...prev, role]);
		setCreatingRole(false);
	}

	if (loading) return <p className="muted-note">Loading roster…</p>;

	return (
		<div className="gs-detail-section">
			{error && <div className="status-message error-message" role="alert">{error}</div>}

			{!isMaintainer && (
				<div className="gs-join-bar">
					{membership?.relation === 'request'
						? <span className="muted-note">Your request to join is pending.</span>
						: membership?.relation === 'watcher'
							? <span className="muted-note">You are watching this project.</span>
							: membership?.relation === 'contributor'
								? <span className="muted-note">You are a contributor on this project.</span>
								: <span className="muted-note">Interested in this project?</span>}
					<div className="gs-join-actions">
						{!membership && <button type="button" className="button button-light" onClick={() => requestJoin()}><UserPlus size={14} strokeWidth={1.5} /> Request to join</button>}
						{membership?.relation !== 'watcher' && membership?.relation !== 'request' && <button type="button" className="button button-outline" onClick={watch}><Eye size={14} strokeWidth={1.5} /> Watch</button>}
					</div>
				</div>
			)}

			<section className="gs-roster-section">
				<h2 className="gs-roster-title">Contributors <span className="gs-tab-count">{contributors.length}</span></h2>
				{contributors.length === 0 ? (
					<p className="muted-note">No contributors yet.</p>
				) : (
					<ul className="gs-roster-list">
						{contributors.map((p) => (
							<li key={p.id}>
								<span className="gs-roster-name">{p.role || 'Contributor'}</span>
								{isMaintainer && p.owner !== user?.id && (
									<button type="button" className="gs-icon-btn" aria-label="Remove contributor" onClick={() => removeContributor(p)}><LogOut size={13} strokeWidth={1.5} /></button>
								)}
							</li>
						))}
					</ul>
				)}
			</section>

			{isMaintainer && requests.length > 0 && (
				<section className="gs-roster-section">
					<h2 className="gs-roster-title">Join requests <span className="gs-tab-count">{requests.length}</span></h2>
					<ul className="gs-roster-list">
						{requests.map((p) => (
							<li key={p.id}>
								<span className="gs-roster-name">{p.role || 'Join request'}{p.message ? ` — ${p.message}` : ''}</span>
								<span className="gs-roster-actions">
									<button type="button" className="gs-icon-btn gs-accept" aria-label="Accept" onClick={() => accept(p)}><Check size={13} strokeWidth={1.5} /></button>
									<button type="button" className="gs-icon-btn" aria-label="Decline" onClick={() => decline(p)}><X size={13} strokeWidth={1.5} /></button>
								</span>
							</li>
						))}
					</ul>
				</section>
			)}

			{isMaintainer && invitations.length > 0 && (
				<section className="gs-roster-section">
					<h2 className="gs-roster-title">Invitations <span className="gs-tab-count">{invitations.length}</span></h2>
					<ul className="gs-roster-list">
						{invitations.map((p) => (
							<li key={p.id}><span className="gs-roster-name">{p.role || 'Invited'}</span></li>
						))}
					</ul>
				</section>
			)}

			<section className="gs-roster-section">
				<div className="gs-roster-head">
					<h2 className="gs-roster-title">Open roles <span className="gs-tab-count">{roles.length}</span></h2>
					{isMaintainer && !creatingRole && <button type="button" className="button button-outline gs-add-btn" onClick={() => setCreatingRole(true)}><Plus size={14} strokeWidth={1.5} /> Add role</button>}
				</div>
				{creatingRole && <RoleForm work={work} onDone={onRoleCreated} onCancel={() => setCreatingRole(false)} />}
				{roles.length === 0 && !creatingRole ? (
					<p className="muted-note">No open roles defined. {isMaintainer ? 'Define a role so Ghosts can request to join it.' : ''}</p>
				) : (
					<ul className="gs-role-list">
						{roles.map((role) => (
							<li key={role.id} className="gs-role">
								<div className="gs-role-head">
									<h3 className="gs-role-title">{role.title}</h3>
									{isMaintainer
										? <button type="button" className="gs-icon-btn" aria-label="Remove role" onClick={() => deleteRole(role.id)}><Trash2 size={13} strokeWidth={1.5} /></button>
										: <button type="button" className="button button-outline gs-role-join" onClick={() => requestJoin(role)}><UserPlus size={12} strokeWidth={1.5} /> Request to join</button>}
								</div>
								{role.skills && <p className="gs-role-skills">Skills: {role.skills}</p>}
								<div className="gs-role-meta">
									{role.commitment && <span>{COMMITMENT_LABELS[role.commitment] || role.commitment}</span>}
									{role.location && <span>{role.location}</span>}
								</div>
								{role.description && <p className="gs-role-desc">{role.description}</p>}
							</li>
						))}
					</ul>
				)}
			</section>
		</div>
	);
}

function RoleForm({ work, onDone, onCancel }: { work: Work; onDone: (r: ProjectRole) => void; onCancel: () => void }) {
	const { user } = useAuth();
	const [title, setTitle] = useState('');
	const [skills, setSkills] = useState('');
	const [commitment, setCommitment] = useState('flexible');
	const [location, setLocation] = useState('Remote');
	const [description, setDescription] = useState('');
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');

	async function save() {
		if (!user || !title.trim()) return;
		setBusy(true);
		setError('');
		try {
			const rec = await pb.collection('ghost_project_roles').create<ProjectRole>({
				owner: user.id, work: work.id, title: title.trim(), skills, commitment, location, description,
			});
			onDone(rec);
		} catch {
			setError('The role was not saved.');
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className="gs-inline-form">
			<div className="field"><label htmlFor="role-title">Role title *</label><input id="role-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder="Detection Engineer" /></div>
			<div className="field"><label htmlFor="role-skills">Skills</label><input id="role-skills" value={skills} onChange={(e) => setSkills(e.target.value)} maxLength={300} placeholder="Sigma · Windows · Python" /></div>
			<div className="field-row">
				<div className="field"><label htmlFor="role-commitment">Commitment</label>
					<select id="role-commitment" value={commitment} onChange={(e) => setCommitment(e.target.value)}>
						<option value="flexible">Flexible</option>
						<option value="part_time">Part-time</option>
						<option value="full_time">Full-time</option>
						<option value="ad_hoc">Ad-hoc</option>
					</select>
				</div>
				<div className="field"><label htmlFor="role-location">Location</label><input id="role-location" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={100} placeholder="Remote" /></div>
			</div>
			<div className="field"><label htmlFor="role-desc">Description</label><textarea id="role-desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} style={{ minHeight: 70 }} placeholder="Help validate detection coverage." /></div>
			{error && <div className="status-message error-message" role="alert">{error}</div>}
			<div className="gs-editor-actions">
				<button type="button" className="button button-light" disabled={busy || !title.trim()} onClick={save}>{busy ? 'Saving…' : 'Add role'}</button>
				<button type="button" className="button button-outline" onClick={onCancel}><X size={13} strokeWidth={1.5} /> Cancel</button>
			</div>
		</div>
	);
}
