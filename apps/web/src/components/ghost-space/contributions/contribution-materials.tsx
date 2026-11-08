import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { CONTENT_LANGUAGES } from '@/lib/languages';
import { supabaseBrowser } from '@/lib/supabase-browser';
import type { GhostContribution } from './supabase-contributions';

type Material = { id:string; label:string; kind:'translation'|'attachment' };

export function ContributionMaterials({item,onClose}:{item:GhostContribution;onClose:()=>void}) {
  const [mode,setMode] = useState<Material['kind']>('translation');
  const [items,setItems] = useState<Material[]>([]);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');

  async function list() {
    const api=supabaseBrowser();
    const [translations,attachments]=await Promise.all([
      api.from('ghost_contribution_translations').select('id,language')
        .eq('contribution_id',item.id).eq('version',item.version).order('language'),
      api.from('ghost_contribution_text_attachments').select('id,filename')
        .eq('contribution_id',item.id).eq('version',item.version).order('filename'),
    ]);
    if(translations.error||attachments.error)throw translations.error||attachments.error;
    return [
      ...(translations.data??[]).map(row=>({id:row.id,label:row.language,kind:'translation' as const})),
      ...(attachments.data??[]).map(row=>({id:row.id,label:row.filename,kind:'attachment' as const})),
    ];
  }

  useEffect(() => {
    let active=true;
    void list().then(rows=>{if(active)setItems(rows);}).catch(()=>{
      if(active)setError('Unable to load published materials.');
    });
    return ()=>{active=false;};
  },[item.id,item.version]);

  async function add(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(busy)return;
    const element=event.currentTarget;
    const form=new FormData(element);
    const value=(name:string)=>String(form.get(name)??'').trim();
    const target={contribution_id:item.id,version:item.version};
    setBusy(true);setError('');setNotice('');
    try {
      const api=supabaseBrowser();
      if(mode==='translation'){
        const {error}=await api.from('ghost_contribution_translations').insert({
          ...target,language:value('language'),source:value('source'),title:value('title'),
          summary:value('summary'),body:value('body'),
        });
        if(error)throw error;
      } else {
        const file=form.get('file');
        if(!(file instanceof File)||file.size<1||file.size>65536)
          throw new Error('Choose a UTF-8 text file up to 64 KiB.');
        if(!/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(file.name))
          throw new Error('Use a filename with up to 100 letters, numbers, dots, dashes or underscores.');
        let content:string;
        try { content=new TextDecoder('utf-8',{fatal:true}).decode(await file.arrayBuffer()); }
        catch { throw new Error('The attachment must contain valid UTF-8 text.'); }
        const {error}=await api.from('ghost_contribution_text_attachments').insert({
          ...target,filename:file.name,content,
        });
        if(error)throw error;
      }
      element.reset();
      setItems(await list());
      setNotice('Material published.');
    } catch(e) {
      setError(e instanceof Error?e.message:
        'Material could not be published. Check for duplicates, credential-like text, invalid content, or a newer article version.');
    } finally { setBusy(false); }
  }

  async function remove(material:Material) {
    if(busy)return;
    setBusy(true);setError('');setNotice('');
    try {
      const api=supabaseBrowser();
      const result=material.kind==='translation'
        ?await api.from('ghost_contribution_translations').delete().eq('id',material.id)
        :await api.from('ghost_contribution_text_attachments').delete().eq('id',material.id);
      if(result.error)throw result.error;
      setItems(await list());
      setNotice('Materials updated.');
    } catch { setError('Unable to remove the material.'); }
    finally { setBusy(false); }
  }

  return <div className="gs-overlay" role="dialog" aria-modal="true" aria-labelledby="materials-title">
    <div className="gs-overlay-panel gs-editor">
      <h2 id="materials-title">Published materials</h2>
      <p>Translations and text files apply to article version {item.version}. A new article revision requires updated materials.</p>
      {error&&<p role="alert">{error}</p>}
      {notice&&<p role="status">{notice}</p>}
      <ul>{items.map(material=><li key={material.id}>
        {material.kind} · {material.label}{' '}
        <button type="button" disabled={busy} onClick={()=>void remove(material)}>Remove</button>
      </li>)}</ul>
      <div className="gs-builder-actions">
        <button type="button" disabled={busy} onClick={()=>setMode('translation')}>Translation</button>
        <button type="button" disabled={busy} onClick={()=>setMode('attachment')}>Text attachment</button>
      </div>
      <form key={mode} onSubmit={event=>void add(event)}>
        {mode==='translation'?<>
          <div className="field"><label htmlFor="material-language">Translation language</label>
            <select id="material-language" name="language" required>
              <option value="">Select language</option>
              {CONTENT_LANGUAGES.filter(language=>language.code!==item.language)
                .map(language=><option key={language.code} value={language.code}>{language.native}</option>)}
            </select>
          </div>
          <div className="field"><label htmlFor="material-source">Translation source</label>
            <select id="material-source" name="source"><option value="human">Human</option><option value="machine">Machine</option></select>
          </div>
          <div className="field"><label htmlFor="material-title">Translated title</label>
            <input id="material-title" name="title" required maxLength={180}/></div>
          <div className="field"><label htmlFor="material-summary">Translated summary</label>
            <textarea id="material-summary" name="summary" maxLength={500}/></div>
          <div className="field"><label htmlFor="material-body">Translated body</label>
            <textarea id="material-body" name="body" maxLength={50000} rows={8}/></div>
        </>:<div className="field"><label htmlFor="material-file">UTF-8 text file (up to 64 KiB)</label>
          <input id="material-file" name="file" type="file" required/></div>}
        <div className="gs-builder-actions">
          <button type="button" className="button button-outline" disabled={busy} onClick={onClose}>Close</button>
          <button type="submit" className="button button-light" disabled={busy}>{busy?'Saving…':'Publish material'}</button>
        </div>
      </form>
    </div>
  </div>;
}
