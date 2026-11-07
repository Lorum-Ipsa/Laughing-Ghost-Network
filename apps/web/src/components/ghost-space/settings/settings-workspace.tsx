import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router';
import {
	Mail, Lock, Eye, UserCircle, ShieldCheck, Languages, Bell, Link2,
	Download, AlertTriangle, KeyRound, CheckCircle2, LogOut, Send,
	ShieldAlert, Globe, FileText, Trash2, PauseCircle, ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { pocketbaseClient as pb } from '@/lib/pocketbase-client';
import type { GhostProfile, LocationDisclosure } from '@/lib/network';
import { LOCATION_DISCLOSURES, normalizeDisclosure, parseExternalLinks, safeExternal } from '@/lib/network';
import { CONTENT_LANGUAGES } from '@/lib/languages';
import { useI18n, type InterfaceLanguage } from '@/lib/i18n';
import { exportMyData } from '@/lib/export-data';
import { NotificationPreferences } from '@/components/ghost-space/notifications/notification-preferences';

type SettingsSection =
	| 'account' | 'privacy' | 'identity' | 'security'
	| 'language' | 'notifications' | 'identities' | 'data' | 'actions';

const SECTIONS: { key: SettingsSection; label: string; icon: typeof Mail }[] = [
	{ key: 'account', label: 'Account', icon: Mail },
	{ key: 'privacy', label: 'Privacy', icon: Eye },
	{ key: 'identity', label: 'Identity', icon: UserCircle },
	{ key: 'security', label: 'Security', icon: ShieldCheck },
	{ key: 'language', label: 'Language & Translation', icon: Languages },
	{ key: 'notifications', label: 'Notifications', icon: Bell },
	{ key: 'identities', label: 'External Identities', icon: Link2 },
	{ key: 'data', label: 'Data & Export', icon: Download },
	{ key: 'actions', label: 'Account Actions', icon: AlertTriangle },
];

function toBool(v: unknown): boolean { return v === true || v === 'true'; }

/**
 * The Settings workspace — a core privacy/security surface, not a generic
 * preferences page. Private account data (email, password, verification,
 * sessions) stays on the `users` auth collection; public Ghost profile data
 * (handle, bio, location disclosure, availability, external identities) lives
 * on `ghost_profiles`. The two are never mixed.
 *
 * Admin roles and privileged settings are never exposed here — role changes
 * are server-controlled and audit-logged. Security-sensitive actions
 * (password change, account deactivation) reauthenticate the member first.
 */
export function SettingsWorkspace({
	profile, onRefresh,
}: { profile: GhostProfile | null; onRefresh: () => void }) {
	const { user, logout } = useAuth();
	const [section, setSection] = useState<SettingsSection>('account');

	return (
		<div className="gs-settings">
			<header className="gs-section-head">
				<div>
					<span className="eyebrow"><span className="tiny-dot" /> GHOST SPACE / SETTINGS</span>
					<h1>Settings &amp; security</h1>
					<p className="gs-section-lede">Control your privacy, identity, security, and data. Private account details stay separate from your public Ghost profile. Admin roles and privileged settings are never shown here.</p>
				</div>
			</header>

			<nav className="gs-settings-nav" aria-label="Settings sections">
				{SECTIONS.map(({ key, label, icon: Icon }) => (
					<button
						key={key}
						type="button"
						className={`gs-settings-tab ${section === key ? 'active' : ''}`}
						aria-current={section === key ? 'page' : undefined}
						onClick={() => setSection(key)}
					>
						<Icon size={14} strokeWidth={1.5} />
						<span>{label}</span>
					</button>
				))}
			</nav>

			{section === 'account' && <AccountSection user={user} />}
			{section === 'privacy' && <PrivacySection profile={profile} onSaved={onRefresh} />}
			{section === 'identity' && <IdentitySection profile={profile} onSaved={onRefresh} />}
			{section === 'security' && <SecuritySection user={user} />}
			{section === 'language' && <LanguageSection profile={profile} onSaved={onRefresh} />}
			{section === 'notifications' && user && <NotificationPreferences ownerId={user.id} />}
			{section === 'identities' && <ExternalIdentitiesSection profile={profile} onSaved={onRefresh} />}
			{section === 'data' && <DataExportSection />}
			{section === 'actions' && <AccountActionsSection profile={profile} user={user} onSignOut={logout} onSaved={onRefresh} />}
		</div>
	);
}

/* ----------------------------- Account ----------------------------- */

function AccountSection({ user }: { user: ReturnType<typeof useAuth>['user'] }) {
	const [busy, setBusy] = useState(false);
	const [msg, setMsg] = useState('');
	const [err, setErr] = useState('');
	const [current, setCurrent] = useState('');
	const [next, setNext] = useState('');
	const [confirm, setConfirm] = useState('');

	async function changePassword(e: FormEvent) {
		e.preventDefault();
		setBusy(true); setErr(''); setMsg('');
		if (!user?.email) { setErr('No signed-in account.'); setBusy(false); return; }
		if (next.length < 8) { setErr('New password must be at least 8 characters.'); setBusy(false); return; }
		if (next !== confirm) { setErr('Passwords do not match.'); setBusy(false); return; }
		try {
			// Reauthenticate before a sensitive change.
			await pb.collection('users').authWithPassword(user.email, current);
			await pb.collection('users').update(user.id, { password: next, passwordConfirm: next });
			setMsg('Password changed. Use your new password next time you sign in.');
			setCurrent(''); setNext(''); setConfirm('');
		} catch {
			setErr('Could not change password. Check your current password and try again.');
		} finally { setBusy(false); }
	}

	async function requestVerification() {
		if (!user?.email) return;
		setBusy(true); setErr(''); setMsg('');
		try {
			await pb.collection('users').requestVerification(user.email);
			setMsg('Verification email sent. Check your inbox.');
		} catch {
			setErr('Could not send a verification email right now.');
		} finally { setBusy(false); }
	}

	return (
		<section className="gs-settings-section">
			<h2 className="gs-settings-h2"><Mail size={16} strokeWidth={1.5} /> Account</h2>
			<p className="gs-settings-intro">Private sign-in details. Your email is never shown on your public profile.</p>

			<div className="gs-settings-grid">
				<div className="gs-settings-field">
					<span className="gs-settings-label">Email</span>
					<span className="gs-settings-value">{user?.email || '—'}</span>
				</div>
				<div className="gs-settings-field">
					<span className="gs-settings-label">Email verification</span>
					<span className="gs-settings-value">
						{user?.verified ? <><CheckCircle2 size={13} strokeWidth={1.5} /> Verified</> : <><ShieldAlert size={13} strokeWidth={1.5} /> Not verified</>}
					</span>
					{!user?.verified && <button type="button" className="gs-settings-inline" onClick={requestVerification} disabled={busy}>Send verification email</button>}
				</div>
				<div className="gs-settings-field">
					<span className="gs-settings-label">Account status</span>
					<span className="gs-settings-value">{user?.suspended ? 'Suspended' : 'Active'}</span>
				</div>
			</div>

			<form className="gs-settings-form" onSubmit={changePassword}>
				<h3 className="gs-settings-h3"><KeyRound size={14} strokeWidth={1.5} /> Change password</h3>
				<p className="gs-settings-note">Reauthentication required: enter your current password to confirm.</p>
				<div className="field"><label htmlFor="cur-pw">Current password</label><input id="cur-pw" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" /></div>
				<div className="field"><label htmlFor="new-pw">New password</label><input id="new-pw" type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" /></div>
				<div className="field"><label htmlFor="conf-pw">Confirm new password</label><input id="conf-pw" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" /></div>
				{err && <div className="status-message error-message" role="alert">{err}</div>}
				{msg && <div className="status-message" role="status">{msg}</div>}
				<button className="button button-light" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Change password'}</button>
			</form>
		</section>
	);
}

/* ----------------------------- Privacy ----------------------------- */

function PrivacySection({ profile, onSaved }: { profile: GhostProfile | null; onSaved: () => void }) {
	const [busy, setBusy] = useState(false);
	const [msg, setMsg] = useState('');
	const [err, setErr] = useState('');
	const [disclosure, setDisclosure] = useState<LocationDisclosure>(normalizeDisclosure(profile?.location_disclosure));
	const [country, setCountry] = useState(profile?.location_country || '');
	const [toggles, setToggles] = useState({
		available_for_work: toBool(profile?.available_for_work),
		open_to_collaboration: toBool(profile?.open_to_collaboration),
		allow_recruiter_contact: toBool(profile?.allow_recruiter_contact),
		show_external_identities: profile?.show_external_identities === undefined ? true : toBool(profile.show_external_identities),
		show_language_proficiency: profile?.show_language_proficiency === undefined ? true : toBool(profile.show_language_proficiency),
	});

	useEffect(() => {
		setDisclosure(normalizeDisclosure(profile?.location_disclosure));
		setCountry(profile?.location_country || '');
		setToggles({
			available_for_work: toBool(profile?.available_for_work),
			open_to_collaboration: toBool(profile?.open_to_collaboration),
			allow_recruiter_contact: toBool(profile?.allow_recruiter_contact),
			show_external_identities: profile?.show_external_identities === undefined ? true : toBool(profile.show_external_identities),
			show_language_proficiency: profile?.show_language_proficiency === undefined ? true : toBool(profile.show_language_proficiency),
		});
	}, [profile]);

	async function save(e: FormEvent) {
		e.preventDefault();
		if (!profile) return;
		setBusy(true); setErr(''); setMsg('');
		try {
			await pb.collection('ghost_profiles').update(profile.id, {
				location_disclosure: disclosure,
				location_country: disclosure === 'country' ? country : '',
				available_for_work: toggles.available_for_work,
				open_to_collaboration: toggles.open_to_collaboration,
				allow_recruiter_contact: toggles.allow_recruiter_contact,
				show_external_identities: toggles.show_external_identities,
				show_language_proficiency: toggles.show_language_proficiency,
			});
			setMsg('Privacy settings saved.');
			onSaved();
		} catch {
			setErr('Could not save privacy settings. Try again.');
		} finally { setBusy(false); }
	}

	const toggle = (key: keyof typeof toggles) => setToggles((p) => ({ ...p, [key]: !p[key] }));

	if (!profile) return <NoProfile />;

	return (
		<form className="gs-settings-section" onSubmit={save}>
			<h2 className="gs-settings-h2"><Eye size={16} strokeWidth={1.5} /> Privacy</h2>
			<p className="gs-settings-intro">Control what your public profile reveals. Location is disclosure-controlled — Country is the most detail ever shown.</p>

			<div className="gs-settings-form">
				<h3 className="gs-settings-h3">Location</h3>
				<div className="field"><label htmlFor="disclosure">Location disclosure</label>
					<select id="disclosure" value={disclosure} onChange={(e) => setDisclosure(e.target.value as LocationDisclosure)}>
						{LOCATION_DISCLOSURES.map((o) => <option key={o.value} value={o.value}>{o.label} — {o.hint}</option>)}
					</select>
				</div>
				{disclosure === 'country' && <div className="field"><label htmlFor="country">Country</label><input id="country" value={country} onChange={(e) => setCountry(e.target.value)} maxLength={100} placeholder="Germany, Romania, Japan…" /></div>}
			</div>

			<div className="gs-settings-form">
				<h3 className="gs-settings-h3">Visibility &amp; availability</h3>
				<ToggleRow label="Show availability for work" desc="Display your “available for work” status on your profile." checked={toggles.available_for_work} onChange={() => toggle('available_for_work')} />
				<ToggleRow label="Allow collaboration requests" desc="Other Ghosts can send you structured collaboration requests." checked={toggles.open_to_collaboration} onChange={() => toggle('open_to_collaboration')} />
				<ToggleRow label="Allow recruiter contact" desc="Opt in to being contacted about work opportunities." checked={toggles.allow_recruiter_contact} onChange={() => toggle('allow_recruiter_contact')} />
				<ToggleRow label="Show external identities" desc="Display your verified platform links publicly." checked={toggles.show_external_identities} onChange={() => toggle('show_external_identities')} />
				<ToggleRow label="Show language proficiency" desc="Display the working languages on your profile." checked={toggles.show_language_proficiency} onChange={() => toggle('show_language_proficiency')} />
			</div>

			{err && <div className="status-message error-message" role="alert">{err}</div>}
			{msg && <div className="status-message" role="status">{msg}</div>}
			<button className="button button-light" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save privacy settings'}</button>
		</form>
	);
}

/* ----------------------------- Identity ----------------------------- */

function IdentitySection({ profile, onSaved }: { profile: GhostProfile | null; onSaved: () => void }) {
	const [busy, setBusy] = useState(false);
	const [msg, setMsg] = useState('');
	const [err, setErr] = useState('');
	const [requested, setRequested] = useState('');
	const [newHandle, setNewHandle] = useState('');
	const [reason, setReason] = useState('');
	const [existing, setExisting] = useState<{ id: string; requested_handle: string; status: string } | null>(null);
	const [form, setForm] = useState({ display_name: profile?.display_name || '', pronouns: profile?.pronouns || '', bio: profile?.bio || '' });

	useEffect(() => {
		setForm({ display_name: profile?.display_name || '', pronouns: profile?.pronouns || '', bio: profile?.bio || '' });
	}, [profile]);

	useEffect(() => {
		if (!profile) return;
		let active = true;
		pb.collection('ghost_handle_changes').getFullList<{ id: string; requested_handle: string; status: string }>({
			filter: pb.filter('owner = {:id}', { id: profile.owner }), sort: '-created', requestKey: null,
		}).then((rows) => { if (active) setExisting(rows.find((r) => r.status === 'pending') || null); }).catch(() => {});
		return () => { active = false; };
	}, [profile, requested]);

	async function saveIdentity(e: FormEvent) {
		e.preventDefault();
		if (!profile) return;
		setBusy(true); setErr(''); setMsg('');
		try {
			await pb.collection('ghost_profiles').update(profile.id, {
				display_name: form.display_name, pronouns: form.pronouns, bio: form.bio,
			});
			setMsg('Identity updated.'); onSaved();
		} catch { setErr('Could not save identity details.'); } finally { setBusy(false); }
	}

	async function requestHandle(e: FormEvent) {
		e.preventDefault();
		if (!profile) return;
		setBusy(true); setErr(''); setMsg('');
		if (!/^[a-z0-9_/-]+$/.test(newHandle)) { setErr('Handle may only use lowercase letters, digits, underscores, hyphens, and slashes.'); setBusy(false); return; }
		if (newHandle === profile.handle) { setErr('That is already your handle.'); setBusy(false); return; }
		try {
			await pb.collection('ghost_handle_changes').create({
				owner: profile.owner, profile: profile.id, current_handle: profile.handle,
				requested_handle: newHandle, reason, status: 'pending',
			});
			setMsg('Handle-change request submitted for moderation.');
			setNewHandle(''); setReason(''); setRequested(String(Date.now()));
		} catch { setErr('Could not submit the request. You may already have a pending request.'); } finally { setBusy(false); }
	}

	if (!profile) return <NoProfile />;

	return (
		<section className="gs-settings-section">
			<h2 className="gs-settings-h2"><UserCircle size={16} strokeWidth={1.5} /> Identity</h2>
			<p className="gs-settings-intro">Your persistent pseudonymous identity. Handles change only through moderation.</p>

			<form className="gs-settings-form" onSubmit={saveIdentity}>
				<div className="field"><label htmlFor="handle">Persistent handle</label><input id="handle" readOnly value={profile.handle} /><small>Handle changes are exceptional and moderated.</small></div>
				<div className="field"><label htmlFor="dname">Display name <span className="gs-optional">optional</span></label><input id="dname" value={form.display_name} onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))} maxLength={100} placeholder="A name shown alongside your handle" /></div>
				<div className="field"><label htmlFor="pronouns">Pronouns <span className="gs-optional">optional</span></label><input id="pronouns" value={form.pronouns} onChange={(e) => setForm((f) => ({ ...f, pronouns: e.target.value }))} maxLength={40} placeholder="they/them, she/her…" /></div>
				<div className="field"><label htmlFor="bio">Public bio</label><textarea id="bio" value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} maxLength={2000} /></div>
				{err && <div className="status-message error-message" role="alert">{err}</div>}
				{msg && <div className="status-message" role="status">{msg}</div>}
				<button className="button button-light" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save identity'}</button>
			</form>

			<form className="gs-settings-form" onSubmit={requestHandle}>
				<h3 className="gs-settings-h3"><Send size={14} strokeWidth={1.5} /> Request a handle change</h3>
				<p className="gs-settings-note">Handle changes are reviewed by moderators. Your persistent identity is preserved across the change.</p>
				{existing && <div className="status-message" role="status">You have a pending request for <strong>{existing.requested_handle}</strong>.</div>}
				<div className="field"><label htmlFor="newhandle">Requested handle</label><input id="newhandle" value={newHandle} onChange={(e) => setNewHandle(e.target.value)} maxLength={40} placeholder="new-handle" /></div>
				<div className="field"><label htmlFor="hreason">Reason</label><textarea id="hreason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} placeholder="Why are you requesting this change?" /></div>
				<button className="button button-outline" type="submit" disabled={busy}>{busy ? 'Submitting…' : 'Submit request'}</button>
			</form>
		</section>
	);
}

