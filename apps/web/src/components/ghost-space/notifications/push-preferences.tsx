import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';

function decodeKey(value:string){
  const base64=value.replaceAll('-','+').replaceAll('_','/').padEnd(Math.ceil(value.length/4)*4,'=');
  return Uint8Array.from(atob(base64),character=>character.charCodeAt(0));
}

export function PushPreferences({profileId}:{profileId:string}) {
  const [key,setKey]=useState<string|null>(null);
  const [supported,setSupported]=useState(false);
  const [enabled,setEnabled]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');

  useEffect(()=>{
    const available=window.isSecureContext&&'serviceWorker' in navigator
      &&'PushManager' in window&&'Notification' in window;
    setSupported(available);
    if(!available)return;
    let active=true;
    void (async()=>{
      try{
        const api=supabaseBrowser();
        const {data,error}=await api.rpc('ghost_push_public_key');
        if(error)throw error;
        const registration=await navigator.serviceWorker.getRegistration('/');
        const subscription=await registration?.pushManager.getSubscription();
        let registered=false;
        if(subscription){
          const result=await api.from('ghost_push_subscriptions').select('id')
            .eq('profile_id',profileId).eq('endpoint',subscription.endpoint).maybeSingle();
          if(result.error)throw result.error;
          registered=result.data!==null;
        }
        if(active){setKey(data);setEnabled(registered);}
      }catch{if(active)setError('Could not check browser push settings.');}
    })();
    return()=>{active=false;};
  },[profileId]);

  async function enable(){
    if(!key||busy)return;
    setBusy(true);setError('');
    let created:PushSubscription|null=null;
    try{
      if(await Notification.requestPermission()!=='granted')throw new Error('Allow notifications in your browser to enable push.');
      await navigator.serviceWorker.register('/lgn-push-sw.js');
      const registration=await navigator.serviceWorker.ready;
      let subscription=await registration.pushManager.getSubscription();
      if(!subscription){
        subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decodeKey(key)});
        created=subscription;
      }
      const keys=subscription.toJSON().keys;
      if(!keys?.p256dh||!keys.auth)throw new Error('This browser did not return usable subscription keys.');
      const {error}=await supabaseBrowser().from('ghost_push_subscriptions').insert({
        profile_id:profileId,endpoint:subscription.endpoint,p256dh:keys.p256dh,auth:keys.auth,
      });
      if(error){
        if(error.code==='23505')throw new Error('This browser is already registered. Disable push in the original account before switching accounts.');
        throw error;
      }
      setEnabled(true);
    }catch(e){
      if(created)await created.unsubscribe().catch(()=>false);
      setError(e instanceof Error?e.message:'Could not enable push on this browser.');
    }finally{setBusy(false);}
  }

  async function disable(){
    if(busy)return;
    setBusy(true);setError('');
    try{
      const registration=await navigator.serviceWorker.getRegistration('/');
      const subscription=await registration?.pushManager.getSubscription();
      if(subscription){
        const {error}=await supabaseBrowser().from('ghost_push_subscriptions').delete()
          .eq('profile_id',profileId).eq('endpoint',subscription.endpoint);
        if(error)throw error;
        await subscription.unsubscribe();
      }
      setEnabled(false);
    }catch{setError('Could not disable push on this browser.');}
    finally{setBusy(false);}
  }

  return <section className="dashboard-panel">
    <h2>Browser push</h2>
    <p>Opt in on this device to receive a generic notice when new items arrive. Use a device you control.</p>
    {error&&<p role="alert">{error}</p>}
    {!supported?<p>This browser or page does not support push.</p>:!key&&!enabled?<p>Push delivery is not ready in this environment.</p>:
      <button type="button" className="button button-outline" disabled={busy}
        onClick={()=>void (enabled?disable():enable())}>{enabled?'Disable push on this device':'Enable push on this device'}</button>}
  </section>;
}
