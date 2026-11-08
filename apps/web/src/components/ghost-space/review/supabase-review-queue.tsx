import { ghostProfilePath } from '@/lib/ghost-handle';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { CheckCircle2, Clock, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import { kindLabels, safeExternal, type WorkKind } from '@/lib/network';
import { supabaseBrowser } from '@/lib/supabase-browser';
import type { GhostIdentity } from '@/lib/supabase-ghost-profile';
import type { GhostContribution } from '@/components/ghost-space/contributions/supabase-contributions';
import type { Database } from '@/lib/supabase.database.types';

const FIELDS = 'id,profile_id,kind,title,language,domain,summary,body,tags,source_url,code,status,version,submitted_at,published_at,created_at,updated_at' as const;
type Decision = 'revision_requested'|'rejected'|'published'|'triage_cleared';
type Triage = Pick<Database['public']['Tables']['ghost_contribution_triage']['Row'],
  'contribution_id'|'version'|'recommendation'|'signals'|'resolution'|'policy_version'|'created_at'>;
type QueueEntry = GhostContribution & { authorHandle: string; triage?: Triage };
type RuleSignal = {rule:string; finding:string; required_action:string};
function botFindings(record?: Triage):RuleSignal[] {
  return Array.isArray(record?.signals) ? record.signals.filter((value):value is RuleSignal =>
    !!value && typeof value==='object' && !Array.isArray(value)
    && 'rule' in value && typeof value.rule==='string'
    && 'finding' in value && typeof value.finding==='string'
    && 'required_action' in value && typeof value.required_action==='string'
  ) : [];
}
function reviewLabel(record?: Triage):string {
  if (!record) return 'Screening pending';
  if (record.resolution==='cleared') return 'Investigation cleared';
  if(record.recommendation==='investigate')return 'Further investigation';
  if(record.recommendation==='reject_candidate')return 'Proposed rejection';
  return 'Routine human review';
}
function needsClearance(record?:Triage):boolean {
  return !record || (record.recommendation!=='human_review'&&record.resolution!=='cleared');
}
type Props={profile:GhostIdentity};
const choices: {action:Decision;label:string}[]=[
  {action:'revision_requested',label:'Request revision'},
  {action:'rejected',label:'Reject'},
  {action:'published',label:'Approve & publish'},
  {action:'triage_cleared',label:'Clear automated flag after investigation'},
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
    const {data:triage,error:triageError}=await api.from('ghost_contribution_triage')
      .select('contribution_id,version,recommendation,signals,resolution,policy_version,created_at')
      .in('contribution_id',submissions.map(item=>item.id));
    if(triageError)throw triageError;
    const byVersion=new Map((triage||[]).map(item=>[item.contribution_id+':'+item.version,item as Triage]));
    const priority:Record<string,number>={investigate:0,reject_candidate:1,human_review:2};
    return submissions.map(item=>({...item,
      authorHandle:map.get(item.profile_id)||'Ghost member',
      triage:byVersion.get(item.id+':'+item.version),
    })).sort((a,b)=>(priority[a.triage?.recommendation||'']??3)-(priority[b.triage?.recommendation||'']??3));
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
      setError('A human reviewer must record a reason for revisions, rejection, or investigation clearance.');return;
    }
    if(action==='published'&&needsClearance(selected.triage)){
      setError('This contribution is flagged or has not been screened. Resolve the investigation before publishing.');return;
    }
    if(action==='triage_cleared'&&(!selected.triage||!needsClearance(selected.triage))){
      setError('Only a pending automated flag can be cleared.');return;
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
          ? 'Contribution rejected by a human reviewer; the author can view the reason.'
          : action==='triage_cleared'
            ? 'Automated flag cleared with an audit note. The submission remains pending for final human review.'
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
        <p className="gs-section-lede">Submissions with a screening concern appear here. Investigate the finding and record your decision. Research without a finding can publish directly.</p>
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
            Author: <Link to={ghostProfilePath(item.authorHandle)}>{item.authorHandle}</Link>
            {' · '}Version {item.version}{' · '}
            <Clock size={12} style={{display:'inline'}}/> {new Date(item.submitted_at||item.created_at).toLocaleString()}
          </p>
        </div>
      </div>
      {item.summary&&<p>{item.summary}</p>}
      <p><strong>Bot recommendation:</strong> {reviewLabel(item.triage)}</p>
      {item.triage&&<p className="muted-note">
        {item.triage.policy_version} · {item.triage.resolution==='pending'?'Human investigation required':item.triage.resolution==='cleared'?'Cleared by reviewer':'Awaiting final human decision'}
      </p>}
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
          <p><a href={safeExternal(selected.source_url) || undefined} target="_blank" rel="noopener noreferrer">Open cited source</a></p>}
        {selected.tags&&<p className="muted-note">Tags: {selected.tags}</p>}
        <section className="form-panel" aria-label="Automated screening results">
          <span className="eyebrow">RULES BOT / {selected.triage?.policy_version||'UNSCREENED'}</span>
          <h3>{reviewLabel(selected.triage)}</h3>
          <p className="muted-note">An automated finding identifies a possible concern. A human decides whether held work can publish.</p>
          {botFindings(selected.triage).map(finding=><div key={finding.rule} style={{marginBottom:12}}>
            <strong>{finding.rule}: {finding.finding}</strong>
            <p>{finding.required_action}</p>
          </div>)}
          {needsClearance(selected.triage)&&<p role="status">
            Publication is blocked until an authorized reviewer investigates this version and records a clearance reason.
          </p>}
          {selected.triage?.resolution==='cleared'&&<p role="status">An authorized reviewer recorded a clearance; final publication still requires human approval.</p>}
        </section>
        <div className="field">
          <label htmlFor="review-decision">Decision</label>
          <select id="review-decision" value={action} onChange={event=>setAction(event.target.value as Decision)}>
            {choices.filter(option=>option.action!=='triage_cleared'||
              (selected.triage?.recommendation!=='human_review'&&needsClearance(selected.triage)))
              .map(option=><option key={option.action} value={option.action}
                disabled={option.action==='published'&&needsClearance(selected.triage)}>{option.label}</option>)}
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
            <ShieldCheck size={14}/>{busy?'Recording decision…':action==='published'?'Approve & publish':
              action==='rejected'?'Reject contribution':
              action==='triage_cleared'?'Record investigation clearance':'Request revision'}
          </button>
          <button className="button button-outline" type="button" disabled={busy} onClick={()=>setSelected(null)}>Cancel</button>
        </div>
      </div>
    </div>}
  </section>;
}