/* ----------------------------- Security ----------------------------- */

function SecuritySection({ user }: { user: ReturnType<typeof useAuth>['user'] }) {
	const [sessions, setSessions] = useState<{ created: string }[]>([]);

	useEffect(() => {
		// PocketBase exposes the current auth token's issue time only; there is
		// no multi-session list API. We surface the active session honestly.
		try {
			const model = pb.authStore.model as { created?: string } | null;
			setSessions(model?.created ? [{ created: model.created }] : []);
		} catch { setSessions([]); }
	}, [user]);

	return (
		<section className="gs-settings-section">
			<h2 className="gs-settings-h2"><ShieldCheck size={16} strokeWidth={1.5} /> Security</h2>
			<p className="gs-settings-intro">Protect your account. Security-sensitive changes reauthenticate you first.</p>

			<div className="gs-settings-form">
				<h3 className="gs-settings-h3">Multi-factor authentication</h3>
				<div className="callout">MFA, passkeys, and recovery codes are on the roadmap for this cybersecurity network. Until then, use a strong, unique password and keep your email secure.</div>
				<ul className="gs-settings-list">
					<li><Lock size={13} strokeWidth={1.5} /> Authenticator MFA — planned</li>
					<li><KeyRound size={13} strokeWidth={1.5} /> Passkeys — planned</li>
					<li><ShieldAlert size={13} strokeWidth={1.5} /> Recovery codes — planned</li>
				</ul>
			</div>

			<div className="gs-settings-form">
				<h3 className="gs-settings-h3">Active sessions</h3>
				<p className="gs-settings-note">The platform tracks the session you are signed in with. Signing out clears this session on this device.</p>
				{sessions.length === 0 ? (
					<p className="muted-note">No active session information available.</p>
				) : (
					<ul className="gs-settings-list">
						{sessions.map((s, i) => <li key={i}><CheckCircle2 size={13} strokeWidth={1.5} /> Current session — account created {new Date(s.created).toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' })}</li>)}
					</ul>
				)}
				<button type="button" className="button button-outline" onClick={() => { pb.authStore.clear(); window.location.href = '/login'; }}><LogOut size={14} strokeWidth={1.5} /> Sign out this session</button>
			</div>

			<div className="gs-settings-form">
				<h3 className="gs-settings-h3">Recent security events</h3>
				<p className="gs-settings-note">Security notices are recorded in your Notifications inbox under the Security category.</p>
				<Link to="/ghost-space?section=notifications" className="text-link"><ShieldAlert size={14} strokeWidth={1.5} /> View security notifications</Link>
			</div>
		</section>
	);
}

/* --------------------- Language & Translation --------------------- */

function LanguageSection({ profile, onSaved }: { profile: GhostProfile | null; onSaved: () => void }) {
	const { lang, setLang } = useI18n();
	const [busy, setBusy] = useState(false);
	const [msg, setMsg] = useState('');
	const [err, setErr] = useState('');
	const [translationLang, setTranslationLang] = useState(profile?.preferred_translation_language || 'en');
	const [pubLang, setPubLang] = useState(profile?.preferred_publication_language || profile?.language || 'en');
	const [toggles, setToggles] = useState({
		always_show_original: toBool(profile?.always_show_original),
		auto_translate: toBool(profile?.auto_translate),
		never_translate_technical: profile?.never_translate_technical === undefined ? true : toBool(profile.never_translate_technical),
	});

	useEffect(() => {
		setTranslationLang(profile?.preferred_translation_language || 'en');
		setPubLang(profile?.preferred_publication_language || profile?.language || 'en');
		setToggles({
			always_show_original: toBool(profile?.always_show_original),
			auto_translate: toBool(profile?.auto_translate),
			never_translate_technical: profile?.never_translate_technical === undefined ? true : toBool(profile.never_translate_technical),
		});
	}, [profile]);

	async function save(e: FormEvent) {
		e.preventDefault();
		if (!profile) return;
		setBusy(true); setErr(''); setMsg('');
		try {
			await pb.collection('ghost_profiles').update(profile.id, {
				preferred_translation_language: translationLang,
				preferred_publication_language: pubLang,
				always_show_original: toggles.always_show_original,
				auto_translate: toggles.auto_translate,
				never_translate_technical: toggles.never_translate_technical,
			});
			setMsg('Language & translation preferences saved.'); onSaved();
		} catch { setErr('Could not save language preferences.'); } finally { setBusy(false); }
	}

	const toggle = (key: keyof typeof toggles) => setToggles((p) => ({ ...p, [key]: !p[key] }));

	return (
		<form className="gs-settings-section" onSubmit={save}>
			<h2 className="gs-settings-h2"><Languages size={16} strokeWidth={1.5} /> Language &amp; Translation</h2>
			<p className="gs-settings-intro">Your original language is always preserved and authoritative. Translation is a reader's choice — code and technical artifacts are never translated.</p>

			<div className="gs-settings-form">
				<h3 className="gs-settings-h3"><Globe size={14} strokeWidth={1.5} /> Interface language</h3>
				<p className="gs-settings-note">Changes the interface language for this browser. Applied immediately.</p>
				<div className="gs-lang-options">
					{([{ code: 'en', native: 'English' }, { code: 'fr', native: 'Français' }, { code: 'es', native: 'Español' }, { code: 'de', native: 'Deutsch' }] as { code: InterfaceLanguage; native: string }[]).map((l) => (
						<button key={l.code} type="button" className={`gs-lang-pill ${lang === l.code ? 'active' : ''}`} onClick={() => setLang(l.code)}>{l.native}</button>
					))}
				</div>
			</div>

			{profile && (
				<div className="gs-settings-form">
					<h3 className="gs-settings-h3">Translation preferences</h3>
					<div className="field"><label htmlFor="tlang">Preferred translation language</label>
						<select id="tlang" value={translationLang} onChange={(e) => setTranslationLang(e.target.value)}>
							{CONTENT_LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.native}{l.code !== 'other' ? ` (${l.code.toUpperCase()})` : ''}</option>)}
						</select>
					</div>
					<div className="field"><label htmlFor="publang">Preferred publication language</label>
						<select id="publang" value={pubLang} onChange={(e) => setPubLang(e.target.value)}>
							{CONTENT_LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.native}{l.code !== 'other' ? ` (${l.code.toUpperCase()})` : ''}</option>)}
						</select>
						<small>The language you prefer to write and publish in.</small>
					</div>
					<ToggleRow label="Always show original" desc="Show the original-language content alongside any translation." checked={toggles.always_show_original} onChange={() => toggle('always_show_original')} />
					<ToggleRow label="Auto-translate supported content" desc="Offer a machine translation automatically when available." checked={toggles.auto_translate} onChange={() => toggle('auto_translate')} />
					<ToggleRow label="Never translate technical artifacts" desc="Code, commands, and technical artifacts are never translated." checked={toggles.never_translate_technical} onChange={() => toggle('never_translate_technical')} locked />
				</div>
			)}

			{err && <div className="status-message error-message" role="alert">{err}</div>}
			{msg && <div className="status-message" role="status">{msg}</div>}
			{profile && <button className="button button-light" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save preferences'}</button>}
		</form>
	);
}

