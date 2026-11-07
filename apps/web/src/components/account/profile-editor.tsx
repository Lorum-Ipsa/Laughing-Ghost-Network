import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router';
import { pocketbaseClient as pb } from '@/lib/pocketbase-client';
import type { GhostProfile, Work } from '@/lib/network';
import { tagsOf, kindLabels, LOCATION_DISCLOSURES, normalizeDisclosure, type LocationDisclosure } from '@/lib/network';
import { CONTENT_LANGUAGES } from '@/lib/languages';
import { SPECIALTY_GROUPS } from '@/data/specialties';
import { SKILL_OPTIONS, TOOL_OPTIONS, PLATFORM_OPTIONS, INDUSTRY_OPTIONS, LANGUAGE_NAMES } from '@/data/taxonomy';
import { useI18n } from '@/lib/i18n';

export function ProfileEditor({ profile, work, onSaved }: { profile: GhostProfile | null; work: Work[]; onSaved: (profile: GhostProfile) => void }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(profile ? tagsOf(profile.specialties) : []));
  const [developingSelected, setDevelopingSelected] = useState<Set<string>>(() => new Set(profile ? tagsOf(profile.developing_specialties) : []));
  const [featured, setFeatured] = useState<Set<string>>(() => new Set(profile ? tagsOf(profile.featured_work || '') : []));
  const [disclosure, setDisclosure] = useState<LocationDisclosure>(normalizeDisclosure(profile?.location_disclosure));
  const published = work.filter((w) => w.status === 'published');

  function toggleSpecialty(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }

  function toggleDeveloping(name: string) {
    setDevelopingSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }

  function toggleFeatured(id: string) {
    setFeatured((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    setBusy(true); setError(''); setSaved(false);
    const data = new FormData(event.currentTarget);
    try {
      const record = await pb.collection('ghost_profiles').update<GhostProfile>(profile.id, {
        specialties: [...selected].join(', '),
        developing_specialties: [...developingSelected].join(', '),
        skills: data.get('skills') || '',
        tools: data.get('tools') || '',
        platform: data.get('platform') || '',
        industry: data.get('industry') || '',
        location_disclosure: disclosure,
        location_country: data.get('location_country') || '',
        location_region: data.get('location_region') || '',
        location_city: data.get('location_city') || '',
        languages: data.get('languages') || '',
        bio: data.get('bio') || '',
        portfolio: data.get('portfolio') || '',
        language: data.get('language') || '',
        available_for_work: data.get('available_for_work') === 'on',
        open_to_collaboration: data.get('open_to_collaboration') === 'on',
        open_to_research: data.get('open_to_research') === 'on',
        open_to_mentorship: data.get('open_to_mentorship') === 'on',
        open_to_speaking: data.get('open_to_speaking') === 'on',
        collaboration_interests: data.get('collaboration_interests') || '',
        external_links: data.get('external_links') || '',
        featured_work: [...featured].join(', '),
      });
      onSaved(record); setSaved(true);
    } catch {
      setError('The profile could not be updated. Check the fields and the portfolio link.');
    } finally { setBusy(false); }
  }

  if (!profile) return <div className="dashboard-panel"><h2>Your public profile</h2><p className="muted-note">You don't have a pseudonymous profile yet.</p><Link to="/join" className="button button-light" style={{ marginTop: 20 }}>Create my profile ↗</Link></div>;

  return (
    <form className="dashboard-panel" onSubmit={submit}>
      <h2>Your public profile</h2>
      <div className="callout" style={{ marginBottom: 25 }}>This information is visible to everyone. Do not add a civil identity, private email address, or sensitive data.</div>
      <div className="field"><label htmlFor="profile-handle">Persistent handle</label><input id="profile-handle" readOnly value={profile.handle} /></div>
      <div className="field">
        <label>Specialties and interests <small style={{ color: 'hsl(var(--muted-foreground))' }}>— what you practice</small></label>
        <div className="specialty-picker">
          {SPECIALTY_GROUPS.map((group) => (
            <fieldset key={group.name} className="specialty-group">
              <legend>{group.name}</legend>
              <div className="specialty-options">
                {group.specialties.map((s) => (
                  <label key={s} className="specialty-option">
                    <input type="checkbox" checked={selected.has(s)} onChange={() => toggleSpecialty(s)} />
                    <span>{s}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      </div>
      <div className="field">
        <label>Developing <small style={{ color: 'hsl(var(--muted-foreground))' }}>— areas you are learning or growing into</small></label>
        <div className="specialty-picker">
          {SPECIALTY_GROUPS.map((group) => (
            <fieldset key={group.name} className="specialty-group">
              <legend>{group.name}</legend>
              <div className="specialty-options">
                {group.specialties.map((s) => (
                  <label key={s} className="specialty-option">
                    <input type="checkbox" checked={developingSelected.has(s)} onChange={() => toggleDeveloping(s)} />
                    <span>{s}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
        <small>Separating practice from developing is more truthful than forcing everyone to claim expertise.</small>
      </div>
      <div className="field"><label htmlFor="profile-skills">Skills</label><input id="profile-skills" name="skills" defaultValue={profile.skills} maxLength={500} list="taxonomy-skills" placeholder="Windows, Sigma, KQL, EDR" /><small>Separate skills with commas. Suggestions cover methods, frameworks, languages, and analysis techniques — any value is accepted.</small></div>
      <div className="field"><label htmlFor="profile-tools">Tools / Technologies</label><input id="profile-tools" name="tools" defaultValue={profile.tools} maxLength={500} list="taxonomy-tools" placeholder="Sysmon, Splunk, Sigma, ELK" /><small>Separate tools with commas. Use “Custom” for bespoke or self-built tooling. Any tool is accepted.</small></div>
      <div className="field"><label htmlFor="profile-platform">Platform / Environment</label><input id="profile-platform" name="platform" defaultValue={profile.platform} maxLength={300} list="taxonomy-platforms" placeholder="Windows, Linux, Cloud" /><small>Separate platforms with commas.</small></div>
      <div className="field"><label htmlFor="profile-industry">Industry / Domain</label><input id="profile-industry" name="industry" defaultValue={profile.industry} maxLength={300} list="taxonomy-industries" placeholder="Healthcare, Finance, Telecom" /><small>Separate industries with commas.</small></div>
      <div className="field"><label htmlFor="profile-location">Location disclosure</label><select id="profile-location" name="location_disclosure" value={disclosure} onChange={(e) => setDisclosure(e.target.value as LocationDisclosure)}>{LOCATION_DISCLOSURES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select><small>Ghosts control their location disclosure. Country is sufficient. Choose “Remote” or “Undisclosed” to reveal nothing.</small></div>
      {disclosure === 'country' && <div className="field"><label htmlFor="profile-country">Country</label><input id="profile-country" name="location_country" defaultValue={profile.location_country} maxLength={100} placeholder="Germany, Romania, United States, Japan…" /></div>}
      <div className="field"><label htmlFor="profile-languages">Working languages</label><input id="profile-languages" name="languages" defaultValue={profile.languages} maxLength={300} list="taxonomy-languages" placeholder="English, Romanian" /><small>Languages you work in, shown on your directory card.</small></div>
      <div className="field"><label htmlFor="profile-bio">Public bio</label><textarea id="profile-bio" name="bio" defaultValue={profile.bio} maxLength={2000} /></div>
      <div className="field"><label htmlFor="profile-language">{t('profile.language')}</label><select id="profile-language" name="language" defaultValue={profile.language || 'en'}>{CONTENT_LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.native}{l.code !== 'other' ? ` (${l.code.toUpperCase()})` : ''}</option>)}</select></div>
      <div className="field"><label htmlFor="profile-portfolio">Public external portfolio</label><input id="profile-portfolio" name="portfolio" type="url" defaultValue={profile.portfolio} placeholder="https://…" /></div>
      <div className="checkbox-field"><input type="checkbox" name="available_for_work" defaultChecked={profile.available_for_work || false} /><span>Available for work</span></div>
      <div className="checkbox-field"><input type="checkbox" name="open_to_collaboration" defaultChecked={profile.open_to_collaboration || false} /><span>Open to collaboration</span></div>
      <div className="checkbox-field"><input type="checkbox" name="open_to_research" defaultChecked={profile.open_to_research || false} /><span>Open to research</span></div>
      <div className="checkbox-field"><input type="checkbox" name="open_to_mentorship" defaultChecked={profile.open_to_mentorship || false} /><span>Open to mentorship</span></div>
      <div className="checkbox-field"><input type="checkbox" name="open_to_speaking" defaultChecked={profile.open_to_speaking || false} /><span>Open to speaking (talks, panels, podcasts)</span></div>
      <div className="field"><label htmlFor="profile-interests">Collaboration interests</label><textarea id="profile-interests" name="collaboration_interests" defaultValue={profile.collaboration_interests} maxLength={1000} placeholder="Malware research collaboration, DFIR projects, Open-source tooling, Table Talks, Conference talks" /><small>What you want to do next. Separate interests with commas — shown on your profile as “Looking for”.</small></div>
      <div className="field"><label htmlFor="profile-external">External verified identities</label><textarea id="profile-external" name="external_links" defaultValue={profile.external_links} maxLength={2000} placeholder={'GitHub: https://github.com/yourhandle\nHack The Box: https://app.hackthebox.com/profile/yourhandle\nORCID: https://orcid.org/0000-0000-0000-0000'} /><small>One per line as “Platform: https://…”. These verify platform ownership, not legal identity.</small></div>
      {published.length > 0 && (
        <div className="field">
          <label>Featured work <small style={{ color: 'hsl(var(--muted-foreground))' }}>— choose what visitors see first</small></label>
          <div className="featured-picker">
            {published.map((w) => (
              <label key={w.id} className="featured-option">
                <input type="checkbox" checked={featured.has(w.id)} onChange={() => toggleFeatured(w.id)} />
                <span className="featured-option-title">{w.title}</span>
                <span className="featured-option-kind">{kindLabels[w.kind]}</span>
              </label>
            ))}
          </div>
          <small>Selected work appears in a Featured section above your proofs of work.</small>
        </div>
      )}
      {error && <div className="status-message error-message" role="alert">{error}</div>}
      {saved && <div className="status-message" role="status">Your public profile has been updated.</div>}
      <div className="item-actions">
        <button className="button button-light" disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</button>
        <Link to={`/ghosts/${profile.handle}`}>View my public profile ↗</Link>
      </div>
      <datalist id="taxonomy-skills">{SKILL_OPTIONS.map((s) => <option key={s} value={s} />)}</datalist>
      <datalist id="taxonomy-tools">{TOOL_OPTIONS.map((s) => <option key={s} value={s} />)}</datalist>
      <datalist id="taxonomy-platforms">{PLATFORM_OPTIONS.map((s) => <option key={s} value={s} />)}</datalist>
      <datalist id="taxonomy-industries">{INDUSTRY_OPTIONS.map((s) => <option key={s} value={s} />)}</datalist>
      <datalist id="taxonomy-languages">{LANGUAGE_NAMES.map((s) => <option key={s} value={s} />)}</datalist>
    </form>
  );
}
