import { useEffect, useState } from 'react';
import { Mail, ShieldCheck, Save } from 'lucide-react';
import { pocketbaseClient as pb } from '@/lib/pocketbase-client';
import { EMAIL_PREFERENCES, DEFAULT_PREFERENCES, type PreferenceKey } from '@/data/notifications';

export interface NotificationPreferences {
	id: string;
	owner: string;
	email_contribution_reviews: boolean;
	email_project_invitations: boolean;
	email_table_talks: boolean;
	email_collaboration_requests: boolean;
	email_security_events: boolean;
	email_moderation_notices: boolean;
	inapp_mentions: boolean;
	inapp_system: boolean;
}

function toBool(v: unknown): boolean {
	return v === true || v === 'true';
}

/**
 * Email notification preferences. Each channel can be toggled except security
 * events, which are always on (shown disabled) because security-critical
 * notices must always reach the member. The single preferences row is
 * upserted on first save.
 */
export function NotificationPreferences({ ownerId }: { ownerId: string }) {
	const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);
	const [error, setError] = useState('');

	useEffect(() => {
		let active = true;
		pb.collection('ghost_notification_preferences')
			.getFirstListItem<NotificationPreferences>(pb.filter('owner = {:id}', { id: ownerId }), { requestKey: null })
			.then((rec) => { if (active) setPrefs(normalize(rec)); })
			.catch(() => {
				// No preferences row yet — start from defaults; created on first save.
				if (active) setPrefs({ id: '', owner: ownerId, ...DEFAULT_PREFERENCES, inapp_mentions: true, inapp_system: true });
			});
		return () => { active = false; };
	}, [ownerId]);

	function toggle(key: PreferenceKey) {
		if (!prefs) return;
		setPrefs({ ...prefs, [key]: !prefs[key] });
		setSaved(false);
	}

	async function save() {
		if (!prefs) return;
		setSaving(true);
		setError('');
		try {
			const payload = {
				owner: ownerId,
				email_contribution_reviews: prefs.email_contribution_reviews,
				email_project_invitations: prefs.email_project_invitations,
				email_table_talks: prefs.email_table_talks,
				email_collaboration_requests: prefs.email_collaboration_requests,
				email_security_events: true, // always on
				email_moderation_notices: prefs.email_moderation_notices,
				inapp_mentions: prefs.inapp_mentions,
				inapp_system: prefs.inapp_system,
			};
			let rec: NotificationPreferences;
			if (prefs.id) {
				rec = await pb.collection('ghost_notification_preferences').update<NotificationPreferences>(prefs.id, payload);
			} else {
				rec = await pb.collection('ghost_notification_preferences').create<NotificationPreferences>(payload);
			}
			setPrefs(normalize(rec));
			setSaved(true);
		} catch {
			setError('Could not save preferences. Try again.');
		} finally {
			setSaving(false);
		}
	}

	return (
		<section className="gs-prefs">
			<div className="gs-prefs-head">
				<h2><Mail size={16} strokeWidth={1.5} /> Notification preferences</h2>
				<p>Choose which events reach your inbox. Security events are always on and cannot be suppressed.</p>
			</div>
			{error && <div className="status-message error-message" role="alert">{error}</div>}
			<ul className="gs-prefs-list">
				{EMAIL_PREFERENCES.map((pref) => {
					const value = prefs ? prefs[pref.key] : DEFAULT_PREFERENCES[pref.key];
					return (
						<li key={pref.key} className={`gs-pref-row ${pref.locked ? 'locked' : ''}`}>
							<div className="gs-pref-info">
								<span className="gs-pref-label">
									{pref.label}
									{pref.locked && <ShieldCheck size={13} strokeWidth={1.5} className="gs-pref-lock" />}
								</span>
								<span className="gs-pref-desc">{pref.description}</span>
							</div>
							<label className="gs-toggle">
								<input
									type="checkbox"
									checked={value}
									disabled={pref.locked}
									onChange={() => toggle(pref.key)}
								/>
								<span className="gs-toggle-track" aria-hidden="true"><span className="gs-toggle-thumb" /></span>
							</label>
						</li>
					);
				})}
			</ul>
			<div className="gs-prefs-foot">
				<button type="button" className="button button-light" onClick={save} disabled={saving || !prefs}>
					<Save size={14} strokeWidth={1.5} /> {saving ? 'Saving…' : 'Save preferences'}
				</button>
				{saved && <span className="gs-prefs-saved">Saved.</span>}
			</div>
			<p className="sample-note">No engagement emails are ever sent — no profile views, likes, follower activity, popularity, or streaks. Only actions that require attention or matter to your work.</p>
		</section>
	);
}

function normalize(rec: NotificationPreferences): NotificationPreferences {
	return {
		...rec,
		email_contribution_reviews: toBool(rec.email_contribution_reviews),
		email_project_invitations: toBool(rec.email_project_invitations),
		email_table_talks: toBool(rec.email_table_talks),
		email_collaboration_requests: toBool(rec.email_collaboration_requests),
		email_security_events: toBool(rec.email_security_events),
		email_moderation_notices: toBool(rec.email_moderation_notices),
		inapp_mentions: toBool(rec.inapp_mentions),
		inapp_system: toBool(rec.inapp_system),
	};
}