/* ----------------------- External Identities ----------------------- */

function ExternalIdentitiesSection({ profile, onSaved }: { profile: GhostProfile | null; onSaved: () => void }) {
	const [busy, setBusy] = useState(false);
	const [msg, setMsg] = useState('');
	const [err, setErr] = useState('');
	const [platform, setPlatform] = useState('');
	const [url, setUrl] = useState('');
	const [links, setLinks] = useState(parseExternalLinks(profile?.external_links));

	useEffect(() => { setLinks(parseExternalLinks(profile?.external_links)); }, [profile]);

	async function add(e: FormEvent) {
		e.preventDefault();
		if (!profile) return;
		const safe = safeExternal(url);
		if (!platform || !safe) { setErr('Enter a platform and a valid http(s) URL.'); return; }
		setBusy(true); setErr(''); setMsg('');
		const next = [...links, { platform, url: safe }].map((l) => `${l.platform}: ${l.url}`).join('\n');
		try {
			await pb.collection('ghost_profiles').update(profile.id, { external_links: next });
			setLinks([...links, { platform, url: safe }]); setPlatform(''); setUrl(''); setMsg('Identity added.'); onSaved();
		} catch { setErr('Could not add the identity.'); } finally { setBusy(false); }
	}

	async function remove(idx: number) {
		if (!profile) return;
		setBusy(true); setErr('');
		const next = links.filter((_, i) => i !== idx).map((l) => `${l.platform}: ${l.url}`).join('\n');
		try {
			await pb.collection('ghost_profiles').update(profile.id, { external_links: next });
			setLinks(links.filter((_, i) => i !== idx)); onSaved();
		} catch { setErr('Could not remove the identity.'); } finally { setBusy(false); }
	}

	if (!profile) return <NoProfile />;

	return (
		<section className="gs-settings-section">
			<h2 className="gs-settings-h2"><Link2 size={16} strokeWidth={1.5} /> External identities</h2>
			<p className="gs-settings-intro">Verified platform links that prove ownership — not legal identity. Control whether they are public in Privacy.</p>

			{links.length > 0 ? (
				<ul className="gs-identity-list">
					{links.map((l, i) => (
						<li key={i} className="gs-identity-row">
							<span className="gs-identity-platform">{l.platform}</span>
							<a href={l.url} target="_blank" rel="noopener noreferrer" className="gs-identity-url"><ExternalLink size={12} strokeWidth={1.5} /> {l.url}</a>
							<button type="button" className="gs-identity-remove" onClick={() => remove(i)} disabled={busy} aria-label={`Remove ${l.platform}`}><Trash2 size={13} strokeWidth={1.5} /></button>
						</li>
					))}
				</ul>
			) : <p className="muted-note">No external identities connected yet.</p>}

			<form className="gs-settings-form" onSubmit={add}>
				<h3 className="gs-settings-h3">Connect an identity</h3>
				<div className="gs-identity-add">
					<input value={platform} onChange={(e) => setPlatform(e.target.value)} maxLength={100} placeholder="GitHub, Hack The Box, ORCID…" />
					<input value={url} onChange={(e) => setUrl(e.target.value)} type="url" placeholder="https://…" />
					<button className="button button-light" type="submit" disabled={busy}>{busy ? '…' : 'Add'}</button>
				</div>
				<small>Common platforms: GitHub, Hack The Box, CyberDefenders, Credly, ORCID, LinkedIn, personal website, or other verified links.</small>
				{err && <div className="status-message error-message" role="alert">{err}</div>}
				{msg && <div className="status-message" role="status">{msg}</div>}
			</form>
		</section>
	);
}

