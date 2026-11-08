import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { ghostProfilePath } from '@/lib/ghost-handle';
import type { Database } from '@/lib/supabase.database.types';

type Project = Database['public']['Tables']['ghost_projects']['Row'];
type Member = Database['public']['Tables']['ghost_project_members']['Row'];
type Update = Database['public']['Tables']['ghost_project_updates']['Row'];
type Role = Database['public']['Tables']['ghost_project_roles']['Row'];
type Milestone = Database['public']['Tables']['ghost_project_milestones']['Row'];
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
  const [updates,setUpdates]=useState<Update[]>([]);
  const [roles,setRoles]=useState<Role[]>([]);
  const [milestones,setMilestones]=useState<Milestone[]>([]);
  const [watching,setWatching]=useState<string[]>([]);
  const [requestRole,setRequestRole]=useState('');
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
    setLoading(true);setError('');setRequestRole('');
    void (async()=>{
      try {
        const api=supabaseBrowser();
        const [mine,watches]=await Promise.all([
          api.from('ghost_project_members').select('project_id').eq('profile_id',profileId),
          api.from('ghost_project_watches').select('project_id').eq('profile_id',profileId),
        ]);
        if(mine.error)throw mine.error;
        if(watches.error)throw watches.error;
        const watchedIds=watches.data.map(row=>row.project_id);
        const ids=[...new Set([...mine.data.map(row=>row.project_id),...watchedIds])];
        if(selectedId&&/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(selectedId))ids.push(selectedId);
        const query=api.from('ghost_projects').select(projectFields);
        const {data,error}=await (ids.length
          ?query.or(`profile_id.eq.${profileId},id.in.(${ids.join(',')})`)
          :query.eq('profile_id',profileId)).order('created_at',{ascending:false});
        if(error)throw error;
        const current=data.find(row=>row.id===selectedId)??null;
        const memberRows:Member[]=[];
        const taskRows:Task[]=[];
        const updateRows:Update[]=[];
        const roleRows:Role[]=[];
        const milestoneRows:Milestone[]=[];
        const names:Record<string,string>={};
        if(current){
          const [memberResult,taskResult,updateResult,roleResult,milestoneResult]=await Promise.all([
            api.from('ghost_project_members').select('*').eq('project_id',current.id),
            api.from('ghost_project_tasks').select('*').eq('project_id',current.id).order('created_at'),
            api.from('ghost_project_updates').select('*').eq('project_id',current.id).order('created_at',{ascending:false}),
            api.from('ghost_project_roles').select('*').eq('project_id',current.id).order('title'),
            api.from('ghost_project_milestones').select('*').eq('project_id',current.id).order('due_on').order('title'),
          ]);
          if(memberResult.error)throw memberResult.error;
          if(taskResult.error)throw taskResult.error;
          if(updateResult.error)throw updateResult.error;
          if(roleResult.error)throw roleResult.error;
          if(milestoneResult.error)throw milestoneResult.error;
          roleRows.push(...roleResult.data);
          milestoneRows.push(...milestoneResult.data);
          updateRows.push(...updateResult.data);
          memberRows.push(...memberResult.data);
          taskRows.push(...taskResult.data);
          if(memberRows.length){
            const {data:profiles,error:profileError}=await api.from('ghost_profiles')
              .select('id,handle').in('id',memberRows.map(row=>row.profile_id));
            if(profileError)throw profileError;
            for(const row of profiles)names[row.id]=row.handle;
          }
        }
        if(active){setProjects(data);setProject(current);setMembers(memberRows);setTasks(taskRows);setUpdates(updateRows);setRoles(roleRows);setMilestones(milestoneRows);setWatching(watchedIds);setHandles(names);}
      } catch(e) {
        if(active){
          setProjects([]);setProject(null);setMembers([]);setTasks([]);setUpdates([]);setRoles([]);setMilestones([]);setWatching([]);
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

  function postUpdate(event:FormEvent<HTMLFormElement>,projectId:string) {
    event.preventDefault();
    const element=event.currentTarget;
    const form=new FormData(element);
    void mutate(async()=>{
      const result=await supabaseBrowser().from('ghost_project_updates').insert({
        project_id:projectId,title:String(form.get('title')??'').trim(),
        body:String(form.get('body')??'').trim(),
      });
      if(!result.error)element.reset();
      return result;
    },'Progress update posted.');
  }

  function changeTaskStatus(task:Task,status:string) {
    if(owning){
      void mutate(()=>supabaseBrowser().from('ghost_project_tasks').update({status})
        .eq('id',task.id).eq('status',task.status).select('id').single(),'Task updated.');
    } else {
      void mutate(()=>supabaseBrowser().rpc('update_assigned_project_task_status',{
        p_task_id:task.id,p_expected_status:task.status,p_status:status,
      }),'Task updated.');
    }
  }

  function invite(event:FormEvent<HTMLFormElement>,projectId:string) {
    event.preventDefault();
    const element=event.currentTarget;
    const handle=String(new FormData(element).get('handle')??'').trim();
    void mutate(async()=>{
      const api=supabaseBrowser();
      const {data,error}=await api.from('ghost_profiles').select('id').eq('handle',handle).maybeSingle();
      if(error)throw error;
      if(!data)throw new Error('No Ghost matches that exact handle.');
      const result=await api.from('ghost_project_members').insert({
        project_id:projectId,profile_id:data.id,status:'invited',
      });
      if(!result.error)element.reset();
      return result;
    },'Invitation added to the Ghost’s Projects workspace.');
  }

  function addPlanningItem(event:FormEvent<HTMLFormElement>,projectId:string,kind:'role'|'milestone') {
    event.preventDefault();
    const element=event.currentTarget;
    const form=new FormData(element);
    const title=String(form.get('title')??'').trim();
    void mutate(async()=>{
      const api=supabaseBrowser();
      const result=kind==='role'
        ?await api.from('ghost_project_roles').insert({
          project_id:projectId,title,description:String(form.get('description')??'').trim(),
        })
        :await api.from('ghost_project_milestones').insert({
          project_id:projectId,title,due_on:String(form.get('due_on')??'')||null,
        });
      if(!result.error)element.reset();
      return result;
    },kind==='role'?'Role posted.':'Milestone added.');
  }

  return <section className="gs-contributions gs-workspace">
    <h1>Projects</h1>
    <p>Start a private project, publish its brief when ready, and collaborate through a private task board.</p>
    <Link to="/projects">Browse public projects</Link>
    {error&&<p role="alert">{error}</p>}
    {notice&&<p role="status">{notice}</p>}
    {loading?<p>Loading Projects…</p>:<>
      <div className="gs-workspace-grid">
      <form className="form-panel" onSubmit={event=>saveProject(event)}>
        <h2>Start a project</h2>
        <label htmlFor="new-project-title">Title</label>
        <input id="new-project-title" name="title" maxLength={180} required/>
        <label htmlFor="new-project-summary">Brief</label>
        <textarea id="new-project-summary" name="summary" maxLength={1200}/>
        <button className="button button-light" disabled={busy}>Create private project</button>
      </form>
      <section className="dashboard-panel"><h2>Your projects</h2>
        {projects.length===0&&<p>No projects here yet. Start a private project or browse public projects.</p>}
      <ul className="gs-card-list">{projects.map(row=><li key={row.id}>
        <button type="button" className="button button-outline" onClick={()=>select(row.id)}>
          {row.title} · {row.profile_id===profileId?'Maintaining':watching.includes(row.id)?'Watching':'Participation'} · {row.status}
        </button>
      </li>)}</ul>
      </section>
      </div>
      {selectedId&&!project&&<p>The selected project is unavailable.</p>}
      {project&&<div className="dashboard-panel" key={project.id}>
        <h2>{project.title}</h2>
        <p style={{whiteSpace:'pre-wrap'}}>{project.summary}</p>
        {!owning&&project.visibility==='public'&&project.status!=='archived'&&
          <button type="button" className="button button-outline" disabled={busy}
            onClick={()=>{const watched=watching.includes(project.id);
              void mutate(()=>watched
                ?supabaseBrowser().from('ghost_project_watches').delete().eq('project_id',project.id).eq('profile_id',profileId)
                :supabaseBrowser().from('ghost_project_watches').insert({project_id:project.id,profile_id:profileId}),
                watched?'Project removed from your watch list.':'Project added to your watch list.');
            }}>{watching.includes(project.id)?'Stop watching':'Watch project'}</button>}
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
          {myMembership.status==='invited'&&project.status==='active'&&
            <button type="button" className="button button-light" disabled={busy}
              onClick={()=>void mutate(()=>supabaseBrowser().from('ghost_project_members').update({status:'accepted'})
                .eq('project_id',project.id).eq('profile_id',profileId).eq('status','invited')
                .select('project_id').single(),'Invitation accepted.')}>Accept invitation</button>}
          <button type="button" className="button button-outline" disabled={busy}
            onClick={()=>void mutate(()=>supabaseBrowser().from('ghost_project_members').delete().eq('project_id',project.id).eq('profile_id',profileId),'Membership removed.')}>
            {myMembership.status==='accepted'?'Leave project':myMembership.status==='invited'?'Decline invitation':'Remove request'}
          </button>
        </div>:project.recruiting&&project.visibility==='public'&&project.status==='active'&&<div>
          {roles.length>0&&<><label htmlFor="project-request-role">Role</label>
            <select id="project-request-role" value={requestRole} onChange={event=>setRequestRole(event.target.value)}>
              <option value="">General membership</option>
              {roles.map(role=><option key={role.id} value={role.id}>{role.title}</option>)}
            </select></>}
          <button type="button" className="button button-light" disabled={busy}
            onClick={()=>void mutate(()=>supabaseBrowser().from('ghost_project_members').insert({project_id:project.id,profile_id:profileId,role_id:requestRole||null}),'Membership requested.')}>
            Request to join
          </button></div>}
        {owning&&<div><h3>Membership</h3>
          {project.visibility==='public'&&project.status==='active'&&<form onSubmit={event=>invite(event,project.id)}>
            <label htmlFor="project-invite-handle">Invite a Ghost by exact handle</label>
            <input id="project-invite-handle" name="handle" maxLength={40} required/>
            <button className="button button-light" disabled={busy}>Invite Ghost</button>
          </form>}
          {members.length===0&&<p>No members or requests yet.</p>}
          <ul>{members.map(member=><li key={member.profile_id}>
            {handles[member.profile_id]?<Link to={ghostProfilePath(handles[member.profile_id])}>{handles[member.profile_id]}</Link>:'Ghost'} · {member.status}{member.role_id&&` · ${roles.find(role=>role.id===member.role_id)?.title??'Role'}`}{' '}
            {member.status==='requested'&&['accepted','declined'].map(status=><button key={status} type="button" disabled={busy}
              onClick={()=>void mutate(()=>supabaseBrowser().from('ghost_project_members').update({status})
                .eq('project_id',project.id).eq('profile_id',member.profile_id).eq('status','requested').select('project_id').single(),'Request decided.')}>
              {status==='accepted'?'Accept':'Decline'}
            </button>)}
            {(member.status==='accepted'||member.status==='invited')&&<button type="button" disabled={busy}
              onClick={()=>void mutate(()=>supabaseBrowser().from('ghost_project_members').delete()
                .eq('project_id',project.id).eq('profile_id',member.profile_id),'Membership record removed.')}>{member.status==='invited'?'Cancel invitation':'Remove'}</button>}
          </li>)}</ul>
        </div>}
        {(owning||roles.length>0)&&<div><h3>Project roles</h3>
          {owning&&<form onSubmit={event=>addPlanningItem(event,project.id,'role')}>
            <label htmlFor="project-role-title">Role title</label><input id="project-role-title" name="title" maxLength={100} required/>
            <label htmlFor="project-role-description">Role description</label><textarea id="project-role-description" name="description" maxLength={2000}/>
            <button className="button button-light" disabled={busy}>Post role</button>
          </form>}
          <ul>{roles.map(role=><li key={role.id}><strong>{role.title}</strong><p>{role.description}</p>
            {owning&&<button type="button" disabled={busy} onClick={()=>void mutate(()=>supabaseBrowser()
              .from('ghost_project_roles').update({is_open:!role.is_open}).eq('id',role.id).select('id').single(),'Role updated.')}>
              {role.is_open?'Close role':'Reopen role'}
            </button>}
          </li>)}</ul>
        </div>}
        {(owning||myMembership?.status==='accepted')&&<div><h3>Milestones</h3>
          {owning&&<form onSubmit={event=>addPlanningItem(event,project.id,'milestone')}>
            <label htmlFor="project-milestone-title">Milestone</label><input id="project-milestone-title" name="title" maxLength={180} required/>
            <label htmlFor="project-milestone-due">Target date</label><input id="project-milestone-due" name="due_on" type="date"/>
            <button className="button button-light" disabled={busy}>Add milestone</button>
          </form>}
          {milestones.length===0&&<p>No milestones yet.</p>}
          <ul>{milestones.map(milestone=><li key={milestone.id}>
            {milestone.title} · {milestone.completed?'Complete':'Open'}{milestone.due_on&&` · ${milestone.due_on}`}{' '}
            {owning&&<button type="button" disabled={busy} onClick={()=>void mutate(()=>supabaseBrowser()
              .from('ghost_project_milestones').update({completed:!milestone.completed})
              .eq('id',milestone.id).select('id').single(),'Milestone updated.')}>
              {milestone.completed?'Reopen':'Complete'}
            </button>}
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
            {(owning||task.assigned_profile_id===profileId)?<select aria-label={`Status for ${task.title}`}
              value={task.status} disabled={busy} onChange={event=>changeTaskStatus(task,event.target.value)}>
              {taskStates.map(state=><option key={state} value={state}>{state.replace('_',' ')}</option>)}
            </select>:<p>{task.status.replace('_',' ')}</p>}
            {owning&&<select aria-label={`Assignee for ${task.title}`} value={task.assigned_profile_id??''}
              disabled={busy} onChange={event=>{
                const assigned_profile_id=event.target.value||null;
                void mutate(()=>supabaseBrowser().from('ghost_project_tasks').update({assigned_profile_id})
                  .eq('id',task.id).select('id').single(),'Assignment updated.');
              }}>
              <option value="">Unassigned</option>
              {members.filter(member=>member.status==='accepted').map(member=>
                <option key={member.profile_id} value={member.profile_id}>{handles[member.profile_id]??'Ghost'}</option>)}
            </select>}
            {!owning&&task.assigned_profile_id===profileId&&<p>Assigned to you</p>}
          </li>)}</ul>
        </div>}
        {(owning||myMembership?.status==='accepted')&&<div><h3>Progress updates</h3>
          {owning&&<form onSubmit={event=>postUpdate(event,project.id)}>
            <label htmlFor="project-update-title">Update title</label>
            <input id="project-update-title" name="title" maxLength={180} required/>
            <label htmlFor="project-update-body">Progress update</label>
            <textarea id="project-update-body" name="body" maxLength={5000} required/>
            <button className="button button-light" disabled={busy}>Post update</button>
          </form>}
          {updates.length===0&&<p>No progress updates yet.</p>}
          <ul>{updates.map(update=><li key={update.id}>
            <strong>{update.title}</strong>
            <p style={{whiteSpace:'pre-wrap'}}>{update.body}</p>
            <time dateTime={update.created_at}>{new Date(update.created_at).toLocaleDateString()}</time>
          </li>)}</ul>
        </div>}
      </div>}
    </>}
  </section>;
}
