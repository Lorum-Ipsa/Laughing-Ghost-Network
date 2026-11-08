import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import {
  createDmCipher, getOrCreateDmIdentity, readDmIdentity, readDmVerification, verifyDmSafetyCode,
} from '@/lib/dm-crypto';

type Cipher=Awaited<ReturnType<typeof createDmCipher>>;
type State={
  profileId:string;
  peerId:string|null;
  needsKey:boolean;
  unavailable:boolean;
  waitingForPeer:boolean;
  cipher:Cipher|null;
  verified:boolean;
};
const initial:State={profileId:'',peerId:null,needsKey:false,unavailable:false,waitingForPeer:false,cipher:null,verified:false};

export function useDmEncryption(profileId:string,peerId:string|null,refresh:number){
  const [state,setState]=useState<State>(initial);
  const [revision,setRevision]=useState(0);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const current=state.profileId===profileId&&state.peerId===peerId?state:initial;

  useEffect(()=>{
    let active=true;
    setLoading(true);setError('');
    setState(initial);
    void (async()=>{
      try{
        const api=supabaseBrowser();
        const [local,keys]=await Promise.all([
          readDmIdentity(profileId),
          api.from('ghost_dm_identity_keys').select('profile_id,public_key')
            .in('profile_id',peerId?[profileId,peerId]:[profileId]),
        ]);
        if(keys.error)throw keys.error;
        const registered=keys.data.find(row=>row.profile_id===profileId);
        const peer=keys.data.find(row=>row.profile_id===peerId);
        const next:State={...initial,profileId,peerId,needsKey:!registered,
          unavailable:!!registered&&registered.public_key!==local?.publicKey,
          waitingForPeer:!!peerId&&!peer};
        if(registered&&local&&registered.public_key===local.publicKey&&peer&&peerId){
          const cipher=await createDmCipher(local,profileId,{profileId:peerId,publicKey:peer.public_key});
          const pinned=await readDmVerification(profileId,peerId);
          if(pinned&&pinned!==cipher.safetyCode)throw new Error('The verified safety code changed. Encrypted messaging is blocked.');
          next.cipher=cipher;next.verified=pinned===cipher.safetyCode;
        }
        if(active)setState(next);
      }catch(e){
        if(active)setError(e instanceof Error?e.message:'Unable to load message encryption.');
      }finally{if(active)setLoading(false);}
    })();
    return()=>{active=false;};
  },[profileId,peerId,refresh,revision]);

  async function enable(){
    if(busy||!current.needsKey)return;
    setBusy(true);setError('');
    try{
      const identity=await getOrCreateDmIdentity(profileId);
      const result=await supabaseBrowser().from('ghost_dm_identity_keys').insert({
        profile_id:profileId,public_key:identity.publicKey,
      });
      if(result.error&&result.error.code!=='23505')throw result.error;
      setRevision(value=>value+1);
    }catch{setError('Could not enable encryption on this browser.');}
    finally{setBusy(false);}
  }

  async function verify(code:string){
    if(!current.cipher||!peerId||busy)return;
    if(code.replace(/\s/g,'').toLowerCase()!==current.cipher.safetyCode){
      setError('The safety codes do not match. Do not send a message.');
      return;
    }
    setBusy(true);setError('');
    try{
      await verifyDmSafetyCode(profileId,peerId,current.cipher.safetyCode);
      setRevision(value=>value+1);
    }catch{setError('Could not save this verification.');}
    finally{setBusy(false);}
  }

  return {...current,loading,busy,error,enable,verify};
}
