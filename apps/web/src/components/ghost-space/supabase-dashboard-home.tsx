import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ArrowUpRight, Bell, FileText, FolderGit2, MessageSquare, Network, Radio } from 'lucide-react';
import { ghostProfilePath } from '@/lib/ghost-handle';
import { supabaseBrowser } from '@/lib/supabase-browser';

const actions=[
  {section:'contributions',title:'Contributions',description:'Draft research, publish artifacts, and check review feedback.',icon:FileText},
  {section:'projects',title:'Projects',description:'Open your project briefs, task boards, and milestones.',icon:FolderGit2},
  {section:'table-talks',title:'Table Talks',description:'Prepare an exercise or revisit a session and its debrief.',icon:Radio},
  {section:'network',title:'Network',description:'Find collaborators and manage your connections.',icon:Network},
  {section:'messages',title:'Messages',description:'Open private conversations with your connections.',icon:MessageSquare},
  {section:'notifications',title:'Notifications',description:'Catch up on activity across your workspaces.',icon:Bell},
];

export function SupabaseDashboardHome({profileId,handle,displayName}:{
  profileId:string;handle:string;displayName?:string|null;
}){
  const [counts,setCounts]=useState<[number|null,number|null,number|null]>([null,null,null]);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    let active=true;
    void (async()=>{
      try{
        const api=supabaseBrowser();
        const results=await Promise.all([
          api.from('ghost_contributions').select('id',{count:'exact',head:true})
            .eq('profile_id',profileId).in('status',['draft','revision_requested','rejected']),
          api.from('ghost_collaboration_requests').select('id',{count:'exact',head:true})
            .eq('recipient_profile_id',profileId).eq('status','pending'),
          api.from('ghost_notifications').select('id',{count:'exact',head:true})
            .eq('profile_id',profileId).eq('read',false).eq('archived',false),
        ]);
        if(active)setCounts(results.map(result=>result.error?null:result.count??0) as typeof counts);
      }catch{/* Workspace links remain available if counts cannot load. */}
      finally{if(active)setLoading(false);}
    })();
    return()=>{active=false;};
  },[profileId]);

  const attention=[
    {label:'Contributions to work on',section:'contributions',count:counts[0]},
    {label:'Incoming requests',section:'network',count:counts[1]},
    {label:'Unread notices',section:'notifications',count:counts[2]},
  ];

  return <section className="gs-dashboard gs-home-dashboard">
    <header className="gs-home-hero">
      <span className="eyebrow"><span className="tiny-dot"/> GHOST SPACE / DASHBOARD</span>
      <h1>Welcome, {displayName||handle}<span className="accent-period">.</span></h1>
      <p>Pick up your work, find collaborators, or see what needs your attention.</p>
      <div className="gs-builder-actions">
        <Link className="button button-light" to="/ghost-space?section=contributions">Open Contributions <ArrowUpRight size={15}/></Link>
        <Link className="button button-outline" to={ghostProfilePath(handle)}>View @{handle}</Link>
      </div>
    </header>
    <section aria-labelledby="gs-attention-heading">
      <h2 id="gs-attention-heading">Needs attention</h2>
      <ul className="gs-home-grid">{attention.map(item=><li key={item.section}>
        <Link className="gs-home-tile" to={`/ghost-space?section=${item.section}`}>
          <strong>{loading?'…':item.count??'—'}</strong>
          <span>{item.label}</span>
        </Link>
      </li>)}</ul>
    </section>
    <section aria-labelledby="gs-workspaces-heading">
      <h2 id="gs-workspaces-heading">Your workspaces</h2>
      <ul className="gs-home-grid">{actions.map(({section,title,description,icon:Icon})=><li key={section}>
        <Link className="gs-home-tile" to={`/ghost-space?section=${section}`}>
          <Icon size={22} aria-hidden="true"/><h3>{title}</h3><p>{description}</p>
        </Link>
      </li>)}</ul>
    </section>
  </section>;
}
