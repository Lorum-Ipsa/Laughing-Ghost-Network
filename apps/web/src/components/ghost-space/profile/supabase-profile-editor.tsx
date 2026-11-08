import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Eye, Save, X } from 'lucide-react';
import type { GhostIdentity } from '@/lib/supabase-ghost-profile';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { SPECIALTY_GROUPS } from '@/data/specialties';
import { SKILL_OPTIONS, TOOL_OPTIONS, PLATFORM_OPTIONS, INDUSTRY_OPTIONS, LANGUAGE_NAMES } from '@/data/taxonomy';
import { CONTENT_LANGUAGES } from '@/lib/languages';
import { TagInput } from '@/components/ghost-space/profile/tag-input';
import { TemplateGhost } from '@/components/ghost-avatar';
import { AVATAR_PRESETS, encodeTemplate, resolveTemplate } from '@/lib/ghost-avatar';
import { locationDisplay, tagsOf, safeExternal, parseExternalLinks } from '@/lib/network';

type Props = { profile: GhostIdentity; onSaved: (updated: GhostIdentity) => void };
const PUBLIC_FIELDS = 'id,handle,display_name,pronouns,bio,specialties,developing_specialties,portfolio,location_disclosure,location_country,skills,tools,platform,industry,languages,language,available_for_work,open_to_collaboration,open_to_research,open_to_mentorship,open_to_speaking,collaboration_interests,external_links,avatar_template,featured_work,created_at,updated_at' as const;
type Editable = Pick<GhostIdentity,
  'display_name'|'pronouns'|'bio'|'specialties'|'developing_specialties'|
  'skills'|'tools'|'platform'|'industry'|'language'|'languages'|
  'location_disclosure'|'location_country'|'portfolio'|'external_links'|
  'avatar_template'|'available_for_work'|'open_to_collaboration'|
  'open_to_research'|'open_to_mentorship'|'open_to_speaking'|'collaboration_interests'
