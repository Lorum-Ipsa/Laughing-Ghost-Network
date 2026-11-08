import { useEffect, useState } from 'react';
import { NotificationItem } from './notification-item';
import { CATEGORY_LABELS, TYPE_CATEGORY } from '@/data/notifications';
import type { NotificationCategory, NotificationType } from '@/data/notifications';
import { supabaseBrowser } from '@/lib/supabase-browser';
import type { Database } from '@/lib/supabase.database.types';

type Tables=Database['public']['Tables'];
type Notice=Tables['ghost_notifications']['Row'];
type Preferences=Omit<Tables['ghost_notification_preferences']['Row'],'profile_id'>;
const categories=['contributions','projects','table_talks','collaboration'] as const;
const defaults:Preferences={contributions:true,projects:true,table_talks:true,collaboration:true,following:false};
type Tab='inbox'|'unread'|'archived'|typeof categories[number];
const preferenceKeys=[...categories,'following'] as const;
const tabs:Tab[]=['inbox','unread',...categories,'archived'];
const pageSize=50;

export function SupabaseNotifications({profileId}:{profileId:string}) {
  const [items,setItems]=useState<Notice[]>([]);
  const [prefs,setPrefs]=useState<Preferences>(defaults);
  const [hasPrefs,setHasPrefs]=useState(false);
  const [tab,setTab]=useState<Tab>('inbox');
  const [page,setPage]=useState(0);
  const [unread,setUnread]=useState(0);
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
        let query=api.from('ghost_notifications').select('*').eq('profile_id',profileId)
          .eq('archived',tab==='archived');
        if(tab==='unread')query=query.eq('read',false);
        if(tab!=='inbox'&&tab!=='unread'&&tab!=='archived')query=query.eq('category',tab);
        const [inbox,count,settings]=await Promise.all([
          query.order('created_at',{ascending:false}).order('id').range(page*pageSize,page*pageSize+pageSize),
          api.from('ghost_notifications').select('id',{count:'exact',head:true})
            .eq('profile_id',profileId).eq('read',false).eq('archived',false),
          api.from('ghost_notification_preferences').select('contributions,projects,table_talks,collaboration,following')
            .eq('profile_id',profileId).maybeSingle(),
        ]);
        if(inbox.error)throw inbox.error;
        if(count.error)throw count.error;
        if(settings.error)throw settings.error;
        if(active){
          setItems(inbox.data);setUnread(count.count??0);setPrefs(settings.data??defaults);
          setHasPrefs(settings.data!==null);
        }
      }catch{if(active)setError('Unable to load Notifications. Refresh and try again.');}
      finally{if(active)setLoading(false);}
    })();
    return()=>{active=false;};
  },[profileId,tab,page,revision]);

  async function change(action:()=>PromiseLike<{error:unknown}>,message:string){
    if(busy)return;
    setBusy(true);setError('');setNotice('');
    try{
      const {error}=await action();
      if(error)throw error;
      setNotice(message);setRevision(value=>value+1);
    }catch{setError('The notification change could not be saved.');}
    finally{setBusy(false);}
  }
  function patch(id:string,values:{read?:boolean;archived?:boolean}){
    void change(()=>supabaseBrowser().from('ghost_notifications').update(values)
      .eq('profile_id',profileId).eq('id',id).select('id').single(),'Notification updated.');
  }
  function toggle(category:keyof Preferences){
    const next={...prefs,[category]:!prefs[category]};
    void change(()=>{
      const table=supabaseBrowser().from('ghost_notification_preferences');
      const changed:Partial<Preferences>={[category]:next[category]};
      return hasPrefs?table.update(changed).eq('profile_id',profileId).select('profile_id').single()
        :table.insert({profile_id:profileId,...next});
    },'Preferences saved.');
  }

  return <section className="gs-contributions">
    <h1>Notifications</h1><p>Updates about your work, collaborations, and exercises.</p>
    {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
    <button type="button" className="button button-outline" disabled={busy||loading}
      onClick={()=>setRevision(value=>value+1)}>Refresh</button>{' '}
    <button type="button" className="button button-light" disabled={busy||loading||unread===0}
      onClick={()=>void change(()=>supabaseBrowser().from('ghost_notifications').update({read:true})
        .eq('profile_id',profileId).eq('archived',false).eq('read',false),'Inbox marked read.')}>Mark all read</button>
    <nav className="gs-tabs" aria-label="Notification filters">{tabs.map(filter=><button key={filter}
      type="button" aria-pressed={tab===filter} className="gs-tab" onClick={()=>{setTab(filter);setPage(0);}}>
      {filter==='inbox'?'Inbox':filter==='unread'?`Unread (${unread})`:filter==='archived'?'Archived':CATEGORY_LABELS[filter]}
    </button>)}</nav>
    {loading?<p>Loading notifications…</p>:<>
      {items.length===0&&<p>No notifications in this view.</p>}
      {items.slice(0,pageSize).map(item=>{
        const type=(Object.prototype.hasOwnProperty.call(TYPE_CATEGORY,item.type)?item.type:'system_notice') as NotificationType;
        const category=item.category as NotificationCategory;
        return <NotificationItem key={item.id} notification={{
          id:item.id,type,category,title:item.title,body:item.body,
          link:item.link.startsWith('/ghost-space?')||/^\/work\/[a-f0-9-]{36}$/i.test(item.link)?item.link:'',
          read:item.read,archived:item.archived,related_work:'',created:item.created_at,updated:item.created_at,
        }} onToggleRead={()=>patch(item.id,{read:!item.read})}
          onArchive={()=>patch(item.id,{archived:true})} onUnarchive={()=>patch(item.id,{archived:false})}/>;
      })}
      {page>0&&<button type="button" onClick={()=>setPage(value=>value-1)}>Newer</button>}
      {items.length>pageSize&&<button type="button" onClick={()=>setPage(value=>value+1)}>Older</button>}
    </>}
    <fieldset className="dashboard-panel" disabled={loading||busy}>
      <legend>In-app preferences</legend>
      <p>Changes apply to future notices in each category.</p>
      {preferenceKeys.map(category=><label key={category} style={{display:'block'}}>
        <input type="checkbox" checked={prefs[category]} onChange={()=>toggle(category)}/> {category==='following'?'New work from Ghosts I follow':CATEGORY_LABELS[category]}
      </label>)}
    </fieldset>
  </section>;
}
