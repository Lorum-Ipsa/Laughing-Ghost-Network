import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Plus, FileText, Eye, Save, Send, Archive, Undo2, History, X, RefreshCcw } from 'lucide-react';
import { kindLabels, type WorkKind } from '@/lib/network';
import { CONTENT_LANGUAGES } from '@/lib/languages';
import type { GhostIdentity } from '@/lib/supabase-ghost-profile';
import type { Database } from '@/lib/supabase.database.types';
import { supabaseBrowser } from '@/lib/supabase-browser';

const FIELDS = 'id,profile_id,kind,title,language,domain,summary,body,tags,source_url,code,status,version,submitted_at,published_at,created_at,updated_at' as const;
const REVISION_FIELDS = 'id,contribution_id,version,title,summary,body,code,status,reason,created_at' as const;
type BaseRow = Database['public']['Tables']['ghost_contributions']['Row'];
export type GhostContribution = Omit<BaseRow,'owner_id'|'deleted_at'>;
type Revision = Omit<Database['public']['Tables']['ghost_contribution_revisions']['Row'],'owner_id'>;
type ReviewNote = Pick<Database['public']['Tables']['ghost_contribution_reviews']['Row'],
  'id'|'contribution_id'|'action'|'note'|'created_at'>;
type TriageSummary = Pick<Database['public']['Tables']['ghost_contribution_triage']['Row'],
  'contribution_id'|'version'|'recommendation'|'resolution'|'policy_version'>;
