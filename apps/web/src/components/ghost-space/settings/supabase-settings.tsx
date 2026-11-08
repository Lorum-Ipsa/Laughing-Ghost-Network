import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router';
import { CONTENT_LANGUAGES, DEFAULT_CONTENT_LANGUAGE } from '@/lib/languages';
import { resetPasswordRedirect, supabaseBrowser } from '@/lib/supabase-browser';

export function SupabaseSettings({userId,email,handle}:{userId:string;email:string;handle:string}) {
  const [language,setLanguage]=useState(DEFAULT_CONTENT_LANGUAGE);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [confirmSignOut,setConfirmSignOut]=useState(false);
  const [recoverySent,setRecoverySent]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');

  useEffect(()=>{
    let active=true;
    void (async()=>{
      try{
        const {data,error}=await supabaseBrowser().from('ghost_profile_preferences')
          .select('preferred_publication_language').eq('user_id',userId).single();
        if(error)throw error;
        if(active){
          setLanguage(CONTENT_LANGUAGES.some(item=>item.code===data.preferred_publication_language)
            ?data.preferred_publication_language:DEFAULT_CONTENT_LANGUAGE);
          setLoading(false);
        }
      }catch{
        if(active){setError('Could not load your publication preference.');setLoading(false);}
      }
    })();
    return()=>{active=false;};
  },[userId]);

  async function change(action:()=>PromiseLike<{error:unknown}>,success:string,failure:string,onSuccess?:()=>void){
    if(busy)return;
    setBusy(true);setError('');setNotice('');
    try{
      const {error}=await action();
      if(error)throw error;
      setNotice(success);onSuccess?.();
    }catch{setError(failure);}
    finally{setBusy(false);}
  }

  function saveLanguage(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!CONTENT_LANGUAGES.some(item=>item.code===language))return;
    void change(()=>supabaseBrowser().from('ghost_profile_preferences')
      .update({preferred_publication_language:language}).eq('user_id',userId).select('user_id').single(),
      'Publication language saved.','Could not save your publication language.');
  }

  return <section className="gs-contributions">
    <h1>Settings</h1>
    {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
    <section className="dashboard-panel">
      <h2>Account</h2>
      <dl><dt>Ghost handle</dt><dd>@{handle}</dd><dt>Private sign-in email</dt><dd>{email||'Unavailable'}</dd></dl>
      <Link to="/ghost-space?section=profile">Edit your public profile</Link>
    </section>
    <section className="dashboard-panel">
      <h2>Password and sessions</h2>
      <p>Use a password reset link sent to your sign-in email to change your password.</p>
      <button type="button" className="button button-outline" disabled={busy||!email||recoverySent}
        onClick={()=>void change(()=>supabaseBrowser().auth.resetPasswordForEmail(email,{redirectTo:resetPasswordRedirect()}),
          'Password reset requested. Check your email.','Could not request a password reset. Try again later.',()=>setRecoverySent(true))}>
        Email password reset link
      </button>
      <p>Sign out other sessions while keeping this browser signed in. Existing access tokens can remain valid until they expire.</p>
      {confirmSignOut?<div className="gs-builder-actions">
        <button type="button" className="button button-outline" disabled={busy} onClick={()=>setConfirmSignOut(false)}>Cancel</button>
        <button type="button" className="button button-light" disabled={busy}
          onClick={()=>void change(()=>supabaseBrowser().auth.signOut({scope:'others'}),
            'Other sessions signed out. This session stays active.','Could not sign out other sessions.',()=>setConfirmSignOut(false))}>
          Confirm sign-out
        </button>
      </div>:<button type="button" className="button button-outline" disabled={busy}
        onClick={()=>setConfirmSignOut(true)}>Sign out other sessions</button>}
    </section>
    <form className="dashboard-panel" onSubmit={saveLanguage}>
      <h2>Publication preferences</h2>
      <p>This default applies to new contributions. You can choose a different language on each draft.</p>
      <label htmlFor="settings-publication-language">Default publication language</label>
      <select id="settings-publication-language" disabled={loading||busy} value={language}
        onChange={event=>setLanguage(event.target.value)}>
        {CONTENT_LANGUAGES.map(item=><option key={item.code} value={item.code}>{item.native}</option>)}
      </select>
      <button className="button button-light" disabled={loading||busy}>Save language</button>
    </form>
    <section className="dashboard-panel">
      <h2>Notifications</h2>
      <Link to="/ghost-space?section=notifications">Manage inbox preferences and browser push</Link>
    </section>
  </section>;
}
