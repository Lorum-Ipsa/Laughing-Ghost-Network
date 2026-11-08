import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { supabaseBrowser } from '@/lib/supabase-browser';
import type { Database } from '@/lib/supabase.database.types';

type Tables=Database['public']['Tables'];
type Talk=Tables['ghost_table_talks']['Row'];
type Member=Tables['ghost_table_talk_members']['Row'];
type Decision=Tables['ghost_table_talk_decisions']['Row'];
type Materials=Tables['ghost_table_talk_materials']['Row'];
const stages=['draft','open','scheduled','in_progress','completed','archived'];
const fields=['objectives','scenario','timeline','injects','evidence','decision_points'] as const;
const talkFields='id,profile_id,title,summary,status,scheduled_at,created_at' as const;
const label=(value:string)=>value.replaceAll('_',' ');

export function SupabaseTableTalks({profileId}:{profileId:string}) {
  const [params,setParams]=useSearchParams();
  const selectedId=params.get('talk');
  const [talks,setTalks]=useState<Talk[]>([]);
  const [selected,setSelected]=useState<Talk|null>(null);
  const [members,setMembers]=useState<Member[]>([]);
  const [materials,setMaterials]=useState<Materials|null>(null);
  const [debrief,setDebrief]=useState<string|null>(null);
  const [decisions,setDecisions]=useState<Decision[]>([]);
  const [handles,setHandles]=useState<Record<string,string>>({});
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [revision,setRevision]=useState(0);
  const owner=selected?.profile_id===profileId;
  const membership=members.find(row=>row.profile_id===profileId);

  useEffect(()=>{
    let active=true;
    setLoading(true);setError('');
    void (async()=>{
      try{
        const api=supabaseBrowser();
        const {data:joined,error:joinError}=await api.from('ghost_table_talk_members')
          .select('talk_id').eq('profile_id',profileId);
        if(joinError)throw joinError;
        const ids=joined.map(row=>row.talk_id);
        if(selectedId&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(selectedId))ids.push(selectedId);
        const query=api.from('ghost_table_talks').select(talkFields);
        const {data,error:talkError}=await (ids.length
          ?query.or(`profile_id.eq.${profileId},id.in.(${ids.join(',')})`)
          :query.eq('profile_id',profileId)).order('created_at',{ascending:false});
        if(talkError)throw talkError;
        const talk=data.find(row=>row.id===selectedId)??null;
        let roster:Member[]=[];
        let notes:Decision[]=[];
        let context:Materials|null=null;
        let recap:string|null=null;
        const names:Record<string,string>={};
        if(talk){
          const [people,answers,scenario,result]=await Promise.all([
            api.from('ghost_table_talk_members').select('*').eq('talk_id',talk.id),
            api.from('ghost_table_talk_decisions').select('*').eq('talk_id',talk.id).order('created_at'),
            api.from('ghost_table_talk_materials').select('*').eq('talk_id',talk.id).maybeSingle(),
            api.from('ghost_table_talk_debriefs').select('body').eq('talk_id',talk.id).maybeSingle(),
          ]);
          if(people.error)throw people.error;
          if(answers.error)throw answers.error;
          if(scenario.error)throw scenario.error;
          if(result.error)throw result.error;
          roster=people.data;notes=answers.data;context=scenario.data;recap=result.data?.body??null;
          if(talk.profile_id===profileId){
            const profileIds=[...new Set([...roster,...notes].map(row=>row.profile_id))];
            if(profileIds.length){
              const {data:profiles,error:profileError}=await api.from('ghost_profiles')
                .select('id,handle').in('id',profileIds);
              if(profileError)throw profileError;
              for(const row of profiles)names[row.id]=row.handle;
            }
          }
        }
        if(active){
          setTalks(data);setSelected(talk);setMembers(roster);setDecisions(notes);
          setMaterials(context);setDebrief(recap);setHandles(names);
        }
      }catch(e){
        if(active){
          setSelected(null);setTalks([]);setMembers([]);setMaterials(null);setDecisions([]);setDebrief(null);
          setError(typeof e==='object'&&e!==null&&'code' in e&&e.code==='PGRST205'
            ?'The Table Talks migration has not been applied in this environment.'
            :'Unable to load Table Talks.');
        }
      }finally{if(active)setLoading(false);}
    })();
    return()=>{active=false;};
  },[profileId,selectedId,revision]);

  function open(id:string){setParams({section:'table-talks',talk:id});}

  async function mutate(action:()=>PromiseLike<{error:unknown}>,message:string) {
    if(busy)return;
    setBusy(true);setError('');setNotice('');
    try{
      const {error}=await action();
      if(error)throw error;
      setNotice(message);setRevision(value=>value+1);
    }catch(e){
      setError(typeof e==='object'&&e!==null&&'message' in e?String(e.message):'Unable to save the change.');
    }finally{setBusy(false);}
  }

  function submit(event:FormEvent<HTMLFormElement>,action:(form:FormData)=>PromiseLike<{error:unknown}>,message:string){
    event.preventDefault();
    const element=event.currentTarget;
    const form=new FormData(element);
    void mutate(async()=>{
      const result=await action(form);
      if(!result.error)element.reset();
      return result;
    },message);
  }

  const value=(form:FormData,key:string)=>String(form.get(key)??'').trim();

  return <section className="gs-contributions gs-workspace">
    <h1>Table Talks</h1>
    <p>Run cybersecurity exercises, record decisions, and debrief the reasoning.</p>
    <Link to="/table-talks">Browse public exercises</Link>
    {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
    {loading?<p>Loading exercises…</p>:<>
      <div className="gs-workspace-grid">
      <form className="form-panel" onSubmit={event=>submit(event,async form=>{
        const result=await supabaseBrowser().from('ghost_table_talks')
          .insert({profile_id:profileId,title:value(form,'title'),summary:value(form,'summary')}).select('id').single();
        if(result.data)open(result.data.id);
        return result;
      },'Private exercise draft created.')}>
        <h2>Draft an exercise</h2>
        <label htmlFor="talk-new-title">Title</label><input id="talk-new-title" name="title" required maxLength={180}/>
        <label htmlFor="talk-new-summary">Public brief</label><textarea id="talk-new-summary" name="summary" maxLength={1200}/>
        <button className="button button-light" disabled={busy}>Create draft</button>
      </form>
      <section className="dashboard-panel"><h2>Your exercises</h2>
        {talks.length===0&&<p>No exercises here yet. Draft one or browse public exercises.</p>}
      <ul className="gs-card-list">{talks.map(talk=><li key={talk.id}>
        <button type="button" className="button button-outline" onClick={()=>open(talk.id)}>
          {talk.title} · {label(talk.status)}
        </button>
      </li>)}</ul>
      </section>
      </div>
      {selectedId&&!selected&&<p>The selected exercise is unavailable.</p>}
      {selected&&<div className="dashboard-panel" key={selected.id}>
        <h2>{selected.title}</h2><p>{selected.summary}</p><p>{label(selected.status)}</p>
        {selected.scheduled_at&&<p><time dateTime={selected.scheduled_at}>{new Date(selected.scheduled_at).toLocaleString()}</time></p>}
        {owner?<form onSubmit={event=>submit(event,form=>{
          const date=value(form,'scheduled_at');
          return supabaseBrowser().from('ghost_table_talks').update({
            title:value(form,'title'),summary:value(form,'summary'),status:value(form,'status'),
            scheduled_at:date?new Date(date).toISOString():null,
          }).eq('id',selected.id).select('id').single();
        },'Exercise settings saved.')}>
          <h3>Facilitator settings</h3>
          <label htmlFor="talk-title">Title</label><input id="talk-title" name="title" required maxLength={180} defaultValue={selected.title}/>
          <label htmlFor="talk-summary">Public brief</label><textarea id="talk-summary" name="summary" maxLength={1200} defaultValue={selected.summary}/>
          <label htmlFor="talk-status">Status</label><select id="talk-status" name="status" defaultValue={selected.status}>
            {stages.map(stage=><option key={stage} value={stage}>{label(stage)}</option>)}
          </select>
          <label htmlFor="talk-date">Scheduled time (local)</label><input id="talk-date" name="scheduled_at" type="datetime-local"
            defaultValue={selected.scheduled_at?localDateTime(selected.scheduled_at):''}/>
          <p>Open, scheduled, in-progress and completed briefs are public. Exercise materials are released to registered Ghosts when in progress.</p>
          <button className="button button-light" disabled={busy}>Save settings</button>
        </form>:membership?<div>
          <p>Registered{membership.role&&` · ${membership.role}`}</p>
          <button type="button" disabled={busy} onClick={()=>void mutate(()=>supabaseBrowser().from('ghost_table_talk_members')
            .delete().eq('talk_id',selected.id).eq('profile_id',profileId),'Registration removed.')}>Leave exercise</button>
        </div>:['open','scheduled'].includes(selected.status)&&<button type="button" className="button button-light" disabled={busy}
          onClick={()=>void mutate(()=>supabaseBrowser().from('ghost_table_talk_members').insert({
            talk_id:selected.id,profile_id:profileId,
          }),'Registered for exercise.')}>Register</button>}

        {owner&&<section><h3>Participants</h3>
          {members.length===0&&<p>No registered participants.</p>}
          {members.map(member=><form key={member.profile_id} onSubmit={event=>submit(event,form=>
            supabaseBrowser().from('ghost_table_talk_members').update({role:value(form,'role')})
              .eq('talk_id',selected.id).eq('profile_id',member.profile_id).select('profile_id').single(),'Role saved.')}>
            <label htmlFor={`role-${member.profile_id}`}>{handles[member.profile_id]??'Ghost'} role</label>
            <input id={`role-${member.profile_id}`} name="role" maxLength={100} defaultValue={member.role}/>
            <button disabled={busy}>Save role</button>
            <button type="button" disabled={busy} onClick={()=>void mutate(()=>supabaseBrowser().from('ghost_table_talk_members')
              .delete().eq('talk_id',selected.id).eq('profile_id',member.profile_id),'Participant removed.')}>Remove</button>
          </form>)}
        </section>}
        {owner?<form onSubmit={event=>submit(event,form=>{
          const payload={
            objectives:value(form,'objectives'),scenario:value(form,'scenario'),
            timeline:value(form,'timeline'),injects:value(form,'injects'),
            evidence:value(form,'evidence'),decision_points:value(form,'decision_points'),
          };
          const table=supabaseBrowser().from('ghost_table_talk_materials');
          return materials?table.update(payload).eq('talk_id',selected.id).select('talk_id').single()
            :table.insert({talk_id:selected.id,...payload});
        },'Exercise materials saved.')}>
          <h3>Exercise materials</h3>
          {fields.map(field=><div className="field" key={field}>
            <label htmlFor={`talk-${field}`}>{label(field)}</label>
            <textarea id={`talk-${field}`} name={field} maxLength={10000} defaultValue={materials?.[field]??''}/>
          </div>)}
          <button className="button button-light" disabled={busy}>Save materials</button>
        </form>:materials&&<section><h3>Exercise materials</h3>
          {fields.filter(field=>materials[field]).map(field=><div key={field}>
            <h4>{label(field)}</h4><p style={{whiteSpace:'pre-wrap'}}>{materials[field]}</p>
          </div>)}
        </section>}
        {(owner||decisions.length>0||membership)&&<section><h3>Decisions</h3>
          {membership&&selected.status==='in_progress'&&<form onSubmit={event=>submit(event,form=>
            supabaseBrowser().from('ghost_table_talk_decisions').insert({
              talk_id:selected.id,profile_id:profileId,point:value(form,'point'),decision:value(form,'decision'),rationale:value(form,'rationale'),
            }),'Decision recorded.')}>
            <label htmlFor="talk-point">Decision point</label><input id="talk-point" name="point" maxLength={500} required/>
            <label htmlFor="talk-decision">Decision</label><textarea id="talk-decision" name="decision" maxLength={2000} required/>
            <label htmlFor="talk-rationale">Rationale</label><textarea id="talk-rationale" name="rationale" maxLength={5000}/>
            <button className="button button-light" disabled={busy}>Record decision</button>
          </form>}
          <ul>{decisions.map(decision=><li key={decision.id}>
            <strong>{decision.point} · {decision.profile_id===profileId?'You':handles[decision.profile_id]??'Participant'}</strong>
            <p>{decision.decision}</p><p style={{whiteSpace:'pre-wrap'}}>{decision.rationale}</p>
            {decision.profile_id===profileId&&membership&&selected.status==='in_progress'&&<details>
              <summary>Edit decision</summary>
              <form onSubmit={event=>submit(event,form=>supabaseBrowser().from('ghost_table_talk_decisions')
                .update({point:value(form,'point'),decision:value(form,'decision'),rationale:value(form,'rationale')})
                .eq('id',decision.id).select('id').single(),'Decision updated.')}>
                <label>Decision point <input name="point" required maxLength={500} defaultValue={decision.point}/></label>
                <label>Decision <textarea name="decision" required maxLength={2000} defaultValue={decision.decision}/></label>
                <label>Rationale <textarea name="rationale" maxLength={5000} defaultValue={decision.rationale}/></label>
                <button disabled={busy}>Save decision</button>
              </form>
            </details>}
            <button type="button" disabled={busy} onClick={()=>void mutate(()=>supabaseBrowser().from('ghost_table_talk_decisions')
              .delete().eq('id',decision.id),'Decision removed.')}>Remove decision</button>
          </li>)}</ul>
        </section>}
        {owner?<form onSubmit={event=>submit(event,form=>{
          const body=value(form,'body');
          const table=supabaseBrowser().from('ghost_table_talk_debriefs');
          return debrief===null?table.insert({talk_id:selected.id,body})
            :table.update({body}).eq('talk_id',selected.id).select('talk_id').single();
        },'Debrief saved.')}>
          <h3>Debrief</h3><p>Participants see this once the exercise is completed.</p>
          <label htmlFor="talk-debrief">Debrief notes</label><textarea id="talk-debrief" name="body" required maxLength={10000} defaultValue={debrief??''}/>
          <button className="button button-light" disabled={busy}>Save debrief</button>
        </form>:debrief&&<section><h3>Debrief</h3><p style={{whiteSpace:'pre-wrap'}}>{debrief}</p></section>}
      </div>}
    </>}
  </section>;
}

function localDateTime(iso:string) {
  const date=new Date(iso);
  return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);
}
