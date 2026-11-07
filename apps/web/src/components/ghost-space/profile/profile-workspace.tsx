import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Eye, ExternalLink, Save, X, Upload, Trash2, AlertCircle } from 'lucide-react';
import { pocketbaseClient as pb } from '@/lib/pocketbase-client';
import type { ClientResponseError } from 'pocketbase';
import type { GhostProfile, LocationDisclosure, Work } from '@/lib/network';
import {
	LOCATION_DISCLOSURES, normalizeDisclosure, tagsOf,
} from '@/lib/network';
import { CONTENT_LANGUAGES } from '@/lib/languages';
import { SPECIALTY_GROUPS } from '@/data/specialties';
import {
	SKILL_OPTIONS, TOOL_OPTIONS, PLATFORM_OPTIONS, INDUSTRY_OPTIONS, LANGUAGE_NAMES,
} from '@/data/taxonomy';
import { Profile } from '@/components/ghosts/profile';
import { GhostAvatar, TemplateGhost } from '@/components/ghost-avatar';
import {
	AVATAR_PRESETS, GHOST_EXPRESSIONS, GHOST_ACCENTS, GHOST_BACKGROUNDS,
	encodeTemplate, normalizeVisibility, resolveTemplate,
	type GhostAccent, type GhostBackground, type GhostExpression,
} from '@/lib/ghost-avatar';
import { TagInput } from '@/components/ghost-space/profile/tag-input';

type Mode = 'edit' | 'preview';

/**
 * Normalize a portfolio URL: trim, and prefix `https://` when the user entered
 * a bare domain (e.g. `github.com/name`). Empty stays empty so the optional
 * url field accepts a blank value. This keeps the common "I forgot the
 * https://" case from failing the whole submission.
 */
