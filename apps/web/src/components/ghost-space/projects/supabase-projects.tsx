import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { ghostProfilePath } from '@/lib/ghost-handle';
import type { Database } from '@/lib/supabase.database.types';

type Project = Database['public']['Tables']['ghost_projects']['Row'];
type Member = Database['public']['Tables']['ghost_project_members']['Row'];
type Task = Database['public']['Tables']['ghost_project_tasks']['Row'];
const projectFields='id,profile_id,title,summary,visibility,status,recruiting,created_at' as const;
const taskStates=['open','in_progress','complete'];

export function SupabaseProjects({profileId}:{profileId:string}) {
  const [params,setParams]=useSearchParams();
  const selectedId=params.get('project');
  const [projects,setProjects]=useState<Project[]>([]);
  const [project,setProject]=useState<Project|null>(null);
  const [members,setMembers]=useState<Member[]>([]);
  const [tasks,setTasks]=useState<Task[]>([]);
  const [handles,setHandles]=useState<Record<string,string>>({});
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [refresh,setRefresh]=useState(0);
  const owning=project?.profile_id===profileId;
  const myMembership=members.find(member=>member.profile_id===profileId);

  useEffect(()=>{
    let active=true;
    setLoading(true);setError('');
    void (async()=>{
      try {
        const api=supabaseBrowser();
        const {data:mine,error:membersError}=await api.from('ghost_project_members')
          .select('project_id').eq('profile_id',profileId);
        if(membersError)throw membersError;
        const ids=mine.map(row=>row.project_id);
        if(selectedId&&/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(selectedId))ids.push(selectedId);
        const query=api.from('ghost_projects').select(projectFields);
        const {data,error}=await (ids.length
          ?query.or(`profile_id.eq.${profileId},id.in.(${ids.join(',')})`)
          :query.eq('profile_id',profileId)).order('created_at',{ascending:false});
        if(error)throw error;
        const current=data.find(row=>row.id===selectedId)??null;
        const memberRows:Member[]=[];
        const taskRows:Task[]=[];
        const names:Record<string,string>={};
        if(current){
          const [memberResult,taskResult]=await Promise.all([
            api.from('ghost_project_members').select('*').eq('project_id',current.id),
            api.from('ghost_project_tasks').select('*').eq('project_id',current.id).order('created_at'),
          ]);
          if(memberResult.error)throw memberResult.error;
          if(taskResult.error)throw taskResult.error;
          memberRows.push(...memberResult.data);
          taskRows.push(...taskResult.data);
          if(memberRows.length){
            const {data:profiles,error:profileError}=await api.from('ghost_profiles')
              .select('id,handle').in('id',memberRows.map(row=>row.profile_id));
            if(profileError)throw profileError;
            for(const row of profiles)names[row.id]=row.handle;
          }
        }
        if(active){setProjects(data);setProject(current);setMembers(memberRows);setTasks(taskRows);setHandles(names);}
      } catch(e) {
        if(active){
          setProjects([]);setProject(null);setMembers([]);setTasks([]);
          setError(typeof e==='object'&&e!==null&&'code' in e&&e.code==='PGRST205'
            ?'The Projects migration has not been applied in this environment.'
            : 'Unable to load Projects. Refresh and try again.');
        }
      } finally {if(active)setLoading(false);}
    })();
    return()=>{active=false;};
  },[profileId,selectedId,refresh]);

  function select(id:string) {
    setParams({section:'projects',project:id});
  }

  async function mutate(action:()=>PromiseLike<{error:unknown}>,message:string) {
    if(busy)return;
    setBusy(true);setError('');setNotice('');
    try {
      const {error}=await action();
      if(error)throw error;
      setNotice(message);setRefresh(value=>value+1);
    } catch(e) {
      setError(typeof e==='object'&&e!==null&&'message' in e?String(e.message):'The change could not be saved.');
    } finally {setBusy(false);}
  }

  function saveProject(event:FormEvent<HTMLFormElement>,existing?:Project) {
    event.preventDefault();
    const element=event.currentTarget;
    const form=new FormData(element);
    const title=String(form.get('title')??'').trim();
    const summary=String(form.get('summary')??'').trim();
    if(existing){
      void mutate(()=>supabaseBrowser().from('ghost_projects').update({
        title,summary,visibility:String(form.get('visibility')),status:String(form.get('status')),
        recruiting:form.has('recruiting'),
      }).eq('id',existing.id).select('id').single(),'Project updated.');
    } else {
      void mutate(async()=>{
        const result=await supabaseBrowser().from('ghost_projects')
          .insert({profile_id:profileId,title,summary}).select('id').single();
        if(result.data){element.reset();select(result.data.id);}
        return result;
      },'Private project created.');
    }
  }

  function addTask(event:FormEvent<HTMLFormElement>,id:string) {
    event.preventDefault();
    const element=event.currentTarget;
    const form=new FormData(element);
    void mutate(async()=>{
      const result=await supabaseBrowser().from('ghost_project_tasks').insert({
        project_id:id,title:String(form.get('title')??'').trim(),description:String(form.get('description')??'').trim(),
      });
      if(!result.error)element.reset();
      return result;
    },'Task added.');
  }

  return <section className="gs-contributions">
    <h1>Projects</h1>
    <p>Start a private project, publish its brief when ready, and collaborate through a private task board.</p>
    <Link to="/projects">Browse public projects</Link>
    {error&&<p role="alert">{error}</p>}
    {notice&&<p role="status">{notice}</p>}
    {loading?<p>Loading Projects…</p>:<>
      <form className="form-panel" onSubmit={event=>saveProject(event)}>
        <h2>Start a project</h2>
        <label htmlFor="new-project-title">Title</label>
        <input id="new-project-title" name="title" maxLength={180} required/>
        <label htmlFor="new-project-summary">Brief</label>
        <textarea id="new-project-summary" name="summary" maxLength={1200}/>
        <button className="button button-light" disabled={busy}>Create private project</button>
      </form>
      <ul className="gs-card-list">{projects.map(row=><li key={row.id}>
        <button type="button" className="button button-outline" onClick={()=>select(row.id)}>
          {row.title} · {row.profile_id===profileId?'Maintaining':'Participation'} · {row.status}
        </button>
      </li>)}</ul>
      {selectedId&&!project&&<p>The selected project is unavailable.</p>}
      {project&&<div className="dashboard-panel" key={project.id}>
        <h2>{project.title}</h2>
        <p style={{whiteSpace:'pre-wrap'}}>{project.summary}</p>
        {owning?<form key={JSON.stringify(project)} onSubmit={event=>saveProject(event,project)}>
          <h3>Project settings</h3>
          <label htmlFor="project-title">Title</label><input id="project-title" name="title" defaultValue={project.title} maxLength={180} required/>
          <label htmlFor="project-summary">Brief</label><textarea id="project-summary" name="summary" defaultValue={project.summary} maxLength={1200}/>
          <label htmlFor="project-visibility">Visibility</label><select id="project-visibility" name="visibility" defaultValue={project.visibility}>
            <option value="private">Private</option><option value="public">Public brief</option>
          </select>
          <label htmlFor="project-status">Status</label><select id="project-status" name="status" defaultValue={project.status}>
            <option value="active">Active</option><option value="completed">Completed</option><option value="archived">Archived</option>
          </select>
          <label><input type="checkbox" name="recruiting" defaultChecked={project.recruiting}/> Accept membership requests when public and active</label>
          <button className="button button-light" disabled={busy}>Save project settings</button>
        </form>:myMembership?<div>
          <p>Membership: {myMembership.status}</p>
          <button type="button" className="button button-outline" disabled={busy}
            onClick={()=>void mutate(()=>supabaseBrowser().from('ghost_project_members').delete().eq('project_id',project.id).eq('profile_id',profileId),'Membership removed.')}>
            {myMembership.status==='accepted'?'Leave project':'Remove request'}
          </button>
        </div>:project.recruiting&&project.visibility==='public'&&project.status==='active'&&
          <button type="button" className="button button-light" disabled={busy}
            onClick={()=>void mutate(()=>supabaseBrowser().from('ghost_project_members').insert({project_id:project.id,profile_id:profileId}),'Membership requested.')}>
            Request to join
          </button>}
        {owning&&<div><h3>Membership</h3>
          {members.length===0&&<p>No members or requests yet.</p>}
          <ul>{members.map(member=><li key={member.profile_id}>
            {handles[member.profile_id]?<Link to={ghostProfilePath(handles[member.profile_id])}>{handles[member.profile_id]}</Link>:'Ghost'} · {member.status}{' '}
            {member.status==='requested'&&['accepted','declined'].map(status=><button key={status} type="button" disabled={busy}
              onClick={()=>void mutate(()=>supabaseBrowser().from('ghost_project_members').update({status})
                .eq('project_id',project.id).eq('profile_id',member.profile_id).eq('status','requested').select('project_id').single(),'Request decided.')}>
              {status==='accepted'?'Accept':'Decline'}
            </button>)}
            {member.status==='accepted'&&<button type="button" disabled={busy}
              onClick={()=>void mutate(()=>supabaseBrowser().from('ghost_project_members').delete()
                .eq('project_id',project.id).eq('profile_id',member.profile_id),'Member removed.')}>Remove</button>}
          </li>)}</ul>
        </div>}
        {(owning||myMembership?.status==='accepted')&&<div><h3>Task board</h3>
          {owning&&<form onSubmit={event=>addTask(event,project.id)}>
            <label htmlFor="project-task-title">New task</label><input id="project-task-title" name="title" maxLength={200} required/>
            <label htmlFor="project-task-description">Description</label><textarea id="project-task-description" name="description" maxLength={5000}/>
            <button className="button button-light" disabled={busy}>Add task</button>
          </form>}
          {tasks.length===0&&<p>No tasks yet.</p>}
          <ul>{tasks.map(task=><li key={task.id}>
            <strong>{task.title}</strong><p>{task.description}</p>
            {owning?<select aria-label={`Status for ${task.title}`} value={task.status} disabled={busy}
              onChange={event=>{const status=event.target.value;void mutate(()=>supabaseBrowser()
                .from('ghost_project_tasks').update({status}).eq('id',task.id).select('id').single(),'Task updated.');}}>
              {taskStates.map(state=><option key={state} value={state}>{state.replace('_',' ')}</option>)}
            </select>:<p>{task.status.replace('_',' ')}</p>}
          </li>)}</ul>
        </div>}
      </div>}
    </>}
  </section>;
}
