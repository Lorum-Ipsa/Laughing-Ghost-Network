import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { ghostProfilePath } from '@/lib/ghost-handle';
import type { Database } from '@/lib/supabase.database.types';

type Tables=Database['public']['Tables'];
type Thread=Tables['ghost_dm_threads']['Row'];
type Message=Omit<Tables['ghost_direct_messages']['Row'],'client_id'>;
type Contact={id:string;handle?:string;thread?:Thread;connected:boolean};
const pageSize=50;

export function SupabaseMessages({profileId}:{profileId:string}) {
  const [params,setParams]=useSearchParams();
  const recipient=params.get('with');
  const [contacts,setContacts]=useState<Contact[]>([]);
  const [messages,setMessages]=useState<Message[]>([]);
  const [loadedRecipient,setLoadedRecipient]=useState<string|null>(null);
  const [page,setPage]=useState(0);
  const [revision,setRevision]=useState(0);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const contact=contacts.find(item=>item.id===recipient);
  const refresh=()=>setRevision(value=>value+1);

  useEffect(()=>{
    const api=supabaseBrowser();
    let timer:number|undefined;
    function invalidate(){
      window.clearTimeout(timer);
      timer=window.setTimeout(()=>setRevision(value=>value+1),150);
    }
    const channel=api.channel(`ghost-dm-${profileId}`);
    for(const column of ['first_profile_id','second_profile_id']){
      channel.on('postgres_changes',{
        event:'*',schema:'public',table:'ghost_dm_threads',filter:`${column}=eq.${profileId}`,
      },invalidate);
    }
    channel.subscribe(status=>{if(status==='SUBSCRIBED')invalidate();});
    return()=>{window.clearTimeout(timer);void api.removeChannel(channel);};
  },[profileId]);

  useEffect(()=>{
    let active=true;
    setLoading(true);setError('');
    void (async()=>{
      try{
        const api=supabaseBrowser();
        const [threads,connections]=await Promise.all([
          api.from('ghost_dm_threads').select('*').order('updated_at',{ascending:false}),
          api.from('ghost_collaboration_requests').select('sender_profile_id,recipient_profile_id').eq('status','accepted'),
        ]);
        if(threads.error)throw threads.error;
        if(connections.error)throw connections.error;
        const records=new Map<string,Contact>();
        for(const thread of threads.data){
          const id=thread.first_profile_id===profileId?thread.second_profile_id:thread.first_profile_id;
          records.set(id,{id,thread,connected:false});
        }
        for(const row of connections.data){
          const id=row.sender_profile_id===profileId?row.recipient_profile_id:row.sender_profile_id;
          const existing=records.get(id);
          if(existing)existing.connected=true;
          else records.set(id,{id,connected:true});
        }
        const ids=[...records.keys()];
        for(let offset=0;offset<ids.length;offset+=100){
          const {data,error}=await api.from('ghost_profiles').select('id,handle').in('id',ids.slice(offset,offset+100));
          if(error)throw error;
          for(const row of data){const record=records.get(row.id);if(record)record.handle=row.handle;}
        }
        const current=recipient?records.get(recipient):undefined;
        let items:Message[]=[];
        if(current?.thread){
          const {data,error}=await api.from('ghost_direct_messages')
            .select('id,thread_id,sender_profile_id,body,created_at').eq('thread_id',current.thread.id)
            .order('created_at',{ascending:false}).order('id',{ascending:false})
            .range(page*pageSize,page*pageSize+pageSize);
          if(error)throw error;
          items=data;
        }
        if(active){setContacts([...records.values()]);setMessages(items);setLoadedRecipient(recipient);}
      }catch{if(active)setError('Unable to load Messages. Refresh and try again.');}
      finally{if(active)setLoading(false);}
    })();
    return()=>{active=false;};
  },[profileId,recipient,page,revision]);

  return <section className="gs-contributions">
    <h1>Messages</h1><p>Private conversations with mutual connections.</p>
    <button className="button button-outline" type="button" onClick={refresh}>Refresh</button>
    {error&&<p role="alert">{error}</p>}
    {loading&&!contacts.length?<p>Loading conversations…</p>:<ul className="gs-card-list">
      {contacts.map(item=><li key={item.id}>
        <button type="button" className="button button-outline" aria-pressed={recipient===item.id}
          onClick={()=>{setPage(0);setParams({section:'messages',with:item.id});}}>
          {item.handle?'@'+item.handle:'Ghost profile unavailable'}{item.connected?'':' · history only'}
        </button>
      </li>)}
    </ul>}
    {!loading&&!contacts.length&&<p>No conversations yet. <Link to="/ghost-space?section=network">Find a mutual connection in Network</Link>.</p>}
    {recipient&&!contact&&!loading&&<p>This conversation is unavailable.</p>}
    {contact&&<div className="dashboard-panel" key={contact.id}>
      <h2>{contact.handle?<Link to={ghostProfilePath(contact.handle)}>@{contact.handle}</Link>:'Ghost profile unavailable'}</h2>
      {loading||loadedRecipient!==recipient?<p>Loading messages…</p>:<>
        {messages.length===0&&<p>No messages yet.</p>}
        {messages.length>pageSize&&<button type="button" onClick={()=>setPage(value=>value+1)}>Older messages</button>}
        {page>0&&<button type="button" onClick={()=>setPage(value=>value-1)}>Newer messages</button>}
        <ol>{messages.slice(0,pageSize).reverse().map(message=><li key={message.id}>
          <strong>{message.sender_profile_id===profileId?'You':contact.handle?'@'+contact.handle:'Ghost'}</strong>{' '}
          <time dateTime={message.created_at}>{new Date(message.created_at).toLocaleString()}</time>
          <p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{message.body}</p>
        </li>)}</ol>
      </>}
      {contact.connected&&contact.handle?<MessageComposer recipient={contact.id} onSent={()=>{setPage(0);refresh();}}/>:
        <p>Conversation history is available. Reconnect in Network to send another message.</p>}
    </div>}
  </section>;
}

function MessageComposer({recipient,onSent}:{recipient:string;onSent:()=>void}) {
  const [body,setBody]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const attempt=useRef<{id:string;body:string}|null>(null);

  async function send(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const content=body.trim();
    if(busy||!content)return;
    setBusy(true);setError('');
    try{
      if(attempt.current?.body!==content)attempt.current={id:crypto.randomUUID(),body:content};
      const {error}=await supabaseBrowser().rpc('send_ghost_direct_message',{
        p_recipient_profile_id:recipient,p_client_id:attempt.current.id,p_body:content,
      });
      if(error)throw error;
      attempt.current=null;
      setBody('');onSent();
    }catch(e){
      setError(typeof e==='object'&&e!==null&&'code' in e&&e.code==='42501'
        ?'An active mutual connection is required to send a message.'
        :'Message could not be sent. Try again to retry the same send.');
    }finally{setBusy(false);}
  }

  return <form onSubmit={event=>void send(event)}>
    <label htmlFor="dm-body">Message</label>
    <textarea id="dm-body" value={body} maxLength={4000} required disabled={busy}
      onChange={event=>setBody(event.target.value)}/>
    {error&&<p role="alert">{error}</p>}
    <button className="button button-light" disabled={busy||!body.trim()}>{busy?'Sending…':'Send message'}</button>
  </form>;
}