type Draft = Pick<GhostContribution,'kind'|'title'|'language'|'domain'|'summary'|'body'|'tags'|'source_url'|'code'>;
type WorkState = 'draft'|'submitted'|'revision_requested'|'rejected'|'published'|'archived';
type Tab = 'drafts'|'in_review'|'needs_revision'|'published'|'archived';
const TABS: {key:Tab;name:string;states:WorkState[]}[] = [
  {key:'drafts',name:'Drafts',states:['draft']},
  {key:'in_review',name:'In Review',states:['submitted']},
  {key:'needs_revision',name:'Needs Revision',states:['revision_requested','rejected']},
  {key:'published',name:'Published',states:['published']},
  {key:'archived',name:'Archived',states:['archived']},
];
const NEW_DRAFT:Draft={
  kind:'research',title:'',language:'en',domain:'',summary:'',body:'',tags:'',source_url:'',code:''
};
const KINDS=Object.entries(kindLabels).filter(([key])=>!['project','exercise'].includes(key)) as [WorkKind,string][];
function requestErrors(error:unknown):string {
  return error instanceof Error?error.message:'The request failed. Please try again.';
}
function validateDraft(draft:Draft,target:WorkState):Draft {
  const next={...draft,
    title:draft.title.trim(),summary:draft.summary.trim(),
    domain:draft.domain.trim(),tags:draft.tags.trim(),
    source_url:draft.source_url.trim()
  };
  if (!KINDS.some(([key])=>key===next.kind))throw new Error('Choose a supported contribution type.');
  const limits: [keyof Draft,number][] = [
    ['title',180],['language',30],['domain',250],['summary',500],
    ['body',50000],['tags',1500],['source_url',2048],['code',50000]
  ];
  for(const [field,n] of limits){if(next[field].length>n)throw new Error(field+' is over the '+n+' character limit.');}
  if (next.source_url) {
    const url=new URL(next.source_url);
    if(url.protocol!=='https:')throw new Error('Source link must use HTTPS.');
  }
  if (target==='submitted'){
    if (!next.title) throw new Error('Add a title before publishing.');
    if (![next.summary,next.body,next.code,next.source_url].some(value=>value.trim().length>0)){
      throw new Error('Add a summary, description, code, or a source link before publishing.');
    }
  }
  return next;
}
function Preview({item,onClose}:{item:GhostContribution,onClose:()=>void}) {
  return <div className="gs-overlay" role="dialog" aria-modal="true" aria-label="Contribution preview">
    <div className="gs-overlay-panel gs-preview">
      <header className="gs-overlay-head">
        <div><span className="eyebrow"><span className="tiny-dot"/> PREVIEW / ORIGINAL LANGUAGE</span>
          <h2>{item.title||'Untitled contribution'}</h2></div>
        <button type="button" className="gs-overlay-close" onClick={onClose} aria-label="Close preview"><X size={18}/></button>
      </header>
      <p>{kindLabels[item.kind as WorkKind]||item.kind} · {item.status} · version {item.version} · {item.language}</p>
      <p className="gs-preview-summary">{item.summary}</p>
      <div className="gs-preview-body" style={{whiteSpace:'pre-wrap'}}>{item.body}</div>
      {item.code&&<pre className="code-block" style={{whiteSpace:'pre-wrap'}}>{item.code}</pre>}
      {item.source_url&&<p><a href={item.source_url} target="_blank" rel="noreferrer">Open source reference</a></p>}
      {item.tags&&<p className="muted-note">Tags: {item.tags}</p>}
      {item.status!=='published'&&<p className="muted-note">This contribution is currently private.</p>}
    </div>
  </div>;
}
type Props={profile:GhostIdentity;userId:string};
export function SupabaseContributions({profile,userId}:Props) {
  const [items,setItems]=useState<GhostContribution[]>([]);
  const [reviewNotes,setReviewNotes]=useState<Record<string,ReviewNote>>({});
  const [triage,setTriage]=useState<Record<string,TriageSummary>>({});
  const [loading,setLoading]=useState(true);
  const [tab,setTab]=useState<Tab>('drafts');
  const [editing,setEditing]=useState<GhostContribution|null|undefined>(undefined);
  const [draft,setDraft]=useState<Draft>(NEW_DRAFT);
  const [preview,setPreview]=useState<GhostContribution|null>(null);
  const [revisionsFor,setRevisionsFor]=useState<GhostContribution|null>(null);
  const [revisions,setRevisions]=useState<Revision[]>([]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  useEffect(()=>{
    let alive=true;
    setLoading(true);setError('');
    void (async()=>{
      try {
        const api=supabaseBrowser();
        const {data,error:fetchError}=await api.from('ghost_contributions')
          .select(FIELDS).eq('profile_id',profile.id).order('updated_at',{ascending:false});
        if(fetchError)throw fetchError;
        if(!alive)return;
        setItems((data||[]) as GhostContribution[]);
        const ids=(data||[]).map(item=>item.id);
        if(ids.length){
          const {data:screenings,error:screeningError}=await api.from('ghost_contribution_triage')
            .select('contribution_id,version,recommendation,resolution,policy_version')
            .in('contribution_id',ids);
          if(screeningError)throw screeningError;
          const map:Record<string,TriageSummary>={};
          for(const entry of screenings||[])map[entry.contribution_id+':'+entry.version]=entry;
          if(alive)setTriage(map);
          const {data:notes,error:notesError}=await api.from('ghost_contribution_reviews')
            .select('id,contribution_id,action,note,created_at').in('contribution_id',ids)
            .order('created_at',{ascending:false});
          if(notesError)throw notesError;
          const latest:Record<string,ReviewNote>={};
          for(const note of notes||[]) if(!latest[note.contribution_id])latest[note.contribution_id]=note;
          if(alive)setReviewNotes(latest);
        } else {setReviewNotes({});setTriage({});}
      }catch(e){if(alive)setError(e instanceof Error?e.message:'Could not load contributions.');}
      finally{if(alive)setLoading(false);}
    })();
    return()=>{alive=false;};
  },[profile.id]);
  const counts=useMemo(()=>{
    const result={drafts:0,in_review:0,needs_revision:0,published:0,archived:0};
    for(const item of items){
      const entry=TABS.find(t=>t.states.includes(item.status as WorkState));
      if(entry)result[entry.key]++;
    }
    return result;
  },[items]);
  const shown=items.filter(item=>TABS.find(t=>t.key===tab)?.states.includes(item.status as WorkState));
  function begin(item?:GhostContribution) {
    setDraft(item?{
      kind:item.kind,title:item.title,language:item.language,domain:item.domain,summary:item.summary,
      body:item.body,tags:item.tags,source_url:item.source_url,code:item.code
    }:NEW_DRAFT);
    setEditing(item||null);
    setError('');setNotice('');
  }
  async function reload(){
    const {data,error}=await supabaseBrowser().from('ghost_contributions')
      .select(FIELDS).eq('profile_id',profile.id).order('updated_at',{ascending:false});
    if(error)throw error;
    setItems((data||[]) as GhostContribution[]);
    const ids=(data||[]).map(item=>item.id);
    if(!ids.length) {setReviewNotes({});setTriage({});return;}
    const {data:screenings,error:screeningError}=await supabaseBrowser().from('ghost_contribution_triage')
      .select('contribution_id,version,recommendation,resolution,policy_version').in('contribution_id',ids);
    if(screeningError)throw screeningError;
    const map:Record<string,TriageSummary>={};
    for(const entry of screenings||[])map[entry.contribution_id+':'+entry.version]=entry;
    setTriage(map);
    const {data:notes,error:notesError}=await supabaseBrowser().from('ghost_contribution_reviews')
      .select('id,contribution_id,action,note,created_at').in('contribution_id',ids)
      .order('created_at',{ascending:false});
    if(notesError)throw notesError;
    const latest:Record<string,ReviewNote>={};
    for(const note of notes||[]) if(!latest[note.contribution_id])latest[note.contribution_id]=note;
    setReviewNotes(latest);
  }
  async function save(target:'draft'|'submitted') {
    if(busy)return;
    setBusy(true);setError('');setNotice('');
    try {
      const checked=validateDraft(draft,target);
      if(editing===undefined)throw new Error('No active editor.');
      let savedStatus: string;
      if(editing) {
        if(editing.status==='published')throw new Error('Published work is locked pending the moderated revision workflow.');
        const {data,error}=await supabaseBrowser().from('ghost_contributions')
          .update({...checked,status:target})
          .eq('id',editing.id).eq('profile_id',profile.id)
          .eq('version',editing.version)
          .select(FIELDS).maybeSingle();
        if(error)throw error;
        if(!data)throw new Error('Work changed in another tab, or your account no longer has permission. Refresh before editing.');
        savedStatus=data.status;
      } else {
        const {data,error}=await supabaseBrowser().from('ghost_contributions').insert({
          owner_id:userId,profile_id:profile.id,...checked,status:target
        }).select('status').single();
        if(error)throw error;
        savedStatus=data.status;
      }
      await reload();
      setEditing(undefined);
      setTab(savedStatus==='published'?'published':savedStatus==='submitted'?'in_review':'drafts');
      setNotice(savedStatus==='published'?'Contribution published.':
        savedStatus==='submitted'?'Contribution held for review. Check In Review for details.':'Contribution draft saved.');
    } catch(e){setError(requestErrors(e));}finally{setBusy(false);}
  }
  async function transition(item:GhostContribution,target:'draft'|'archived') {
    if(busy)return;
    setBusy(true);setError('');setNotice('');
    try{
      const {data,error}=await supabaseBrowser().from('ghost_contributions')
        .update({status:target}).eq('id',item.id).eq('profile_id',profile.id).eq('version',item.version)
        .select(FIELDS).maybeSingle();
      if(error)throw error;
      if(!data)throw new Error('This contribution was changed or your account is not authorized. Reload.');
      await reload();
      setTab(target==='archived'?'archived':'drafts');
      setNotice(target==='archived'?'Contribution archived.':'Contribution returned to drafts.');
    } catch(e){setError(requestErrors(e));}finally{setBusy(false);}
  }
  async function showRevisions(item:GhostContribution) {
    setError('');setRevisionsFor(item);setRevisions([]);
    const {data,error}=await supabaseBrowser().from('ghost_contribution_revisions')
      .select(REVISION_FIELDS).eq('contribution_id',item.id).order('version',{ascending:false});
    if(error)setError(error.message);
    else setRevisions((data||[]) as Revision[]);
  }
  function editorField<K extends keyof Draft>(field:K,value:Draft[K]){
    setDraft(prev=>({...prev,[field]:value}));
  }
  return <div className="gs-contributions">
    <header className="gs-section-head"><div>
      <span className="eyebrow"><span className="tiny-dot"/> GHOST SPACE / CONTRIBUTIONS</span>
      <h1>Contributions.</h1>
      <p className="gs-section-lede">Your work is your signature. Draft privately and publish your research with a version history. Submissions with a specific screening concern go to a reviewer.</p>
    </div><button className="button button-light gs-create-btn" type="button" onClick={()=>begin()}>
      <Plus size={15}/> Create Contribution</button></header>
    {notice&&<p className="status-message" role="status">{notice}</p>}
    {error&&<p className="status-message error-message" role="alert">{error}</p>}
    <nav className="gs-tabs" role="tablist" aria-label="Contribution workflow states">
      {TABS.map(t=><button key={t.key} type="button" role="tab" aria-selected={tab===t.key}
        className={'gs-tab'+(tab===t.key?' active':'')} onClick={()=>setTab(t.key)}>
        {t.name}{counts[t.key]>0&&<span className="gs-tab-count">{counts[t.key]}</span>}</button>)}
    </nav>
    {loading?<div className="loading-state">Loading your contributions…</div>:
    shown.length===0?<div className="gs-empty-state"><FileText size={28}/>
      <p>{tab==='drafts'?'No drafts yet. Start a private contribution.':
      tab==='in_review'?'Nothing submitted for review yet.':
      tab==='needs_revision'?'No reviewer revisions requested.':
      tab==='published'?'No published contributions yet.':'No archived contributions.'}</p>
      <button className="button button-outline" type="button" onClick={()=>begin()}><Plus size={14}/> Start a contribution</button>
    </div>:<ul className="gs-card-list">{shown.map(item=><li key={item.id} className="dashboard-panel">
      <div className="gs-section-head">
        <div><span className="eyebrow">{kindLabels[item.kind as WorkKind]||item.kind} / {item.status}</span>
          <h2>{item.title||'Untitled draft'}</h2>
          <p className="muted-note">Version {item.version} · Updated {new Date(item.updated_at).toLocaleDateString()}</p>
        </div>
      </div><p>{item.summary||'Add your summary before publishing.'}</p>
      {item.status==='submitted'&&<div className="callout">
        <strong>Automated screening: </strong>
        {triage[item.id+':'+item.version]?.resolution==='cleared' ? 'Human investigation cleared' :
         triage[item.id+':'+item.version]?.policy_version==='LGN-TRIAGE-2' ? 'Possible credential or private-key material' :
         triage[item.id+':'+item.version]?.recommendation==='investigate' ? 'Further human investigation required' :
         triage[item.id+':'+item.version]?.recommendation==='reject_candidate' ? 'Possible duplicate — human review required' :
         triage[item.id+':'+item.version]?.recommendation==='human_review' ? 'Routine human review' :
         'Screening pending'}
        <p className="muted-note">A reviewer decides how to resolve the concern before held work can be published.</p>
      </div>}
      {reviewNotes[item.id]&&<div className="callout" role="note">
        <strong>Review decision: {reviewNotes[item.id].action.replaceAll('_',' ')}</strong>
        {reviewNotes[item.id].note&&<p style={{whiteSpace:'pre-wrap'}}>{reviewNotes[item.id].note}</p>}
      </div>}
      <div className="gs-builder-actions">
        <button type="button" className="button button-outline" onClick={()=>setPreview(item)}><Eye size={14}/> Preview</button>
        {item.status!=='published'&&<button type="button" className="button button-light"
          onClick={()=>begin(item)}>Edit</button>}
        <button type="button" className="gs-card-action" onClick={()=>{void showRevisions(item);}}><History size={14}/> History</button>
        {item.status==='submitted'&&<button className="gs-card-action" type="button" disabled={busy}
          onClick={()=>{void transition(item,'draft');}}><Undo2 size={14}/> Withdraw to draft</button>}
        {['draft','revision_requested','rejected'].includes(item.status)&&<button className="gs-card-action" type="button" disabled={busy}
          onClick={()=>{void transition(item,'archived');}}><Archive size={14}/> Archive</button>}
        {item.status==='archived'&&<button className="gs-card-action" type="button" disabled={busy}
          onClick={()=>{void transition(item,'draft');}}><RefreshCcw size={14}/> Restore</button>}
      </div>
    </li>)}</ul>}
    {editing!==undefined&&<div className="gs-overlay" role="dialog" aria-modal="true" aria-label="Edit contribution">
      <form className="gs-overlay-panel gs-editor" onSubmit={(event:FormEvent<HTMLFormElement>)=>event.preventDefault()}>
        <header className="gs-overlay-head"><div><span className="eyebrow"><span className="tiny-dot"/> {editing?'EDIT':'NEW'} CONTRIBUTION</span>
          <h2>{editing?'Edit contribution':'Create contribution'}</h2></div>
          <button type="button" className="gs-overlay-close" aria-label="Close editor" onClick={()=>{setEditing(undefined);setError('');}}><X size={18}/></button>
        </header>
        {error&&<p className="status-message error-message" role="alert">{error}</p>}
        <div className="field"><label htmlFor="ce-kind">Contribution type</label>
          <select id="ce-kind" value={draft.kind} disabled={!!editing}
            onChange={e=>editorField('kind',e.target.value)}>
            {KINDS.map(([kind,label])=><option key={kind} value={kind}>{label}</option>)}</select>
          <small>Projects and Table Talks have separate dedicated workspaces.</small></div>
        <div className="field"><label htmlFor="ce-language">Original publication language</label>
          <select id="ce-language" value={draft.language} onChange={e=>editorField('language',e.target.value)}>
            {CONTENT_LANGUAGES.map(l=><option key={l.code} value={l.code}>{l.native} ({l.code})</option>)}</select></div>
        <div className="field"><label htmlFor="ce-title">Title</label>
          <input id="ce-title" maxLength={180} value={draft.title} onChange={e=>editorField('title',e.target.value)}/></div>
        <div className="field"><label htmlFor="ce-summary">Summary (optional)</label>
          <textarea id="ce-summary" rows={4} maxLength={500} value={draft.summary} onChange={e=>editorField('summary',e.target.value)}/></div>
        <div className="field"><label htmlFor="ce-domain">Specialty / domain</label>
          <input id="ce-domain" maxLength={250} value={draft.domain} onChange={e=>editorField('domain',e.target.value)}/></div>
        <div className="field"><label htmlFor="ce-body">Description, method, or documentation (optional)</label>
          <textarea id="ce-body" rows={12} maxLength={50000} value={draft.body} onChange={e=>editorField('body',e.target.value)}
            placeholder={'Describe your contribution in your own words. Add context, a method, or evidence if it helps readers understand your work.'}/></div>
        <div className="field"><label htmlFor="ce-tags">Tags (comma-separated)</label>
          <input id="ce-tags" maxLength={1500} value={draft.tags} onChange={e=>editorField('tags',e.target.value)}/></div>
        <div className="field"><label htmlFor="ce-source">Source reference (HTTPS, optional)</label>
          <input id="ce-source" type="url" maxLength={2048} value={draft.source_url} onChange={e=>editorField('source_url',e.target.value)}/></div>
        <div className="field"><label htmlFor="ce-code">Code / technical artifacts (optional)</label>
          <textarea id="ce-code" rows={6} maxLength={50000} value={draft.code} onChange={e=>editorField('code',e.target.value)}/></div>
        <div className="callout">Add a title and a summary, description, code, or source link. Brief research contributions are welcome. Code is displayed as text. A specific screening concern can hold the contribution for review.</div>
        <div className="gs-builder-actions">
          <button type="button" className="button button-outline" disabled={busy||editing?.status==='archived'} onClick={()=>{void save('draft');}}>
            <Save size={14}/> {busy?'Saving…':'Save draft'}</button>
          {editing?.status!=='archived'&&<button type="button" className="button button-light" disabled={busy}
            onClick={()=>{void save('submitted');}}><Send size={14}/> Publish contribution</button>}
          <button className="gs-card-action" type="button" onClick={()=>setEditing(undefined)} disabled={busy}>Cancel</button>
        </div>
      </form></div>}
    {preview&&<Preview item={preview} onClose={()=>setPreview(null)}/>}
    {revisionsFor&&<div className="gs-overlay" role="dialog" aria-modal="true" aria-label="Version history">
      <div className="gs-overlay-panel gs-preview"><header className="gs-overlay-head">
        <div><span className="eyebrow">IMMUTABLE VERSION HISTORY</span><h2>{revisionsFor.title||'Untitled contribution'}</h2></div>
        <button className="gs-overlay-close" type="button" aria-label="Close history" onClick={()=>setRevisionsFor(null)}><X size={18}/></button>
      </header>
        {revisions.length===0?<p>No revisions available yet.</p>:
          <ol>{revisions.map(r=><li key={r.id} style={{marginBottom:16}}>
            <strong>Version {r.version}</strong> — {r.reason} ({r.status})<p className="muted-note">{new Date(r.created_at).toLocaleString()}</p>
            <p>{r.title||'Untitled'}</p><p>{r.summary||'No summary'}</p></li>)}</ol>}
        <p className="muted-note">Version snapshots are owner-only. Restoring an old version will require a separate moderated workflow.</p>
      </div></div>}
  </div>;
}