/* --------------------------- Data & Export --------------------------- */

function DataExportSection() {
	const [busy, setBusy] = useState(false);
	const [err, setErr] = useState('');

	async function doExport() {
		setBusy(true); setErr('');
		try { await exportMyData(); } catch (e) { setErr(e instanceof Error ? e.message : 'Export failed.'); } finally { setBusy(false); }
	}

	return (
		<section className="gs-settings-section">
			<h2 className="gs-settings-h2"><Download size={16} strokeWidth={1.5} /> Data &amp; export</h2>
			<p className="gs-settings-intro">Your data is portable. Download a complete archive of everything you own on the network at any time.</p>
			<ul className="gs-settings-list">
				<li><FileText size={13} strokeWidth={1.5} /> Profile, contributions, participations, applications, reports, notifications, external identities, and revisions.</li>
				<li><Download size={13} strokeWidth={1.5} /> Exported as a single JSON archive.</li>
			</ul>
			{err && <div className="status-message error-message" role="alert">{err}</div>}
			<button className="button button-light" type="button" onClick={doExport} disabled={busy}><Download size={14} strokeWidth={1.5} /> {busy ? 'Preparing archive…' : 'Download my data'}</button>
		</section>
	);
}

/* ------------------------- Account Actions ------------------------- */

function AccountActionsSection({ profile, user, onSignOut, onSaved }: {
	profile: GhostProfile | null;
	user: ReturnType<typeof useAuth>['user'];
	onSignOut: () => void;
	onSaved: () => void;
}) {
	const [busy, setBusy] = useState(false);
	const [msg, setMsg] = useState('');
	const [err, setErr] = useState('');
	const [confirm, setConfirm] = useState(false);
	const [current, setCurrent] = useState('');

	async function deactivate(e: FormEvent) {
		e.preventDefault();
		if (!profile || !user?.email) return;
		setBusy(true); setErr(''); setMsg('');
		try {
			await pb.collection('users').authWithPassword(user.email, current);
			await pb.collection('ghost_profiles').update(profile.id, { deleted: true, deleted_at: new Date().toISOString() });
			setMsg('Your public profile is deactivated. Published work remains attributed to your handle.');
			setConfirm(false); setCurrent(''); onSaved();
		} catch { setErr('Reauthentication failed. Check your password.'); } finally { setBusy(false); }
	}

	async function requestDeletion() {
		if (!profile) return;
		setBusy(true); setErr(''); setMsg('');
		try {
			await pb.collection('ghost_reports').create({
				owner: profile.owner, subject: 'Account deletion request',
				body: `Ghost ${profile.handle} requested full account deletion. Published work attribution should be reviewed.`,
			});
			setMsg('Deletion request submitted. Moderators will contact you to transfer project ownership and confirm attribution preferences.');
		} catch { setErr('Could not submit the request.'); } finally { setBusy(false); }
	}

	if (!profile) return <NoProfile />;

	return (
		<section className="gs-settings-section">
			<h2 className="gs-settings-h2"><AlertTriangle size={16} strokeWidth={1.5} /> Account actions</h2>
			<p className="gs-settings-intro">Leaving the network preserves attribution. Published work stays attributed to your Ghost handle unless you request removal where permitted.</p>

			<div className="callout gs-attribution-note">
				<strong>Account closed; published work remains attributed to the Ghost handle</strong> unless the author requests removal where permitted. This keeps research, detections, and tools from losing attribution or breaking links.
			</div>

			<div className="gs-settings-form">
				<h3 className="gs-settings-h3"><PauseCircle size={14} strokeWidth={1.5} /> Deactivate profile</h3>
				<p className="gs-settings-note">Hides your public profile. Your published contributions remain attributed to your handle. Reauthentication required.</p>
				{!confirm ? (
					<button className="button button-outline" type="button" onClick={() => setConfirm(true)} disabled={busy}>Deactivate my profile</button>
				) : (
					<form onSubmit={deactivate}>
						<div className="field"><label htmlFor="del-pw">Current password</label><input id="del-pw" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" /></div>
						<div className="item-actions">
							<button className="button button-light" type="submit" disabled={busy}>{busy ? 'Deactivating…' : 'Confirm deactivation'}</button>
							<button type="button" className="button button-outline" onClick={() => { setConfirm(false); setCurrent(''); }} disabled={busy}>Cancel</button>
						</div>
					</form>
				)}
			</div>

			<div className="gs-settings-form">
				<h3 className="gs-settings-h3"><Trash2 size={14} strokeWidth={1.5} /> Request account deletion</h3>
				<p className="gs-settings-note">Full deletion is reviewed by moderators. Transfer project ownership first if you maintain any projects, then request deletion. Published work attribution is preserved unless you ask for removal.</p>
				<button className="button button-outline" type="button" onClick={requestDeletion} disabled={busy}>{busy ? 'Submitting…' : 'Request deletion'}</button>
			</div>

			<div className="gs-settings-form">
				<h3 className="gs-settings-h3"><LogOut size={14} strokeWidth={1.5} /> Sign out</h3>
				<button className="button button-outline" type="button" onClick={() => { onSignOut(); window.location.href = '/login'; }}>Sign out of Ghost Space</button>
			</div>

			{err && <div className="status-message error-message" role="alert">{err}</div>}
			{msg && <div className="status-message" role="status">{msg}</div>}
		</section>
	);
}

/* ------------------------------ shared ------------------------------ */

function ToggleRow({ label, desc, checked, onChange, locked }: { label: string; desc: string; checked: boolean; onChange: () => void; locked?: boolean }) {
	return (
		<label className={`gs-toggle-row ${locked ? 'locked' : ''}`}>
			<span className="gs-toggle-info">
				<span className="gs-toggle-label">{label}{locked && <Lock size={11} strokeWidth={1.5} className="gs-toggle-lock" />}</span>
				<span className="gs-toggle-desc">{desc}</span>
			</span>
			<span className="gs-toggle">
				<input type="checkbox" checked={checked} disabled={locked} onChange={onChange} />
				<span className="gs-toggle-track" aria-hidden="true"><span className="gs-toggle-thumb" /></span>
			</span>
		</label>
	);
}

function NoProfile() {
	return (
		<section className="gs-settings-section">
			<h2 className="gs-settings-h2">No profile yet</h2>
			<p className="muted-note">You need a Ghost profile to manage these settings.</p>
			<Link to="/join" className="button button-light" style={{ marginTop: 16 }}>Create my profile ↗</Link>
		</section>
	);
}
