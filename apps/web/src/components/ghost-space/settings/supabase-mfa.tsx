import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';

export function SupabaseMfaChallenge({onVerified,onSignOut}:{onVerified:()=>void;onSignOut:()=>void}) {
  const [code,setCode]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  async function verify(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(busy||!/^\d{6}$/.test(code))return;
    setBusy(true);setError('');
    try{
      const api=supabaseBrowser();
      const {data,error}=await api.auth.mfa.listFactors();
      if(error)throw error;
      const factor=data.totp[0];
      if(!factor)throw new Error('No authenticator factor is available for this account.');
      const {error:verifyError}=await api.auth.mfa.challengeAndVerify({factorId:factor.id,code});
      if(verifyError)throw verifyError;
      onVerified();
    }catch{setError('Could not verify that authenticator code. Try a fresh code.');}
    finally{setBusy(false);}
  }
  return <main className="login-wrap form-panel">
    <h1>Verify your sign-in</h1>
    <form onSubmit={event=>void verify(event)}>
      <label htmlFor="ghost-mfa-code">Authenticator code</label>
      <input id="ghost-mfa-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}"
        maxLength={6} value={code} onChange={event=>setCode(event.target.value)} required/>
      {error&&<p role="alert">{error}</p>}
      <button className="button button-light" disabled={busy}>Verify</button>
    </form>
    <button type="button" className="button button-outline" onClick={onSignOut}>Sign out</button>
  </main>;
}

export function SupabaseMfaSettings() {
  const [factorId,setFactorId]=useState('');
  const [setup,setSetup]=useState<{id:string;secret:string}|null>(null);
  const [code,setCode]=useState('');
  const [ready,setReady]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  useEffect(()=>{
    let active=true;
    void (async()=>{
      try{
        const {data,error}=await supabaseBrowser().auth.mfa.listFactors();
        if(error)throw error;
        if(active){setFactorId(data.totp[0]?.id??'');setReady(true);}
      }catch{if(active)setError('Could not load authenticator settings.');}
    })();
    return()=>{active=false;};
  },[]);

  async function manage(operation:'enroll'|'verify'|'remove'|'cancel'){
    if(busy)return;
    setBusy(true);setError('');setNotice('');
    try{
      const mfa=supabaseBrowser().auth.mfa;
      if(operation==='enroll'){
        const {data,error}=await mfa.enroll({factorType:'totp',issuer:'Laughing Ghost Network'});
        if(error)throw error;
        setSetup({id:data.id,secret:data.totp.secret});
      }else if(operation==='verify'&&setup){
        const {error}=await mfa.challengeAndVerify({factorId:setup.id,code});
        if(error)throw error;
        setFactorId(setup.id);setSetup(null);setCode('');setNotice('Authenticator enabled.');
      }else{
        const id=operation==='cancel'?setup?.id:factorId;
        if(!id)return;
        const {error}=await mfa.unenroll({factorId:id});
        if(error)throw error;
        if(operation==='remove'){setFactorId('');setNotice('Authenticator removed.');}
        setSetup(null);setCode('');
      }
    }catch{setError('Could not complete the authenticator change. Try again with a fresh code if prompted.');}
    finally{setBusy(false);}
  }

  return <section className="dashboard-panel">
    <h2>Authenticator MFA</h2>
    <p>Use a time-based code from an authenticator app. Keep access to that app before signing out.</p>
    {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
    {ready&&(factorId?<button type="button" className="button button-outline" disabled={busy}
      onClick={()=>{if(window.confirm('Remove your authenticator factor?'))void manage('remove');}}>Remove authenticator</button>:
      setup?<form onSubmit={event=>{event.preventDefault();if(/^\d{6}$/.test(code))void manage('verify');}}>
        <p>Add a time-based account manually in your authenticator using this setup key:</p>
        <code>{setup.secret}</code>
        <label htmlFor="settings-mfa-code">First authenticator code</label>
        <input id="settings-mfa-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}"
          maxLength={6} value={code} onChange={event=>setCode(event.target.value)} required/>
        <button className="button button-light" disabled={busy}>Enable authenticator</button>
        <button type="button" className="button button-outline" disabled={busy} onClick={()=>void manage('cancel')}>Cancel setup</button>
      </form>:<button type="button" className="button button-outline" disabled={busy}
        onClick={()=>void manage('enroll')}>Set up authenticator</button>)}
  </section>;
}