function normalizeUrl(value?: string): string {
	const v = (value || '').trim();
	if (!v) return '';
	if (/^https?:\/\//i.test(v)) return v;
	return `https://${v}`;
}

/**
 * The Ghost Space "My Profile" workspace — a complete, editable profile builder.
 *
 * The Ghost edits a local draft of their public `ghost_profiles` record across
 * Identity, Practice, Languages, Location, Availability, External identities,
 * Featured work, and Visibility sections. "Preview Public Profile" renders the
 * exact public `Profile` component against the unsaved draft, hiding all
 * private account data and honoring every visibility toggle. "Save Changes"
 * persists the draft; "Cancel" discards it. "View Public Profile" opens the live
 * public page exactly as an anonymous visitor sees it.
 *
 * The handle is persistent and read-only here; handle changes are moderated from
 * Settings. Email and civil identity are never part of this record.
 */
export function ProfileWorkspace({
	profile, work, onRefresh,
}: {
	profile: GhostProfile | null;
	work: Work[];
	onRefresh: () => void;
}) {
	const [draft, setDraft] = useState<GhostProfile | null>(profile);
	const [mode, setMode] = useState<Mode>('edit');
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');
	const [saved, setSaved] = useState(false);
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
	const [avatarFile, setAvatarFile] = useState<File | null>(null);
	const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string>('');
	const [avatarRemoved, setAvatarRemoved] = useState(false);

	// Re-seed the draft whenever the persisted profile changes (after a save or
	// a refresh from the parent dashboard).
	useEffect(() => {
		setDraft(profile);
		setMode('edit');
		setError('');
		setSaved(false);
		setFieldErrors({});
	}, [profile]);

	useEffect(() => { setAvatarRemoved(false); }, [profile]);

	// Manage the local object URL for a newly chosen avatar file.
	useEffect(() => {
		if (!avatarFile) { setAvatarPreviewUrl(''); return; }
		const url = URL.createObjectURL(avatarFile);
		setAvatarPreviewUrl(url);
		return () => URL.revokeObjectURL(url);
	}, [avatarFile]);

	const publishedWork = useMemo(() => work.filter((w) => w.status === 'published'), [work]);
	const publicProfilePath = profile ? `/ghosts/${encodeURIComponent(profile.handle)}` : '/ghosts';

	if (!profile) {
		return (
			<div className="gs-profile-workspace">
				<header className="gs-section-head">
					<div>
						<span className="eyebrow"><span className="tiny-dot" /> GHOST SPACE / MY PROFILE</span>
						<h1>My profile</h1>
						<p className="gs-section-lede">You don't have a pseudonymous profile yet. Create one to start building your public Ghost identity.</p>
					</div>
				</header>
				<div className="dashboard-panel">
					<Link to="/join" className="button button-light">Create my profile ↗</Link>
				</div>
			</div>
		);
	}

	if (!draft) return null;

	function set<K extends keyof GhostProfile>(key: K, value: GhostProfile[K]) {
		setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
	}

	function toggleInList(key: 'specialties' | 'developing_specialties', value: string) {
		setDraft((prev) => {
			if (!prev) return prev;
			const current = tagsOf(prev[key]);
			const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
			return { ...prev, [key]: next.join(', ') };
		});
	}

	function toggleFeatured(id: string) {
		setDraft((prev) => {
			if (!prev) return prev;
			const current = tagsOf(prev.featured_work || '');
			const next = current.includes(id) ? current.filter((v) => v !== id) : [...current, id];
			return { ...prev, featured_work: next.join(', ') };
		});
	}

	function cancel() {
		setDraft(profile);
		setAvatarFile(null);
		setAvatarRemoved(false);
		setError('');
		setSaved(false);
		setFieldErrors({});
		setMode('edit');
	}

	async function save() {
		if (!draft) return;
		setBusy(true); setError(''); setSaved(false); setFieldErrors({});
		try {
			await pb.collection('ghost_profiles').update<GhostProfile>(draft.id, {
				display_name: draft.display_name || '',
				pronouns: draft.pronouns || '',
				bio: draft.bio || '',
				specialties: draft.specialties || '',
				developing_specialties: draft.developing_specialties || '',
				skills: draft.skills || '',
				tools: draft.tools || '',
				platform: draft.platform || '',
				industry: draft.industry || '',
				languages: draft.languages || '',
				language: draft.language || 'en',
				location_disclosure: draft.location_disclosure || 'undisclosed',
				location_country: draft.location_disclosure === 'country' ? (draft.location_country || '') : '',
				available_for_work: draft.available_for_work || false,
				open_to_collaboration: draft.open_to_collaboration || false,
				open_to_research: draft.open_to_research || false,
				open_to_mentorship: draft.open_to_mentorship || false,
				open_to_speaking: draft.open_to_speaking || false,
				collaboration_interests: draft.collaboration_interests || '',
				external_links: draft.external_links || '',
				featured_work: draft.featured_work || '',
				portfolio: normalizeUrl(draft.portfolio),
				show_external_identities: draft.show_external_identities !== false,
				show_language_proficiency: draft.show_language_proficiency !== false,
				allow_recruiter_contact: draft.allow_recruiter_contact || false,
				avatar_template: draft.avatar_template || '',
				avatar_visibility: normalizeVisibility(draft.avatar_visibility),
			}, { requestKey: 'profile-save' });

			// Avatar is a file upload — send it as a separate FormData update so the
			// JSON payload above is not mixed with multipart. A distinct requestKey
			// prevents auto-cancellation between the two calls. A failure here must
			// not undo the successful profile save above — surface it as a softer
			// notice and keep the saved state.
			try {
				if (avatarFile) {
					const fd = new FormData();
					fd.append('avatar', avatarFile);
					await pb.collection('ghost_profiles').update(draft.id, fd, { requestKey: 'profile-avatar' });
				} else if (avatarRemoved) {
					// Clearing a file field: send null via JSON.
					await pb.collection('ghost_profiles').update(draft.id, { avatar: null }, { requestKey: 'profile-avatar' });
				}
			} catch (avatarErr) {
				setAvatarFile(null);
				setAvatarRemoved(false);
				setSaved(true);
				setMode('edit');
				onRefresh();
				const msg = (avatarErr as ClientResponseError)?.message || '';
				setError(`Your profile was saved, but the avatar image could not be uploaded. ${msg}`.trim());
				return;
			}

			setAvatarFile(null);
			setAvatarRemoved(false);
			setSaved(true);
			setMode('edit');
			onRefresh();
		} catch (err) {
			const e = err as ClientResponseError;
			const data = e?.response?.data;
			if (data && typeof data === 'object' && Object.keys(data).length) {
				const errors: Record<string, string> = {};
				for (const [field, detail] of Object.entries(data)) {
					errors[field] = (detail as { message?: string })?.message || String(detail);
				}
				setFieldErrors(errors);
				setError('Some fields could not be saved. Correct the highlighted fields and try again.');
			} else if (e?.status === 403) {
				setError('You do not have permission to save this profile. Sign out and back in, then try again.');
			} else {
				setError(e?.message || 'The profile could not be saved. Please try again.');
			}
		} finally { setBusy(false); }
	}

	const dirty = JSON.stringify(draft) !== JSON.stringify(profile) || Boolean(avatarFile) || avatarRemoved;
	const disclosure = normalizeDisclosure(draft.location_disclosure);
	const effectiveTemplate = resolveTemplate({ handle: draft.handle, avatar_template: draft.avatar_template });

	function setTemplate(dim: 'expression' | 'accent' | 'background', value: string) {
		set('avatar_template', encodeTemplate({ ...effectiveTemplate, [dim]: value }));
	}

	function fieldErr(name: string) {
		const msg = fieldErrors[name];
		if (!msg) return null;
		return <small className="field-error" role="alert">{msg}</small>;
	}

	return (
		<div className="gs-profile-workspace">
			<header className="gs-section-head">
				<div>
					<span className="eyebrow"><span className="tiny-dot" /> GHOST SPACE / MY PROFILE</span>
					<h1>My profile</h1>
					<p className="gs-section-lede">Your public Ghost identity. Edit your draft, preview exactly what the public sees, then save. Handle changes and account security live in Settings. Email and civil identity are never part of this profile.</p>
				</div>
				<div className="gs-profile-actions">
					<button type="button" className="gs-card-action" onClick={() => setMode(mode === 'edit' ? 'preview' : 'edit')}>
						<Eye size={14} strokeWidth={1.5} /> {mode === 'edit' ? 'Preview public profile' : 'Back to editor'}
					</button>
					<a className="gs-card-action" href={publicProfilePath} target="_blank" rel="noopener noreferrer">
						<ExternalLink size={14} strokeWidth={1.5} /> View public profile
					</a>
				</div>
			</header>

			{mode === 'preview' ? (
				<div className="gs-profile-preview">
					<div className="gs-profile-preview-banner">
						<AlertCircle size={14} strokeWidth={1.5} />
						<span>Preview — this is exactly how an anonymous visitor sees your profile with your current unsaved edits. Nothing is public until you save.</span>
					</div>
					<Profile profile={{ ...draft, avatar: avatarRemoved ? '' : draft.avatar }} work={publishedWork} avatarUrlOverride={avatarPreviewUrl || undefined} />
					<div className="gs-profile-preview-foot">
						<button type="button" className="button button-outline" onClick={() => setMode('edit')}><X size={14} strokeWidth={1.5} /> Back to editor</button>
						<button type="button" className="button button-light" onClick={save} disabled={busy || !dirty}>{busy ? 'Saving…' : 'Save changes'}</button>
					</div>
				</div>
			) : (
				<form className="gs-profile-builder" onSubmit={(e) => { e.preventDefault(); save(); }}>
					{/* Identity */}
					<section className="gs-builder-section">
						<h2 className="gs-builder-h2">Identity</h2>
						<div className="gs-builder-grid">
							<div className="field"><label htmlFor="pf-handle">Persistent handle</label><input id="pf-handle" readOnly value={draft.handle} /><small>Handle changes are exceptional and moderated in Settings.</small>{fieldErr('handle')}</div>
							<div className="field"><label htmlFor="pf-dname">Display name <span className="gs-optional">optional</span></label><input id="pf-dname" value={draft.display_name || ''} onChange={(e) => set('display_name', e.target.value)} maxLength={100} placeholder="A name shown alongside your handle" />{fieldErr('display_name')}</div>
							<div className="field"><label htmlFor="pf-pronouns">Pronouns <span className="gs-optional">optional</span></label><input id="pf-pronouns" value={draft.pronouns || ''} onChange={(e) => set('pronouns', e.target.value)} maxLength={40} placeholder="they/them, she/her…" />{fieldErr('pronouns')}</div>
							<div className="field gs-builder-span2"><label htmlFor="pf-bio">Public bio</label><textarea id="pf-bio" value={draft.bio || ''} onChange={(e) => set('bio', e.target.value)} maxLength={2000} placeholder="A short, honest description of who you are as a Ghost." />{fieldErr('bio')}</div>
						</div>
					</section>

					{/* Avatar — choose your Ghost */}
					<section className="gs-builder-section">
						<h2 className="gs-builder-h2">Avatar — choose your Ghost</h2>
						<div className="callout">Avatars are variations of the Laughing Ghost: expressions, accent colors, and glitch details that share one identity. Pick a preset, fine-tune it, or upload your own logo, artwork, or symbol. Real-person photos are allowed but never required — pseudonymity is part of the model.</div>
						<div className="gs-avatar-picker">
							<div className="gs-avatar-preview">
								{avatarFile ? (
									<img src={avatarPreviewUrl} alt="Avatar preview" className="gs-avatar-preview-img" />
								) : (
									<GhostAvatar profile={{ ...draft, avatar: avatarRemoved ? '' : draft.avatar }} size={128} forceShow />
								)}
								<span className="mono">@{draft.handle}</span>
							</div>
							<div className="gs-avatar-side">
								<div className="field">
									<label htmlFor="pf-avis">Visibility</label>
									<select id="pf-avis" value={normalizeVisibility(draft.avatar_visibility)} onChange={(e) => set('avatar_visibility', e.target.value)}>
										<option value="public">Public — shown to everyone</option>
										<option value="members">Members only — signed-in Ghosts</option>
										<option value="hidden">Hidden — default placeholder</option>
									</select>
									<small>Controls who sees your avatar across the directory, public profile, projects, and Table Talks.</small>
								</div>
								<div className="gs-avatar-upload">
									<label className="gs-upload">
										<Upload size={13} strokeWidth={1.5} /> {draft.avatar || avatarFile ? 'Replace custom image' : 'Upload custom image'}
										<input type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml,image/gif" onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} />
									</label>
									{(draft.avatar || avatarFile) && !avatarRemoved && (
										<button type="button" className="gs-icon-btn" aria-label="Remove custom image" onClick={() => { setAvatarFile(null); setAvatarRemoved(true); }}>
											<Trash2 size={13} strokeWidth={1.5} /> Remove custom image
										</button>
									)}
									<small>JPG, PNG, WebP, SVG, or GIF. Max 5 MB. Recommended 512×512 or larger; a square crop is best. A custom image overrides your chosen Ghost template.</small>
								</div>
							</div>
						</div>

						<div className="gs-avatar-templates">
							<div className="gs-avatar-templates-head">
								<label>Ghost templates</label>
								<button type="button" className="gs-card-action" onClick={() => set('avatar_template', '')}>Use handle default</button>
							</div>
							<div className="gs-avatar-presets">
								{AVATAR_PRESETS.map((preset) => {
									const active = encodeTemplate(effectiveTemplate) === encodeTemplate(preset.template);
									return (
										<button type="button" key={preset.name} className={`gs-avatar-preset ${active ? 'active' : ''}`} onClick={() => set('avatar_template', encodeTemplate(preset.template))}>
											<TemplateGhost template={preset.template} />
											<span>{preset.name}</span>
										</button>
									);
								})}
							</div>
							<div className="gs-avatar-compose">
								<div className="field">
									<label htmlFor="pf-expr">Expression</label>
									<select id="pf-expr" value={effectiveTemplate.expression} onChange={(e) => setTemplate('expression', e.target.value as GhostExpression)}>
										{GHOST_EXPRESSIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
									</select>
								</div>
								<div className="field">
									<label htmlFor="pf-acc">Accent</label>
									<select id="pf-acc" value={effectiveTemplate.accent} onChange={(e) => setTemplate('accent', e.target.value as GhostAccent)}>
										{GHOST_ACCENTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
									</select>
								</div>
								<div className="field">
									<label htmlFor="pf-bg">Background</label>
									<select id="pf-bg" value={effectiveTemplate.background} onChange={(e) => setTemplate('background', e.target.value as GhostBackground)}>
										{GHOST_BACKGROUNDS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
									</select>
								</div>
							</div>
						</div>
					</section>

					{/* Practice */}
					<section className="gs-builder-section">
						<h2 className="gs-builder-h2">Practice</h2>
						<div className="field">
							<label>Specialties <span className="gs-optional">— what you practice</span></label>
							<div className="specialty-picker">
								{SPECIALTY_GROUPS.map((group) => (
									<fieldset key={group.name} className="specialty-group">
										<legend>{group.name}</legend>
										<div className="specialty-options">
											{group.specialties.map((s) => (
												<label key={s} className="specialty-option">
													<input type="checkbox" checked={tagsOf(draft.specialties).includes(s)} onChange={() => toggleInList('specialties', s)} />
													<span>{s}</span>
												</label>
											))}
										</div>
									</fieldset>
								))}
							</div>
						</div>
						<div className="field">
							<label>Developing <span className="gs-optional">— areas you are learning or growing into</span></label>
							<div className="specialty-picker">
								{SPECIALTY_GROUPS.map((group) => (
									<fieldset key={group.name} className="specialty-group">
										<legend>{group.name}</legend>
										<div className="specialty-options">
											{group.specialties.map((s) => (
												<label key={s} className="specialty-option">
													<input type="checkbox" checked={tagsOf(draft.developing_specialties).includes(s)} onChange={() => toggleInList('developing_specialties', s)} />
													<span>{s}</span>
												</label>
											))}
										</div>
									</fieldset>
								))}
							</div>
						</div>
						<TagInput label="Skills" suggestions={SKILL_OPTIONS} selected={tagsOf(draft.skills)} onChange={(v) => set('skills', v.join(', '))} hint="Methods, frameworks, languages, and analysis techniques. Add any value." />
						<TagInput label="Tools / Technologies" suggestions={TOOL_OPTIONS} selected={tagsOf(draft.tools)} onChange={(v) => set('tools', v.join(', '))} hint="Use “Custom” for bespoke or self-built tooling. Any tool is accepted." />
						<TagInput label="Platforms / Environment" suggestions={PLATFORM_OPTIONS} selected={tagsOf(draft.platform)} onChange={(v) => set('platform', v.join(', '))} />
						<TagInput label="Industries / Domains" suggestions={INDUSTRY_OPTIONS} selected={tagsOf(draft.industry)} onChange={(v) => set('industry', v.join(', '))} />
					</section>

					{/* Languages */}
					<section className="gs-builder-section">
						<h2 className="gs-builder-h2">Languages</h2>
						<div className="gs-builder-grid">
							<div className="field"><label htmlFor="pf-lang">Content language</label>
								<select id="pf-lang" value={draft.language || 'en'} onChange={(e) => set('language', e.target.value)}>
									{CONTENT_LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.native}{l.code !== 'other' ? ` (${l.code.toUpperCase()})` : ''}</option>)}
								</select>
								<small>The language you publish in. Your original language is always preserved.</small>
							</div>
						</div>
						<TagInput label="Working languages" suggestions={LANGUAGE_NAMES} selected={tagsOf(draft.languages)} onChange={(v) => set('languages', v.join(', '))} hint="Languages you work in, shown on your directory card." />
						<label className="gs-toggle-row">
							<span className="gs-toggle-info">
								<span className="gs-toggle-label">Show language proficiency</span>
								<span className="gs-toggle-desc">Display your working languages on your public profile.</span>
							</span>
							<span className="gs-toggle">
								<input type="checkbox" checked={draft.show_language_proficiency !== false} onChange={(e) => set('show_language_proficiency', e.target.checked)} />
								<span className="gs-toggle-track" aria-hidden="true"><span className="gs-toggle-thumb" /></span>
							</span>
						</label>
					</section>

					{/* Location */}
					<section className="gs-builder-section">
						<h2 className="gs-builder-h2">Location</h2>
						<div className="callout">Location is disclosure-controlled. Country is the most detail ever shown — city, state/province, and precise location are never required or displayed.</div>
						<div className="gs-builder-grid">
							<div className="field"><label htmlFor="pf-disc">Location disclosure</label>
								<select id="pf-disc" value={disclosure} onChange={(e) => set('location_disclosure', e.target.value as LocationDisclosure)}>
									{LOCATION_DISCLOSURES.map((o) => <option key={o.value} value={o.value}>{o.label} — {o.hint}</option>)}
								</select>
							</div>
							{disclosure === 'country' && (
								<div className="field"><label htmlFor="pf-country">Country</label><input id="pf-country" value={draft.location_country || ''} onChange={(e) => set('location_country', e.target.value)} maxLength={100} placeholder="Germany, Romania, Japan…" />{fieldErr('location_country')}</div>
							)}
						</div>
					</section>

					{/* Availability */}
					<section className="gs-builder-section">
						<h2 className="gs-builder-h2">Availability</h2>
						<label className="gs-toggle-row"><span className="gs-toggle-info"><span className="gs-toggle-label">Available for work</span><span className="gs-toggle-desc">Show an “available for work” status on your profile.</span></span>
							<span className="gs-toggle"><input type="checkbox" checked={draft.available_for_work || false} onChange={(e) => set('available_for_work', e.target.checked)} /><span className="gs-toggle-track" aria-hidden="true"><span className="gs-toggle-thumb" /></span></span>
						</label>
						<label className="gs-toggle-row"><span className="gs-toggle-info"><span className="gs-toggle-label">Open to collaboration</span><span className="gs-toggle-desc">Other Ghosts can send you structured collaboration requests.</span></span>
							<span className="gs-toggle"><input type="checkbox" checked={draft.open_to_collaboration || false} onChange={(e) => set('open_to_collaboration', e.target.checked)} /><span className="gs-toggle-track" aria-hidden="true"><span className="gs-toggle-thumb" /></span></span>
						</label>
						<label className="gs-toggle-row"><span className="gs-toggle-info"><span className="gs-toggle-label">Open to research</span><span className="gs-toggle-desc">Open to research collaboration.</span></span>
							<span className="gs-toggle"><input type="checkbox" checked={draft.open_to_research || false} onChange={(e) => set('open_to_research', e.target.checked)} /><span className="gs-toggle-track" aria-hidden="true"><span className="gs-toggle-thumb" /></span></span>
						</label>
						<label className="gs-toggle-row"><span className="gs-toggle-info"><span className="gs-toggle-label">Open to mentorship</span><span className="gs-toggle-desc">Open to mentoring or being mentored.</span></span>
							<span className="gs-toggle"><input type="checkbox" checked={draft.open_to_mentorship || false} onChange={(e) => set('open_to_mentorship', e.target.checked)} /><span className="gs-toggle-track" aria-hidden="true"><span className="gs-toggle-thumb" /></span></span>
						</label>
						<label className="gs-toggle-row"><span className="gs-toggle-info"><span className="gs-toggle-label">Open to speaking</span><span className="gs-toggle-desc">Talks, panels, podcasts.</span></span>
							<span className="gs-toggle"><input type="checkbox" checked={draft.open_to_speaking || false} onChange={(e) => set('open_to_speaking', e.target.checked)} /><span className="gs-toggle-track" aria-hidden="true"><span className="gs-toggle-thumb" /></span></span>
						</label>
						<div className="field gs-builder-span2"><label htmlFor="pf-interests">Collaboration interests</label><textarea id="pf-interests" value={draft.collaboration_interests || ''} onChange={(e) => set('collaboration_interests', e.target.value)} maxLength={1000} placeholder="Malware research, DFIR projects, open-source tooling, Table Talks, conference talks…" /><small>What you want to do next. Shown on your profile as “Looking for”.</small></div>
					</section>

					{/* External identities */}
					<section className="gs-builder-section">
						<h2 className="gs-builder-h2">External identities</h2>
						<div className="field gs-builder-span2"><label htmlFor="pf-ext">Verified platform links</label><textarea id="pf-ext" value={draft.external_links || ''} onChange={(e) => set('external_links', e.target.value)} maxLength={2000} placeholder={'GitHub: https://github.com/yourhandle\nHack The Box: https://app.hackthebox.com/profile/yourhandle\nORCID: https://orcid.org/0000-0000-0000-0000'} /><small>One per line as “Platform: https://…”. Common platforms: GitHub, Hack The Box, CyberDefenders, Credly, ORCID, LinkedIn, personal site, or other. These verify platform ownership, not legal identity.</small>{fieldErr('external_links')}</div>
						<div className="field gs-builder-span2"><label htmlFor="pf-portfolio">Public external portfolio <span className="gs-optional">optional</span></label><input id="pf-portfolio" type="url" value={draft.portfolio || ''} onChange={(e) => set('portfolio', e.target.value)} placeholder="https://…" /><small>Leave blank, or enter a full URL such as https://github.com/yourhandle. A bare domain like github.com/name is accepted and prefixed automatically.</small>{fieldErr('portfolio')}</div>
						<label className="gs-toggle-row"><span className="gs-toggle-info"><span className="gs-toggle-label">Show external identities</span><span className="gs-toggle-desc">Display your verified platform links publicly.</span></span>
							<span className="gs-toggle"><input type="checkbox" checked={draft.show_external_identities !== false} onChange={(e) => set('show_external_identities', e.target.checked)} /><span className="gs-toggle-track" aria-hidden="true"><span className="gs-toggle-thumb" /></span></span>
						</label>
						<label className="gs-toggle-row"><span className="gs-toggle-info"><span className="gs-toggle-label">Allow recruiter contact</span><span className="gs-toggle-desc">Opt in to being contacted about work opportunities.</span></span>
							<span className="gs-toggle"><input type="checkbox" checked={draft.allow_recruiter_contact || false} onChange={(e) => set('allow_recruiter_contact', e.target.checked)} /><span className="gs-toggle-track" aria-hidden="true"><span className="gs-toggle-thumb" /></span></span>
						</label>
					</section>

					{/* Featured work */}
					{publishedWork.length > 0 && (
						<section className="gs-builder-section">
							<h2 className="gs-builder-h2">Featured work</h2>
							<p className="muted-note" style={{ marginBottom: 14 }}>Choose which published contributions visitors see first on your profile.</p>
							<div className="featured-picker">
								{publishedWork.map((w) => (
									<label key={w.id} className="featured-option">
										<input type="checkbox" checked={tagsOf(draft.featured_work || '').includes(w.id)} onChange={() => toggleFeatured(w.id)} />
										<span className="featured-option-title">{w.title}</span>
										<span className="featured-option-kind">{w.kind}</span>
									</label>
								))}
							</div>
						</section>
					)}

					{/* Visibility summary */}
					<section className="gs-builder-section">
						<h2 className="gs-builder-h2">Visibility</h2>
						<p className="muted-note" style={{ marginBottom: 14 }}>Your profile is public. These controls let you hide specific sections without removing the data. Toggle them above to change what the public sees.</p>
						<ul className="gs-visibility-summary">
							<li><strong>External identities</strong> — {draft.show_external_identities !== false ? 'Public' : 'Hidden'}</li>
							<li><strong>Working languages</strong> — {draft.show_language_proficiency !== false ? 'Public' : 'Hidden'}</li>
							<li><strong>Location</strong> — {disclosure === 'undisclosed' ? 'Undisclosed' : disclosure === 'remote' ? 'Remote' : (draft.location_country || 'Country')}</li>
							<li><strong>Availability</strong> — {[draft.available_for_work && 'Work', draft.open_to_collaboration && 'Collaboration', draft.open_to_research && 'Research', draft.open_to_mentorship && 'Mentorship', draft.open_to_speaking && 'Speaking'].filter(Boolean).join(', ') || 'None shown'}</li>
						</ul>
					</section>

					{error && <div className="status-message error-message" role="alert">{error}</div>}
					{saved && <div className="status-message" role="status">Your public profile has been updated.</div>}

					<div className="gs-builder-actions">
						<button type="submit" className="button button-light" disabled={busy || !dirty}><Save size={14} strokeWidth={1.5} /> {busy ? 'Saving…' : 'Save changes'}</button>
						<button type="button" className="button button-outline" onClick={cancel} disabled={busy || !dirty}><X size={14} strokeWidth={1.5} /> Cancel</button>
						<button type="button" className="gs-card-action" onClick={() => setMode('preview')}><Eye size={14} strokeWidth={1.5} /> Preview public profile</button>
					</div>
				</form>
			)}
		</div>
	);
}
