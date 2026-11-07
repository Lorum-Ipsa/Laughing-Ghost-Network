import { useEffect, useRef, useState } from 'react';
import { X, Save, Send, Archive, Undo2, RefreshCw, Eye, Upload, Trash2, Paperclip } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { pocketbaseClient as pb } from '@/lib/pocketbase-client';
import { kindLabels, type GhostProfile, type Work, type WorkKind, type WorkStatus } from '@/lib/network';
import { CONTENT_LANGUAGES } from '@/lib/languages';
import { VALIDATION_STATUSES, FORMAT_OPTIONS, LICENSE_OPTIONS } from '@/data/arsenal';
import { PROJECT_STATUSES } from '@/data/projects';
import { EXERCISE_TYPES, SCENARIO_TYPES, DIFFICULTIES, DURATIONS, FORMAT_MODES, DELIVERY_MODES, EXERCISE_STATUSES, EXERCISE_ROLES } from '@/data/table-talks';
import { TOOL_OPTIONS, PLATFORM_OPTIONS, INDUSTRY_OPTIONS } from '@/data/taxonomy';
import { useI18n } from '@/lib/i18n';

type Attachment = { id: string; name: string; kind: string; file: string };

type SaveTarget = { status: WorkStatus; label: string; icon: typeof Save; primary?: boolean };

function targetsFor(existing: Work | null): SaveTarget[] {
	if (!existing) {
		return [
			{ status: 'draft', label: 'Save draft', icon: Save },
			{ status: 'submitted', label: 'Submit for review', icon: Send, primary: true },
		];
	}
	const s = existing.status;
	if (s === 'draft') return [
		{ status: 'draft', label: 'Save changes', icon: Save },
		{ status: 'submitted', label: 'Submit for review', icon: Send, primary: true },
		{ status: 'archived', label: 'Archive', icon: Archive },
	];
	if (s === 'submitted') return [
		{ status: 'submitted', label: 'Save changes', icon: Save },
		{ status: 'draft', label: 'Withdraw to draft', icon: Undo2 },
	];
	if (s === 'revision_requested') return [
		{ status: 'draft', label: 'Save as draft', icon: Save },
		{ status: 'submitted', label: 'Resubmit', icon: RefreshCw, primary: true },
	];
	if (s === 'rejected') return [
		{ status: 'draft', label: 'Save as draft', icon: Save },
		{ status: 'submitted', label: 'Resubmit', icon: RefreshCw, primary: true },
		{ status: 'archived', label: 'Archive', icon: Archive },
	];
	if (s === 'published') return [
		{ status: 'published', label: 'Save revision', icon: Save, primary: true },
	];
	if (s === 'archived') return [
		{ status: 'draft', label: 'Restore to draft', icon: Undo2, primary: true },
	];
	return [{ status: s, label: 'Save changes', icon: Save }];
}

/**
 * The contribution editor. Handles both creation and revision of a member's
 * work, with the full Draft → Review → Revision → Published → Future revisions
 * workflow. The author chooses a type, writes in their original language, and
 * saves to any state they are allowed to move the work into; publication stays
 * a moderator action. Every content save is snapshotted into version history by
 * the revision hook, and the original language is always preserved.
 */
