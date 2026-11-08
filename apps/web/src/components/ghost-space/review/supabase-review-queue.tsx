import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { CheckCircle2, Clock, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import { kindLabels, safeExternal, type WorkKind } from '@/lib/network';
import { supabaseBrowser } from '@/lib/supabase-browser';
import type { GhostIdentity } from '@/lib/supabase-ghost-profile';
import type { GhostContribution } from '@/components/ghost-space/contributions/supabase-contributions';

const FIELDS = 'id,profile_id,kind,title,language,domain,summary,body,tags,source_url,code,status,version,submitted_at,published_at,created_at,updated_at' as const;
type Decision = 'revision_requested'|'rejected'|'published';
type QueueEntry = GhostContribution & { authorHandle: string };
type Props={profile:GhostIdentity};
const choices: {action:Decision;label:string}[]=[
  {action:'revision_requested',label:'Request revision'},
  {action:'rejected',label:'Reject'},
  {action:'published',label:'Approve & publish'},
];
export function SupabaseReviewQueue({profile}:Props){
  const [authorized,setAuthorized]=useState<boolean|null>(null);
  const [queue,setQueue]=useState<QueueEntry[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [selected,setSelected]=useState<QueueEntry|null>(null);
  const [note,setNote]=useState('');
  const [action,setAction]=useState<Decision>('revision_requested');
  const [busy,setBusy]=useState(false);

  async function loadQueue():Promise<QueueEntry[]> {
    const api=supabaseBrowser();
    const {data,error:queueError}=await api.from('ghost_contributions')
      .select(FIELDS).eq('status','submitted').order('submitted_at',{ascending:true}).limit(100);
    if(queueError)throw queueError;
    const submissions=(data||[]) as GhostContribution[];
    if(!submissions.length)return [];
    const uniqueProfiles=[...new Set(submissions.map(item=>item.profile_id))];
    const {data:authors,error:authorsError}=await api.from('ghost_profiles')
      .select('id,handle').in('id',uniqueProfiles);
    if(authorsError)throw authorsError;
    const map=new Map((authors||[]).map(item=>[item.id,item.handle]));
    return submissions.map(item=>({...item,authorHandle:map.get(item.profile_id)||'Ghost member'}));
  }

  useEffect(()=>{
    let alive=true;
    void(async()=>{
      try{
        const {data,error:authError}=await supabaseBrowser().rpc('can_review_contributions');
        if(authError)throw authError;
        if(!alive)return;
        setAuthorized(data===true);
        if(data===true){
          const entries=await loadQueue();
          if(alive)setQueue(entries);
        }
      }catch(e){if(alive)setError(e instanceof Error?e.message:'Unable to load the review queue.');}
      finally{if(alive)setLoading(false);}
    })();
    return()=>{alive=false;};
  },[]);
  async function refresh(){
    setError('');
    try{setQueue(await loadQueue());}
    catch(e){setError(e instanceof Error?e.message:'Unable to reload submissions.');}
  }
  async function decide(){
    if(!selected||!authorized||busy)return;
    if(selected.profile_id===profile.id){
      setError('You cannot review your own work. Another authorized reviewer must decide it.');return;
    }
    if(action!=='published'&&!note.trim()){
      setError('Add a reason for a revision request or rejection.');return;
    }
    setBusy(true);setError('');setNotice('');
    try{
      const {error:reviewError}=await supabaseBrowser().rpc('review_ghost_contribution',{
        p_contribution_id:selected.id,
        p_expected_version:selected.version,
        p_action:action,
        p_note:note.trim(),
      });
      if(reviewError)throw reviewError;
      setSelected(null);
      setNote('');
      await refresh();
      setNotice(action==='published'
        ? 'Contribution approved and made public.'
        : action==='rejected'
          ? 'Contribution rejected; the author can view the reason.'
          : 'Revision requested; the author can see your feedback and resubmit.');
    }catch(e){setError(e instanceof Error?e.message:'The review failed. Refresh and check the version.');}
    finally{setBusy(false);}
  }
  if(loading)return <div className="loading-state">Verifying your review permissions…</div>;
  if(!authorized)return <section className="gs-placeholder">
    <span className="eyebrow">GHOST SPACE / REVIEW</span>
    <h1>Authorized reviewers only.</h1>
    <p>This area requires an LGN reviewer, moderator, or administrator role assigned through the private membership system. Accounts cannot grant themselves reviewer access.</p>
    {error&&<p role="alert" className="status-message error-message">{error}</p>}
    <Link className="button button-outline" to="/ghost-space">Back to dashboard</Link>
  </section>;
  return <section className="gs-contributions">
    <header className="gs-section-head">
      <div>
        <span className="eyebrow"><span className="tiny-dot"/> GHOST SPACE / MODERATION</span>
        <h1>Review queue.</h1>
        <p className="gs-section-lede">Read the submission, request changes, reject it with a reason, or publish. Decisions are versioned and audited. You cannot review your own contributions.</p>
      </div>
      <button className="button button-outline" type="button" onClick={()=>void refresh()}>
        <RefreshCw size={14}/> Refresh
      </button>
    </header>
    {notice&&<p role="status" className="status-message">{notice}</p>}
    {error&&<p role="alert" className="status-message error-message">{error}</p>}
    {queue.length===0?<div className="gs-empty-state">
      <CheckCircle2 size={28}/><p>No submitted contributions are currently waiting for review.</p>
    </div>:<ul className="gs-card-list">{queue.map(item=><li key={item.id} className="dashboard-panel">
      <div className="gs-section-head">
        <div>
          <span className="eyebrow">{kindLabels[item.kind as WorkKind]||item.kind} / Submitted</span>
          <h2>{item.title}</h2>
          <p className="muted-note">
            Author: <Link to={'/ghosts/'+encodeURIComponent(item.authorHandle)}>{item.authorHandle}</Link>
            {' · '}Version {item.version}{' · '}
            <Clock size={12} style={{display:'inline'}}/> {new Date(item.submitted_at||item.created_at).toLocaleString()}
          </p>
        </div>
      </div>
      {item.summary&&<p>{item.summary}</p>}
      {item.profile_id===profile.id?
        <p className="muted-note">Your submission is visible in the queue but cannot be reviewed by you.</p>
        :<button type="button" className="button button-light" onClick={()=>{
          setSelected(item);setAction('revision_requested');setNote('');setError('');
        }}><ShieldCheck size={14}/> Open review</button>}
    </li>)}</ul>}
    {selected&&<div className="gs-overlay" role="dialog" aria-modal="true" aria-label="Review contribution">
      <div className="gs-overlay-panel gs-preview">
        <header className="gs-overlay-head"><div>
          <span className="eyebrow">REVIEW / VERSION {selected.version}</span>
          <h2>{selected.title}</h2>
          <p className="muted-note">Submitted by {selected.authorHandle} · {selected.language}</p>
        </div><button className="gs-overlay-close" type="button" disabled={busy} aria-label="Close review"
            onClick={()=>setSelected(null)}><XCircle size={18}/></button></header>
        {selected.summary&&<p>{selected.summary}</p>}
        {selected.body&&<div className="gs-preview-body" style={{whiteSpace:'pre-wrap'}}>{selected.body}</div>}
        {selected.code&&<pre className="code-block" style={{whiteSpace:'pre-wrap'}}>{selected.code}</pre>}
        {selected.source_url&&safeExternal(selected.source_url)&&
          <p><a href={safeExternal(selected.source_url)} target="_blank" rel="noopener noreferrer">Open cited source</a></p>}
        {selected.tags&&<p className="muted-note">Tags: {selected.tags}</p>}
        <div className="field">
          <label htmlFor="review-decision">Decision</label>
          <select id="review-decision" value={action} onChange={event=>setAction(event.target.value as Decision)}>
            {choices.map(option=><option key={option.action} value={option.action}>{option.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="review-note">Reviewer feedback {action==='published'?'(optional)':'(required)'}</label>
          <textarea id="review-note" value={note} maxLength={4000} rows={5}
            onChange={event=>setNote(event.target.value)}
            placeholder="Explain your decision or the changes requested."/>
        </div>
        {error&&<p role="alert" className="status-message error-message">{error}</p>}
        <div className="gs-builder-actions">
          <button className="button button-light" type="button" disabled={busy} onClick={()=>void decide()}>
            <ShieldCheck size={14}/>{busy?'Recording decision…':action==='published'?'Approve & publish':action==='rejected'?'Reject contribution':'Request revision'}
          </button>
          <button className="button button-outline" type="button" disabled={busy} onClick={()=>setSelected(null)}>Cancel</button>
        </div>
      </div>
    </div>}
  </section>;
}
