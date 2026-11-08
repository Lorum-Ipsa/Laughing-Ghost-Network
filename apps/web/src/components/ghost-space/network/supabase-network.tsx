import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router';
import { ghostProfilePath } from '@/lib/ghost-handle';
import { supabaseBrowser } from '@/lib/supabase-browser';
import type { Database } from '@/lib/supabase.database.types';

type Tables=Database['public']['Tables'];
type Request=Tables['ghost_collaboration_requests']['Row'];
type Connection=Pick<Request,'id'|'sender_profile_id'|'recipient_profile_id'>;
type Saved=Tables['ghost_saved_searches']['Row'];
const profileFields='id,handle,display_name,specialties,skills,tools,industry,open_to_collaboration,open_to_research,open_to_mentorship' as const;
type Ghost=Pick<Tables['ghost_profiles']['Row'],
  'id'|'handle'|'display_name'|'specialties'|'skills'|'tools'|'industry'|'open_to_collaboration'|'open_to_research'|'open_to_mentorship'>;
type Opportunity={id:string;title:string;kind:'project'|'talk'};

export function SupabaseNetwork({profileId}:{profileId:string}) {
  const [ghosts,setGhosts]=useState<Ghost[]>([]);
  const [requests,setRequests]=useState<Request[]>([]);
  const [follows,setFollows]=useState<string[]>([]);
  const [connections,setConnections]=useState<Connection[]>([]);
  const [saved,setSaved]=useState<Saved[]>([]);
  const [opportunities,setOpportunities]=useState<Opportunity[]>([]);
  const [handles,setHandles]=useState<Record<string,string>>({});
  const [query,setQuery]=useState('');
  const [collaborationOnly,setCollaborationOnly]=useState(false);
  const [recipient,setRecipient]=useState<Ghost|null>(null);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [revision,setRevision]=useState(0);

  useEffect(()=>{
    let active=true;
    setLoading(true);setError('');
    void (async()=>{
      try{
        const api=supabaseBrowser();
        const [people,inbox,searches,projects,talks,connected,followed]=await Promise.all([
          api.from('ghost_profiles').select(profileFields).order('handle').limit(1000),
          api.from('ghost_collaboration_requests').select('*').order('created_at',{ascending:false}).limit(100),
          api.from('ghost_saved_searches').select('*').order('name'),
          api.from('ghost_projects').select('id,title').eq('visibility','public').eq('status','active')
            .eq('recruiting',true).neq('profile_id',profileId).order('created_at',{ascending:false}).limit(5),
          api.from('ghost_table_talks').select('id,title').in('status',['open','scheduled'])
            .neq('profile_id',profileId).order('scheduled_at',{ascending:true,nullsFirst:false}).limit(5),
          api.from('ghost_collaboration_requests').select('id,sender_profile_id,recipient_profile_id').eq('status','accepted')
            .order('created_at',{ascending:false}).order('id').range(0,999),
          api.from('ghost_follows').select('followed_profile_id').eq('follower_profile_id',profileId)
            .order('followed_profile_id').range(0,999),
        ]);
        if(people.error)throw people.error;
        if(inbox.error)throw inbox.error;
        if(searches.error)throw searches.error;
        if(projects.error)throw projects.error;
        if(talks.error)throw talks.error;
        if(connected.error)throw connected.error;
        if(followed.error)throw followed.error;
        const followIds=followed.data.map(row=>row.followed_profile_id);
        for(let offset=1000;followIds.length===offset;offset+=1000){
          const {data,error}=await api.from('ghost_follows').select('followed_profile_id')
            .eq('follower_profile_id',profileId).order('followed_profile_id').range(offset,offset+999);
          if(error)throw error;
          followIds.push(...data.map(row=>row.followed_profile_id));
        }
        const connectionRows=[...connected.data];
        for(let offset=1000;connectionRows.length===offset;offset+=1000){
          const {data,error}=await api.from('ghost_collaboration_requests').select('id,sender_profile_id,recipient_profile_id').eq('status','accepted')
            .order('created_at',{ascending:false}).order('id').range(offset,offset+999);
          if(error)throw error;
          connectionRows.push(...data);
        }
        const names:Record<string,string>=Object.fromEntries(people.data.map(ghost=>[ghost.id,ghost.handle]));
        const unknown=[...new Set([...followIds,...[...inbox.data,...connectionRows].flatMap(row=>[row.sender_profile_id,row.recipient_profile_id])])]
          .filter(id=>!(id in names));
        for(let offset=0;offset<unknown.length;offset+=100){
          const {data,error}=await api.from('ghost_profiles').select('id,handle').in('id',unknown.slice(offset,offset+100));
          if(error)throw error;
          for(const row of data)names[row.id]=row.handle;
        }
        if(active){
          setGhosts(people.data);setRequests(inbox.data);setConnections(connectionRows);setFollows(followIds);setSaved(searches.data);setHandles(names);
          setOpportunities([...projects.data.map(row=>({...row,kind:'project' as const})),
            ...talks.data.map(row=>({...row,kind:'talk' as const}))]);
        }
      }catch{
        if(active)setError('Unable to load Network. Refresh and try again.');
      }finally{if(active)setLoading(false);}
    })();
    return()=>{active=false;};
  },[profileId,revision]);

  async function change(action:()=>PromiseLike<{error:unknown}>,message:string) {
    if(busy)return;
    setBusy(true);setError('');setNotice('');
    try{
      const {error}=await action();
      if(error)throw error;
      setNotice(message);setRevision(value=>value+1);
    }catch(e){
      setError(typeof e==='object'&&e!==null&&'code' in e&&e.code==='23505'
        ?'This request, follow, or saved search already exists.'
        :typeof e==='object'&&e!==null&&'message' in e?String(e.message):'The change could not be saved.');
    }finally{setBusy(false);}
  }

  function saveSearch(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const element=event.currentTarget;
    const name=String(new FormData(element).get('name')??'').trim();
    void change(async()=>{
      const result=await supabaseBrowser().from('ghost_saved_searches').insert({
        profile_id:profileId,name,query:query.trim(),collaboration_only:collaborationOnly,
      });
      if(!result.error)element.reset();
      return result;
    },'Search saved.');
  }

  function send(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!recipient)return;
    const form=new FormData(event.currentTarget);
    void change(async()=>{
      const result=await supabaseBrowser().from('ghost_collaboration_requests').insert({
        sender_profile_id:profileId,recipient_profile_id:recipient.id,
        subject:String(form.get('subject')??'').trim(),message:String(form.get('message')??'').trim(),
      });
      if(!result.error)setRecipient(null);
      return result;
    },'Collaboration request sent.');
  }

  const counterpart=(row:Connection)=>row.sender_profile_id===profileId?row.recipient_profile_id:row.sender_profile_id;
  const connectedIds=new Set(connections.map(counterpart));

  function disconnect(row:Connection){
    const handle=handles[counterpart(row)];
    if(!window.confirm(`Disconnect from ${handle?'@'+handle:'this Ghost'}? The original request stays in your history.`))return;
    void change(()=>supabaseBrowser().from('ghost_collaboration_requests')
      .update({status:'disconnected'}).eq('id',row.id).eq('status','accepted')
      .select('id').single(),'Connection removed.');
  }

  const following=new Set(follows);
  function toggleFollow(id:string){
    const followed=following.has(id);
    void change(()=>{
      const table=supabaseBrowser().from('ghost_follows');
      return followed?table.delete().eq('follower_profile_id',profileId).eq('followed_profile_id',id)
        :table.insert({follower_profile_id:profileId,followed_profile_id:id});
    },followed?'Unfollowed Ghost.':'Following Ghost.');
  }

  const terms=query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const matches=ghosts.filter(ghost=>{
    if(ghost.id===profileId||collaborationOnly&&!ghost.open_to_collaboration)return false;
    const index=[ghost.handle,ghost.display_name,ghost.specialties,ghost.skills,ghost.tools,ghost.industry]
      .join(' ').toLowerCase();
    return terms.every(term=>index.includes(term));
  });

  return <section className="gs-contributions gs-workspace">
    <h1>Network</h1><p>Find Ghosts by their work and interests, save searches, and make private collaboration requests.</p>
    {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
    {loading?<p>Loading Network…</p>:<>
      <div className="gs-workspace-grid">
      <section className="dashboard-panel gs-workspace-wide"><h2>Discover Ghosts</h2>
        <label htmlFor="network-query">Handle, specialty, skill, tool, or industry</label>
        <input id="network-query" value={query} maxLength={250} onChange={event=>setQuery(event.target.value)}/>
        <label><input type="checkbox" checked={collaborationOnly}
          onChange={event=>setCollaborationOnly(event.target.checked)}/> Open to collaboration</label>
        <p>{matches.length} matches{matches.length>25?' · showing first 25':''}</p>
        <ul className="gs-card-list">{matches.slice(0,25).map(ghost=><li key={ghost.id}>
          <Link to={ghostProfilePath(ghost.handle)}>{ghost.display_name||ghost.handle} · @{ghost.handle}</Link>
          {ghost.specialties&&<p>{ghost.specialties}</p>}
          <button type="button" className="button button-outline" disabled={busy}
            onClick={()=>toggleFollow(ghost.id)}>{following.has(ghost.id)?'Unfollow':'Follow'}</button>
          {connectedIds.has(ghost.id)?<span>Connected</span>:
            <button type="button" className="button button-outline" disabled={busy}
              onClick={()=>{setError('');setRecipient(ghost);}}>Request collaboration</button>}
        </li>)}</ul>
      </section>
      <section className="dashboard-panel"><h2>Saved searches</h2>
        <form onSubmit={saveSearch}>
          <label htmlFor="network-search-name">Name for the current search</label>
          <input id="network-search-name" name="name" maxLength={100} required/>
          <button className="button button-light" disabled={busy}>Save search</button>
        </form>
        <ul>{saved.map(search=><li key={search.id}>
          <button type="button" onClick={()=>{setQuery(search.query);setCollaborationOnly(search.collaboration_only);}}>{search.name}</button>{' '}
          <button type="button" disabled={busy} onClick={()=>void change(()=>supabaseBrowser().from('ghost_saved_searches')
            .delete().eq('id',search.id),'Saved search removed.')}>Remove</button>
        </li>)}</ul>
      </section>
      <section className="dashboard-panel"><h2>Following</h2>
        <p>Only you can see this list. Enable publication alerts in <Link to="/ghost-space?section=notifications">Notifications</Link>.</p>
        {follows.length===0&&<p>You are not following any Ghosts yet.</p>}
        <ul>{follows.map(id=><li key={id}>
          {handles[id]?<Link to={ghostProfilePath(handles[id])}>@{handles[id]}</Link>:'Ghost profile unavailable'}{' '}
          <button type="button" disabled={busy} onClick={()=>toggleFollow(id)}>Unfollow</button>
        </li>)}</ul>
      </section>
      <section className="dashboard-panel"><h2>Connections</h2>
        <p>Accepted requests stay here until either Ghost disconnects.</p>
        {connections.length===0&&<p>No connections yet.</p>}
        <ul>{connections.map(row=>{
          const handle=handles[counterpart(row)];
          return <li key={row.id}>
            {handle?<Link to={ghostProfilePath(handle)}>@{handle}</Link>:'Ghost profile unavailable'}{' '}
            <Link className="button button-outline" to={`/ghost-space?section=messages&with=${counterpart(row)}`}>Message</Link>{' '}
            <button type="button" disabled={busy} onClick={()=>disconnect(row)}>Disconnect</button>
          </li>;
        })}</ul>
      </section>
      <section className="dashboard-panel"><h2>Collaboration requests</h2>
        {(['incoming','outgoing'] as const).map(direction=>{
          const incoming=direction==='incoming';
          const items=requests.filter(row=>(incoming?row.recipient_profile_id:row.sender_profile_id)===profileId);
          return <section key={direction}><h3>{incoming?'Received':'Sent'}</h3>
            {items.length===0&&<p>No requests.</p>}
            <ul>{items.map(request=>{
              const other=handles[incoming?request.sender_profile_id:request.recipient_profile_id];
              return <li key={request.id}><strong>{request.subject}</strong>
                <p>{incoming?'From':'To'} {other?<Link to={ghostProfilePath(other)}>@{other}</Link>:'Ghost'} · {request.status}</p>
                <p style={{whiteSpace:'pre-wrap'}}>{request.message}</p>
                {request.status==='pending'&&(incoming?['accepted','declined']:['withdrawn']).map(status=>
                  <button key={status} type="button" disabled={busy} onClick={()=>void change(()=>supabaseBrowser()
                    .from('ghost_collaboration_requests').update({status}).eq('id',request.id)
                    .eq('status','pending').select('id').single(),'Request updated.')}>
                    {status==='accepted'?'Accept':status==='declined'?'Decline':'Withdraw'}
                  </button>)}
              </li>;
            })}</ul>
          </section>;
        })}
      </section>
      <section className="dashboard-panel"><h2>Open opportunities</h2>
        {opportunities.length===0&&<p>No recruiting projects or open exercises right now.</p>}
        <ul>{opportunities.map(row=><li key={row.id}>
          <Link to={row.kind==='project'?`/ghost-space?section=projects&project=${row.id}`:
            `/ghost-space?section=table-talks&talk=${row.id}`}>{row.title}</Link> · {row.kind==='project'?'Project':'Table Talk'}
        </li>)}</ul>
      </section>
      </div>
    </>}
    {recipient&&<div className="gs-overlay" role="dialog" aria-modal="true" aria-labelledby="network-compose-title">
      <form className="gs-overlay-panel gs-editor" onSubmit={send}>
        <h2 id="network-compose-title">Request collaboration with @{recipient.handle}</h2>
        <label htmlFor="network-subject">Subject</label><input id="network-subject" name="subject" maxLength={180} required/>
        <label htmlFor="network-message">Message</label><textarea id="network-message" name="message" maxLength={3000} required/>
        {error&&<p role="alert">{error}</p>}
        <button type="button" className="button button-outline" disabled={busy} onClick={()=>setRecipient(null)}>Cancel</button>
        <button className="button button-light" disabled={busy}>Send request</button>
      </form>
    </div>}
  </section>;
}