export function ContributionEditor({
	profile,
	existing,
	defaultKind = 'research',
	onDone,
}: {
	profile: GhostProfile | null;
	existing: Work | null;
	defaultKind?: WorkKind;
	onDone: (saved: boolean) => void;
}) {
	const { user } = useAuth();
	const { lang } = useI18n();
	const [kindValue, setKindValue] = useState<WorkKind>(existing?.kind || defaultKind);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');
	const [attachments, setAttachments] = useState<Attachment[]>([]);
	const [uploading, setUploading] = useState(false);
	const formRef = useRef<HTMLFormElement>(null);

	const isProject = kindValue === 'project';
	const isExercise = kindValue === 'exercise';

	useEffect(() => {
		if (!existing) return;
		let active = true;
		pb.collection('ghost_attachments')
			.getFullList<Attachment>({ filter: pb.filter('work = {:id}', { id: existing.id }), requestKey: null })
			.then((rows) => { if (active) setAttachments(rows); })
			.catch(() => { /* attachments optional */ });
		return () => { active = false; };
	}, [existing]);

	async function save(target: WorkStatus) {
		if (!user || !profile || !formRef.current) return;
		const data = new FormData(formRef.current);
		const kind = String(data.get('kind') || 'research') as WorkKind;
		const project = kind === 'project';
		const exercise = kind === 'exercise';
		setBusy(true);
		setError('');
		const payload: Record<string, unknown> = {
			owner: user.id,
			author: profile.id,
			title: data.get('title'),
			kind,
			language: data.get('language') || lang,
			domain: data.get('domain') || '',
			summary: data.get('summary'),
			body: data.get('body'),
			tags: data.get('tags'),
			source: data.get('source') || '',
			code: data.get('code'),
			status: target,
			example: false,
			...(existing ? {} : { review_status: 'unreviewed' }),
			validation_status: data.get('validation_status') || 'draft',
			version: data.get('version') || '',
			license: data.get('license') || '',
			platform: data.get('platform') || '',
			format: data.get('format') || '',
			tool: data.get('tool') || '',
			project_status: project ? (data.get('project_status') || 'proposed') : '',
			roles_needed: (project || exercise) ? (data.get('roles_needed') || '') : '',
			technologies: project ? (data.get('technologies') || '') : '',
			repository: project ? (data.get('repository') || '') : '',
			goals: project ? (data.get('goals') || '') : '',
			scope: project ? (data.get('scope') || '') : '',
			deliverables: project ? (data.get('deliverables') || '') : '',
			milestones: project ? (data.get('milestones') || '') : '',
			accepting_contributors: project ? data.get('accepting_contributors') === 'on' : false,
			exercise_type: exercise ? (data.get('exercise_type') || '') : '',
			scenario_type: exercise ? (data.get('scenario_type') || '') : '',
			difficulty: exercise ? (data.get('difficulty') || '') : '',
			duration: exercise ? (data.get('duration') || '') : '',
			format_mode: exercise ? (data.get('format_mode') || '') : '',
			delivery: exercise ? (data.get('delivery') || '') : '',
			exercise_status: exercise ? (data.get('exercise_status') || 'open') : '',
			industry: exercise ? (data.get('industry') || '') : '',
			objectives: exercise ? (data.get('objectives') || '') : '',
			initial_conditions: exercise ? (data.get('initial_conditions') || '') : '',
			timeline: exercise ? (data.get('timeline') || '') : '',
			injects: exercise ? (data.get('injects') || '') : '',
			evidence: exercise ? (data.get('evidence') || '') : '',
			decision_points: exercise ? (data.get('decision_points') || '') : '',
			facilitator_notes: exercise ? (data.get('facilitator_notes') || '') : '',
			debrief: exercise ? (data.get('debrief') || '') : '',
			lessons_learned: exercise ? (data.get('lessons_learned') || '') : '',
		};
		try {
			if (existing) {
				await pb.collection('ghost_work').update(existing.id, payload);
			} else {
				await pb.collection('ghost_work').create(payload);
			}
			onDone(true);
		} catch {
			setError('The contribution was not saved. Check the fields and the source link, then try again.');
		} finally {
			setBusy(false);
		}
	}

	async function uploadAttachment(file: File | null) {
		if (!file || !existing) return;
		setUploading(true);
		setError('');
		try {
			const fd = new FormData();
			fd.append('owner', user!.id);
			fd.append('work', existing.id);
			fd.append('file', file);
			fd.append('name', file.name);
			const rec = await pb.collection('ghost_attachments').create(fd);
			setAttachments((prev) => [...prev, { id: rec.id, name: file.name, kind: rec.kind || '', file: rec.file || '' }]);
		} catch {
			setError('The attachment could not be uploaded.');
		} finally {
			setUploading(false);
		}
	}

	async function removeAttachment(id: string) {
		try {
			await pb.collection('ghost_attachments').delete(id);
			setAttachments((prev) => prev.filter((a) => a.id !== id));
		} catch {
			setError('The attachment could not be removed.');
		}
	}

	const targets = targetsFor(existing);
	const title = existing ? 'Edit contribution' : 'Create contribution';

	return (
		<div className="gs-overlay" role="dialog" aria-modal="true" aria-label={title}>
			<form ref={formRef} className="gs-overlay-panel gs-editor" onSubmit={(e) => e.preventDefault()}>
				<header className="gs-overlay-head">
					<div>
						<span className="eyebrow"><span className="tiny-dot" /> {existing ? 'EDIT' : 'NEW'} CONTRIBUTION</span>
						<h2>{title}</h2>
					</div>
					<button type="button" className="gs-overlay-close" onClick={() => onDone(false)} aria-label="Close editor">
						<X size={18} strokeWidth={1.5} />
					</button>
				</header>

				{!profile && <div className="status-message error-message">A pseudonymous profile is required to attribute your work.</div>}
				{error && <div className="status-message error-message" role="alert">{error}</div>}

				<div className="field">
					<label htmlFor="ce-kind">Contribution type *</label>
					<select id="ce-kind" name="kind" required value={kindValue} onChange={(e) => setKindValue(e.target.value as WorkKind)} disabled={Boolean(existing)}>
						{(Object.entries(kindLabels) as [WorkKind, string][]).map(([k, label]) => (
							<option key={k} value={k}>{label}</option>
						))}
					</select>
					{existing && <small>The type cannot be changed after creation. Edit the content below to create a new revision.</small>}
				</div>

				<div className="field">
					<label htmlFor="ce-language">Original language *</label>
					<select id="ce-language" name="language" defaultValue={existing?.language || lang}>
						{CONTENT_LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.native}{l.code !== 'other' ? ` (${l.code.toUpperCase()})` : ''}</option>)}
					</select>
					<small>The author's original language is authoritative and always preserved. Translation is a reader's choice.</small>
				</div>

				<div className="field">
					<label htmlFor="ce-title">Title *</label>
					<input id="ce-title" name="title" required minLength={10} maxLength={180} defaultValue={existing?.title || ''} placeholder="A precise title, no overpromising" />
				</div>

				<div className="field">
					<label htmlFor="ce-summary">Summary *</label>
					<textarea id="ce-summary" name="summary" required minLength={40} maxLength={500} defaultValue={existing?.summary || ''} placeholder="The problem studied, the method, and the deliverable." style={{ minHeight: 85 }} />
				</div>

				<div className="field">
					<label htmlFor="ce-domain">Specialty / domain</label>
					<input id="ce-domain" name="domain" maxLength={250} defaultValue={existing?.domain || ''} placeholder="Cloud IAM Analysis, Threat Hunting, Firmware…" />
					<small>The cybersecurity area this work covers, separate from tags.</small>
				</div>

				<div className="field">
					<label htmlFor="ce-body">Method and documentation *</label>
					<textarea id="ce-body" name="body" required minLength={100} maxLength={50000} defaultValue={existing?.body || ''} placeholder={'RESEARCH QUESTION\nThe specific question this work addresses…\n\nSCOPE\nWhat is and isn’t covered…\n\nMETHOD / PROTOCOL\nThe reproducible steps…\n\nEVIDENCE / DATA\nLogs, datasets, queries, diagrams, telemetry…\n\nFINDINGS\nWhat the evidence shows…\n\nDELIVERABLES\nThe artifacts produced…\n\nLIMITATIONS\nWhat this work does not demonstrate…\n\nREFERENCES\nSources, prior work, standards…'} style={{ minHeight: 280 }} />
					<small>Plain text. Separate sections with a blank line. No HTML is executed.</small>
				</div>

				<div className="field">
					<label htmlFor="ce-code">Code or detection rule</label>
					<textarea id="ce-code" name="code" maxLength={50000} defaultValue={existing?.code || ''} placeholder="Artifact to view and download…" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, minHeight: 140 }} />
				</div>

				{isProject && (
					<div className="project-fields">
						<h3 className="form-subheading">Project collaboration details</h3>
						<div className="field"><label htmlFor="ce-project-status">Project status</label>
							<select id="ce-project-status" name="project_status" defaultValue={existing?.project_status || 'proposed'}>{PROJECT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select>
						</div>
						<div className="field"><label htmlFor="ce-roles">Roles needed</label><input id="ce-roles" name="roles_needed" maxLength={500} defaultValue={existing?.roles_needed || ''} placeholder="Detection Engineer, Windows Researcher, Python Developer…" /></div>
						<div className="field"><label htmlFor="ce-technologies">Technologies</label><input id="ce-technologies" name="technologies" maxLength={500} defaultValue={existing?.technologies || ''} placeholder="Sigma, Sysmon, Windows, Lab…" /></div>
						<div className="field"><label htmlFor="ce-repository">Repository / external link</label><input id="ce-repository" name="repository" type="url" defaultValue={existing?.repository || ''} placeholder="https://…" /></div>
						<div className="field"><label htmlFor="ce-goals">Goals</label><textarea id="ce-goals" name="goals" maxLength={5000} defaultValue={existing?.goals || ''} style={{ minHeight: 70 }} /></div>
						<div className="field"><label htmlFor="ce-scope">Scope</label><textarea id="ce-scope" name="scope" maxLength={5000} defaultValue={existing?.scope || ''} style={{ minHeight: 70 }} /></div>
						<div className="field"><label htmlFor="ce-deliverables">Deliverables</label><textarea id="ce-deliverables" name="deliverables" maxLength={5000} defaultValue={existing?.deliverables || ''} style={{ minHeight: 70 }} /></div>
						<div className="field"><label htmlFor="ce-milestones">Milestones</label><textarea id="ce-milestones" name="milestones" maxLength={5000} defaultValue={existing?.milestones || ''} style={{ minHeight: 70 }} /><small>One per line.</small></div>
						<label className="checkbox-field"><input type="checkbox" name="accepting_contributors" defaultChecked={existing?.accepting_contributors ?? true} /><span>This project is looking for contributors.</span></label>
					</div>
				)}

				{isExercise && (
					<div className="project-fields">
						<h3 className="form-subheading">Exercise details</h3>
						<div className="field-row">
							<div className="field"><label htmlFor="ce-exercise-type">Exercise type</label><select id="ce-exercise-type" name="exercise_type" defaultValue={existing?.exercise_type || 'tabletop_exercise'}>{EXERCISE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
							<div className="field"><label htmlFor="ce-scenario-type">Scenario type</label><select id="ce-scenario-type" name="scenario_type" defaultValue={existing?.scenario_type || ''}>{SCENARIO_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
							<div className="field"><label htmlFor="ce-difficulty">Difficulty</label><select id="ce-difficulty" name="difficulty" defaultValue={existing?.difficulty || ''}>{DIFFICULTIES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}</select></div>
						</div>
						<div className="field-row">
							<div className="field"><label htmlFor="ce-duration">Duration</label><select id="ce-duration" name="duration" defaultValue={existing?.duration || ''}>{DURATIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}</select></div>
							<div className="field"><label htmlFor="ce-format-mode">Format</label><select id="ce-format-mode" name="format_mode" defaultValue={existing?.format_mode || ''}>{FORMAT_MODES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}</select></div>
							<div className="field"><label htmlFor="ce-delivery">Delivery</label><select id="ce-delivery" name="delivery" defaultValue={existing?.delivery || ''}>{DELIVERY_MODES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}</select></div>
						</div>
						<div className="field-row">
							<div className="field"><label htmlFor="ce-exercise-status">Exercise status</label><select id="ce-exercise-status" name="exercise_status" defaultValue={existing?.exercise_status || 'open'}>{EXERCISE_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
							<div className="field"><label htmlFor="ce-roles-needed">Roles</label><input id="ce-roles-needed" name="roles_needed" maxLength={500} defaultValue={existing?.roles_needed || ''} placeholder="Analyst, Incident Lead, Facilitator…" list="ce-exercise-role-options" /><datalist id="ce-exercise-role-options">{EXERCISE_ROLES.map((r) => <option key={r} value={r} />)}</datalist></div>
							<div className="field"><label htmlFor="ce-industry">Industry</label><input id="ce-industry" name="industry" maxLength={300} defaultValue={existing?.industry || ''} placeholder="Cloud, Healthcare, Finance…" list="ce-industry-options" /><datalist id="ce-industry-options">{INDUSTRY_OPTIONS.map((i) => <option key={i} value={i} />)}</datalist></div>
						</div>
						<div className="field"><label htmlFor="ce-objectives">Learning objectives</label><textarea id="ce-objectives" name="objectives" maxLength={5000} defaultValue={existing?.objectives || ''} style={{ minHeight: 70 }} /></div>
						<div className="field"><label htmlFor="ce-initial-conditions">Initial conditions</label><textarea id="ce-initial-conditions" name="initial_conditions" maxLength={5000} defaultValue={existing?.initial_conditions || ''} style={{ minHeight: 70 }} /></div>
						<div className="field"><label htmlFor="ce-timeline">Timeline</label><textarea id="ce-timeline" name="timeline" maxLength={5000} defaultValue={existing?.timeline || ''} style={{ minHeight: 70 }} /><small>One event per line.</small></div>
						<div className="field"><label htmlFor="ce-injects">Injects</label><textarea id="ce-injects" name="injects" maxLength={5000} defaultValue={existing?.injects || ''} style={{ minHeight: 70 }} /><small>One inject per line.</small></div>
						<div className="field"><label htmlFor="ce-evidence">Evidence</label><textarea id="ce-evidence" name="evidence" maxLength={5000} defaultValue={existing?.evidence || ''} style={{ minHeight: 70 }} /></div>
						<div className="field"><label htmlFor="ce-decision-points">Decision points</label><textarea id="ce-decision-points" name="decision_points" maxLength={5000} defaultValue={existing?.decision_points || ''} style={{ minHeight: 70 }} /></div>
						<div className="field"><label htmlFor="ce-facilitator-notes">Facilitator notes</label><textarea id="ce-facilitator-notes" name="facilitator_notes" maxLength={5000} defaultValue={existing?.facilitator_notes || ''} style={{ minHeight: 70 }} /></div>
						<div className="field"><label htmlFor="ce-debrief">Debrief</label><textarea id="ce-debrief" name="debrief" maxLength={5000} defaultValue={existing?.debrief || ''} style={{ minHeight: 70 }} /></div>
						<div className="field"><label htmlFor="ce-lessons-learned">Lessons learned</label><textarea id="ce-lessons-learned" name="lessons_learned" maxLength={5000} defaultValue={existing?.lessons_learned || ''} style={{ minHeight: 70 }} /></div>
					</div>
				)}

				<div className="field"><label htmlFor="ce-platform">Platforms</label><input id="ce-platform" name="platform" maxLength={300} defaultValue={existing?.platform || ''} placeholder="Windows, Linux, AWS, Azure, Kubernetes…" list="ce-platform-options" /><datalist id="ce-platform-options">{PLATFORM_OPTIONS.map((p) => <option key={p} value={p} />)}</datalist></div>
				<div className="field"><label htmlFor="ce-format">Language / format</label><input id="ce-format" name="format" maxLength={200} defaultValue={existing?.format || ''} placeholder="Python, YAML, KQL, Sigma, YARA, JSON…" list="ce-format-options" /><datalist id="ce-format-options">{FORMAT_OPTIONS.map((f) => <option key={f} value={f} />)}</datalist></div>
				<div className="field"><label htmlFor="ce-tool">Tools / technologies</label><input id="ce-tool" name="tool" maxLength={300} defaultValue={existing?.tool || ''} placeholder="Splunk, Sentinel, Volatility, Burp Suite…" list="ce-tool-options" /><datalist id="ce-tool-options">{TOOL_OPTIONS.map((t) => <option key={t} value={t} />)}</datalist></div>

				<div className="field-row">
					<div className="field"><label htmlFor="ce-validation">Validation status</label><select id="ce-validation" name="validation_status" defaultValue={existing?.validation_status || 'draft'}>{VALIDATION_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
					<div className="field"><label htmlFor="ce-version">Version</label><input id="ce-version" name="version" maxLength={50} defaultValue={existing?.version || ''} placeholder="1.0.0" /></div>
					<div className="field"><label htmlFor="ce-license">License</label><input id="ce-license" name="license" maxLength={100} defaultValue={existing?.license || ''} placeholder="MIT, Apache-2.0…" list="ce-license-options" /><datalist id="ce-license-options">{LICENSE_OPTIONS.map((l) => <option key={l} value={l} />)}</datalist></div>
				</div>

				<div className="field"><label htmlFor="ce-tags">Tags / techniques</label><input id="ce-tags" name="tags" maxLength={250} defaultValue={existing?.tags || ''} placeholder="Sigma, Windows, T1003.001" /><small>Separate tags with commas. Tags connect your work to related contributions across the network.</small></div>
				<div className="field"><label htmlFor="ce-source">References / public source</label><input id="ce-source" name="source" type="url" defaultValue={existing?.source || ''} placeholder="https://…" /></div>

				{existing && (
					<div className="gs-attachments">
						<h3 className="form-subheading">Attachments</h3>
						<ul className="gs-attachment-list">
							{attachments.map((a) => (
								<li key={a.id}>
									<span className="gs-attachment-name"><Paperclip size={13} strokeWidth={1.5} /> {a.name || a.file}</span>
									<button type="button" className="gs-attachment-remove" onClick={() => removeAttachment(a.id)} aria-label={`Remove ${a.name}`}><Trash2 size={13} strokeWidth={1.5} /></button>
								</li>
							))}
							{attachments.length === 0 && <li className="gs-attachment-empty">No attachments yet.</li>}
						</ul>
						<label className="gs-upload">
							<Upload size={13} strokeWidth={1.5} />
							<span>{uploading ? 'Uploading…' : 'Add attachment'}</span>
							<input type="file" disabled={uploading} onChange={(e) => uploadAttachment(e.target.files?.[0] ?? null)} />
						</label>
					</div>
				)}

				<div className="gs-editor-visibility">
					<Eye size={13} strokeWidth={1.5} />
					<span>Visibility is governed by status: drafts and submissions stay private to you and reviewers; only published work is public. Publication is a moderator action.</span>
				</div>

				<div className="gs-editor-actions">
					{targets.map((target) => (
						<button key={target.status} type="button" className={`button ${target.primary ? 'button-light' : 'button-outline'}`} disabled={busy || !profile} onClick={() => save(target.status)}>
							<target.icon size={14} strokeWidth={1.5} />
							{busy ? 'Saving…' : target.label}
						</button>
					))}
					<button type="button" className="button button-outline" onClick={() => onDone(false)}>Cancel</button>
				</div>
			</form>
		</div>
	);
}