>;
const editable = (p: GhostIdentity): Editable => ({
  display_name: p.display_name, pronouns: p.pronouns, bio: p.bio,
  specialties: p.specialties, developing_specialties: p.developing_specialties,
  skills: p.skills, tools: p.tools, platform: p.platform, industry: p.industry,
  language: p.language, languages: p.languages,
  location_disclosure: p.location_disclosure, location_country: p.location_country,
  portfolio: p.portfolio, external_links: p.external_links, avatar_template: p.avatar_template,
  available_for_work: p.available_for_work, open_to_collaboration: p.open_to_collaboration,
  open_to_research: p.open_to_research, open_to_mentorship: p.open_to_mentorship,
  open_to_speaking: p.open_to_speaking, collaboration_interests: p.collaboration_interests,
});
const FIELD_LIMITS: Record<string,number> = {
  display_name:100, pronouns:40, bio:2000,
  specialties:250, developing_specialties:250,
  skills:1000,tools:1000,platform:1000,industry:1000,
  language:30,languages:500,location_country:100,
  portfolio:2048,external_links:2000,avatar_template:150,
  collaboration_interests:1000,
};
function normalizeUrl(text: string): string {
  const trimmed=text.trim();
  if (!trimmed) return '';
  const url=new URL(trimmed);
  if (url.protocol !== 'https:') throw new Error('Use an HTTPS address for your portfolio and external links.');
  return url.toString();
}
function validate(draft: Editable): Editable {
  const next = { ...draft };
  for (const [key, limit] of Object.entries(FIELD_LIMITS)) {
    const value = next[key as keyof Editable];
    if (typeof value==='string' && value.length > limit) {
      throw new Error('A field is too long ('+key.replaceAll('_',' ')+'). Maximum: '+limit+' characters.');
    }
  }
  if (!['undisclosed','remote','country'].includes(next.location_disclosure)) {
    throw new Error('Choose a valid location disclosure.');
  }
  next.location_country = next.location_disclosure === 'country' ? next.location_country.trim() : '';
  if (next.portfolio.trim()) next.portfolio=normalizeUrl(next.portfolio);
  for (const line of next.external_links.split('\n').map(x=>x.trim()).filter(Boolean)) {
    const at=line.indexOf(': ');
    if (at<1) throw new Error('External links must use "Platform: https://…" on each line.');
    normalizeUrl(line.slice(at+2));
  }
  return next;
}
function PillTags({ value }: {value:string}) {
  return <div className="tags">{tagsOf(value).map(tag=><span key={tag}>{tag}</span>)}</div>;
}
function Preview({ draft, handle, onClose }: {draft: Editable; handle:string; onClose:()=>void}) {
  const availability=[
    draft.available_for_work&&'Available for work',
    draft.open_to_collaboration&&'Collaboration',
    draft.open_to_research&&'Research',
    draft.open_to_mentorship&&'Mentorship',
    draft.open_to_speaking&&'Speaking',
  ].filter(Boolean);
  const links=parseExternalLinks(draft.external_links);
  return <div className="gs-overlay" role="dialog" aria-modal="true" aria-label="Preview public Ghost profile">
    <div className="gs-overlay-panel gs-preview">
      <header className="gs-overlay-head">
        <div><span className="eyebrow"><span className="tiny-dot"/> PROFILE PREVIEW</span>
          <h2>Public Ghost identity</h2></div>
        <button className="gs-overlay-close" type="button" aria-label="Close profile preview" onClick={onClose}>
          <X size={18} />
        </button>
      </header>
      <div className="callout">This is a preview of the public details in your current draft. Unsaved changes are not visible to other visitors. The actual published profile will be updated only when you save.</div>
      <div className="form-panel">
      <div style={{display:'flex',alignItems:'center',gap:20}}>
        <TemplateGhost template={resolveTemplate({handle,avatar_template:draft.avatar_template})} size={96}/>
        <div><span className="eyebrow">GHOST IDENTITY</span><h2>{draft.display_name||handle}</h2><p className="muted-note">@{handle} {draft.pronouns&&'· '+draft.pronouns}</p></div>
      </div>
      {draft.bio&&<p style={{whiteSpace:'pre-wrap'}}>{draft.bio}</p>}
      <p>{locationDisplay(draft)}</p>
      <PillTags value={draft.specialties}/>
      <p><strong>Developing</strong></p><PillTags value={draft.developing_specialties}/>
      <p><strong>Skills and tools</strong></p>
      <PillTags value={[draft.skills,draft.tools,draft.platform,draft.industry].filter(Boolean).join(', ')}/>
      {draft.languages&&<p><strong>Working languages:</strong> {draft.languages}</p>}
      {availability.length>0&&<p><strong>Open to:</strong> {availability.join(', ')}</p>}
      {draft.collaboration_interests&&<p><strong>Looking for:</strong> {draft.collaboration_interests}</p>}
      {draft.portfolio&&safeExternal(draft.portfolio)&&<p><a href={draft.portfolio} target="_blank" rel="noreferrer">Public portfolio</a></p>}
      {links.length>0&&<div>{links.map(l=><p key={l.platform+l.url}><a href={l.url} target="_blank" rel="noreferrer">{l.platform}</a></p>)}</div>}
      </div>
      <div className="gs-builder-actions">
        <button className="button button-outline" type="button" onClick={onClose}><X size={14}/> Return to editor</button>
      </div>
    </div>
  </div>;
}
export function SupabaseProfileEditor({ profile, onSaved }: Props) {
  const [draft,setDraft]=useState<Editable>(()=>editable(profile));
  const [preview,setPreview]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [saved,setSaved]=useState(false);
  useEffect(()=>{
    setDraft(editable(profile));setPreview(false);setError('');setSaved(false);
  },[profile.id,profile.updated_at]);
  useEffect(() => {
    if (!preview) return;
    function onEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setPreview(false);
    }
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [preview]);
  const dirty=useMemo(()=>JSON.stringify(editable(profile))!==JSON.stringify(draft),[draft,profile]);
  function set<K extends keyof Editable>(field:K,value:Editable[K]) {
    setDraft(prev=>({...prev,[field]:value}));setSaved(false);
  }
  function toggle(field:'specialties'|'developing_specialties',value:string) {
    const values=tagsOf(draft[field]);
    set(field,(values.includes(value)?values.filter(v=>v!==value):[...values,value]).join(', '));
  }
  function cancel(){setDraft(editable(profile));setError('');setSaved(false);setPreview(false);}
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();if(busy||!dirty)return;
    setBusy(true);setError('');setSaved(false);
    try{
      const payload=validate(draft);
      const {data,error:dbError}=await supabaseBrowser().from('ghost_profiles')
        .update(payload).eq('id',profile.id).eq('updated_at',profile.updated_at)
        .select(PUBLIC_FIELDS).maybeSingle();
      if(dbError)throw dbError;
      if(!data)throw new Error('Your profile changed or your account cannot edit it. Refresh Ghost Space and try again.');
      onSaved(data as GhostIdentity);setSaved(true);setPreview(false);
    }catch(e){setError(e instanceof Error?e.message:'Could not save your Ghost profile.');}
    finally{setBusy(false);}
  }
  return <div className="gs-profile-workspace">
    <header className="gs-section-head">
      <div><span className="eyebrow"><span className="tiny-dot"/> GHOST SPACE / MY PROFILE</span>
        <h1>My profile.</h1>
        <p className="gs-section-lede">Build your pseudonymous identity, choose what to share, and preview your public details before saving. Your email and legal name are never required in your public Ghost profile.</p></div>
      <div className="gs-profile-actions">
        <button className="gs-card-action" type="button" onClick={()=>setPreview(!preview)}>
          <Eye size={14}/>{preview?' Return to editor':' Preview public details'}</button>
      </div>
    </header>
    <form className="gs-profile-builder" onSubmit={submit}>
      <section className="gs-builder-section"><h2 className="gs-builder-h2">Identity</h2>
        <div className="gs-builder-grid">
          <div className="field"><label htmlFor="pf-handle">Persistent handle</label>
            <input id="pf-handle" value={profile.handle} readOnly/><small>Handle changes require moderation and cannot be made here.</small></div>
          <div className="field"><label htmlFor="pf-name">Display name (optional)</label>
            <input id="pf-name" value={draft.display_name} onChange={e=>set('display_name',e.target.value)} maxLength={100}/></div>
          <div className="field"><label htmlFor="pf-pronouns">Pronouns (optional)</label>
            <input id="pf-pronouns" value={draft.pronouns} onChange={e=>set('pronouns',e.target.value)} maxLength={40}/></div>
          <div className="field gs-builder-span2"><label htmlFor="pf-bio">Public bio</label>
            <textarea id="pf-bio" rows={5} maxLength={2000} value={draft.bio} onChange={e=>set('bio',e.target.value)}/></div>
        </div>
      </section>
      <section className="gs-builder-section"><h2 className="gs-builder-h2">Avatar — choose your Ghost</h2>
        <div className="callout">Choose an LGN Ghost template; no personal photograph is necessary. Custom file uploads will be enabled after the private storage and visibility controls are audited.</div>
        <div className="gs-avatar-picker">
          <div className="gs-avatar-preview"><TemplateGhost template={resolveTemplate({handle:profile.handle,avatar_template:draft.avatar_template})} size={128}/><span className="mono">@{profile.handle}</span></div>
          <div className="gs-avatar-side"><div className="gs-avatar-presets">
            {AVATAR_PRESETS.map(preset=><button key={preset.name} type="button"
              className={draft.avatar_template===encodeTemplate(preset.template)?'gs-avatar-preset active':'gs-avatar-preset'}
              onClick={()=>set('avatar_template',encodeTemplate(preset.template))}>
              <TemplateGhost template={preset.template} size={56}/><span>{preset.name}</span></button>)}
            </div><button className="gs-card-action" type="button" onClick={()=>set('avatar_template','')}>Use handle-based default</button></div>
        </div>
      </section>
      <section className="gs-builder-section"><h2 className="gs-builder-h2">Practice</h2>
        {(['specialties','developing_specialties'] as const).map(field=><div className="field" key={field}>
          <label>{field==='specialties'?'Specialties — what you practice':'Developing — areas you are learning'}</label>
          <div className="specialty-picker">
            {SPECIALTY_GROUPS.map(group=><fieldset className="specialty-group" key={group.name}>
              <legend>{group.name}</legend><div className="specialty-options">
                {group.specialties.map(s=><label className="specialty-option" key={s}>
                  <input type="checkbox" checked={tagsOf(draft[field]).includes(s)} onChange={()=>toggle(field,s)}/><span>{s}</span>
                </label>)}
              </div></fieldset>)}
          </div><small>Each selection list has a 250-character storage limit.</small>
        </div>)}
        {([
          ['skills','Skills',SKILL_OPTIONS,1000],
          ['tools','Tools / technologies',TOOL_OPTIONS,1000],
          ['platform','Platforms / environments',PLATFORM_OPTIONS,1000],
          ['industry','Industries / domains',INDUSTRY_OPTIONS,1000]
        ] as const).map(([field,label,suggestions,limit])=><div key={field}>
          <TagInput label={label} suggestions={suggestions} selected={tagsOf(draft[field])}
            onChange={items=>set(field,items.join(', '))} hint={'Public profile; '+limit+' characters maximum.'}/>
        </div>)}
      </section>
      <section className="gs-builder-section"><h2 className="gs-builder-h2">Languages</h2>
        <div className="field"><label htmlFor="pf-language">Preferred original publication language</label>
          <select id="pf-language" value={draft.language} onChange={e=>set('language',e.target.value)}>
            {CONTENT_LANGUAGES.map(l=><option key={l.code} value={l.code}>{l.native} ({l.code})</option>)}
          </select><small>Original language remains authoritative; translations are a separate service.</small></div>
        <TagInput label="Working languages" suggestions={LANGUAGE_NAMES} selected={tagsOf(draft.languages)}
          onChange={items=>set('languages',items.join(', '))}
          hint="Working languages are public when saved. Remove any language you do not want visible."/>
      </section>
      <section className="gs-builder-section"><h2 className="gs-builder-h2">Location</h2>
        <div className="callout">Only the country can be shared. Your precise location is never collected here.</div>
        <div className="gs-builder-grid">
          <div className="field"><label htmlFor="pf-disclosure">Location disclosure</label>
            <select id="pf-disclosure" value={draft.location_disclosure} onChange={e=>set('location_disclosure',e.target.value)}>
              <option value="undisclosed">Undisclosed</option><option value="remote">Remote</option><option value="country">Country only</option>
            </select></div>
          {draft.location_disclosure==='country'&&<div className="field">
            <label htmlFor="pf-country">Country</label>
            <input id="pf-country" maxLength={100} value={draft.location_country} onChange={e=>set('location_country',e.target.value)} placeholder="Romania, United States, Japan…"/></div>}
        </div>
      </section>
      <section className="gs-builder-section"><h2 className="gs-builder-h2">Availability</h2>
        {([
          ['available_for_work','Available for work'],
          ['open_to_collaboration','Open to collaboration'],
          ['open_to_research','Open to research'],
          ['open_to_mentorship','Open to mentorship'],
          ['open_to_speaking','Open to speaking']
        ] as const).map(([field,label])=><label key={field} className="gs-toggle-row">
          <span className="gs-toggle-info"><span className="gs-toggle-label">{label}</span></span>
          <input type="checkbox" checked={draft[field]} onChange={e=>set(field,e.target.checked)}/>
        </label>)}
        <div className="field"><label htmlFor="pf-interests">Collaboration interests</label>
          <textarea id="pf-interests" maxLength={1000} rows={3} value={draft.collaboration_interests}
            onChange={e=>set('collaboration_interests',e.target.value)}/></div>
      </section>
      <section className="gs-builder-section"><h2 className="gs-builder-h2">External identities</h2>
        <div className="callout">Links saved here are publicly readable. Do not add a personal account you want to keep hidden. Platform links are self-declared and are not independently verified by LGN yet.</div>
        <div className="field"><label htmlFor="pf-external">Platform links</label>
          <textarea id="pf-external" rows={4} maxLength={2000} value={draft.external_links}
            placeholder={'GitHub: https://github.com/yourhandle\nORCID: https://orcid.org/your-id'}
            onChange={e=>set('external_links',e.target.value)}/>
          <small>One per line, in the format “Platform: https://…”.</small></div>
        <div className="field"><label htmlFor="pf-portfolio">Public portfolio URL</label>
          <input id="pf-portfolio" type="url" maxLength={2048} value={draft.portfolio}
            placeholder="https://…" onChange={e=>set('portfolio',e.target.value)}/></div>
      </section>
      <section className="gs-builder-section"><h2 className="gs-builder-h2">Visibility summary</h2>
        <p>All values in this public editor are visible once saved. Your email and ownership ID remain private in Supabase. Field-specific hiding without deleting a public value requires a separate private-storage migration.</p>
        <ul className="gs-visibility-summary">
          <li><strong>Location</strong> — {locationDisplay(draft)}</li>
          <li><strong>Working languages</strong> — {draft.languages?'Public':'Not provided'}</li>
          <li><strong>External links</strong> — {draft.external_links?'Public':'Not provided'}</li>
        </ul>
      </section>
      {error&&<p className="status-message error-message" role="alert">{error}</p>}
      {saved&&<p className="status-message" role="status">Public profile saved. Refresh to confirm the persisted fields.</p>}
      <div className="gs-builder-actions">
        <button className="button button-light" type="submit" disabled={busy||!dirty}>
          <Save size={14}/>{busy?'Saving…':'Save changes'}</button>
        <button className="button button-outline" type="button" onClick={cancel} disabled={busy||!dirty}>
          <X size={14}/>Cancel</button>
        <button className="gs-card-action" type="button" onClick={()=>setPreview(!preview)}>
          <Eye size={14}/>Preview public details</button>
      </div>
    </form>
    {preview&&<Preview draft={draft} handle={profile.handle} onClose={()=>setPreview(false)}/>}
  </div>;
}
