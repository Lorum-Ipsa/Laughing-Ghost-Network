import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { supabaseBrowser } from '@/lib/supabase-browser';
import type { Database } from '@/lib/supabase.database.types';

type Report = Pick<Database['public']['Tables']['ghost_contribution_reports']['Row'],
  'id'|'contribution_id'|'contribution_version'|'subject'|'body'>;

export function SupabaseContributionReports() {
  const [allowed,setAllowed] = useState(false);
  const [reports,setReports] = useState<Report[]>([]);
  const [selected,setSelected] = useState<Report|null>(null);
  const [note,setNote] = useState('');
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const api = supabaseBrowser();
        const {data: permitted,error: authError} = await api.rpc('can_moderate_reports');
        if(authError)throw authError;
        if(!active||!permitted)return;
        setAllowed(true);
        const {data,error: listError} = await api.from('ghost_contribution_reports')
          .select('id,contribution_id,contribution_version,subject,body')
          .is('outcome',null).order('created_at').limit(100);
        if(listError)throw listError;
        if(active)setReports(data);
      } catch {
        if(active)setError('Unable to load private reports.');
      }
    })();
    return () => { active = false; };
  },[]);

  async function resolve(outcome:'dismissed'|'taken_down') {
    if(!selected||busy||!note.trim())return;
    setBusy(true);setError('');setNotice('');
    try {
      const {error: decisionError} = await supabaseBrowser().rpc('resolve_contribution_report',{
        p_report_id:selected.id,p_outcome:outcome,p_note:note.trim(),
      });
      if(decisionError)throw decisionError;
      setReports(current=>current.filter(report=>report.id!==selected.id));
      setSelected(null);setNote('');
      setNotice(outcome==='taken_down'?'Reported version removed from public view.':'Report dismissed.');
    } catch(e) {
      setError(typeof e==='object'&&e!==null&&'message' in e ? String(e.message) : 'Report decision failed.');
    } finally { setBusy(false); }
  }

  if(!allowed)return error?<p role="alert">{error}</p>:null;
  return <section className="dashboard-panel" aria-labelledby="moderator-reports-heading">
    <h2 id="moderator-reports-heading">Private reports</h2>
    {error&&<p role="alert">{error}</p>}
    {notice&&<p role="status">{notice}</p>}
    {reports.length===0?<p>No open reports.</p>:<ul className="gs-card-list">
      {reports.map(report=><li key={report.id}>
        <button type="button" className="button button-outline" disabled={busy}
          onClick={()=>{setSelected(report);setNote('');setError('');}}>{report.subject}</button>
      </li>)}
    </ul>}
    {selected&&<div>
      <h3>{selected.subject}</h3>
      {selected.contribution_id&&<Link to={`/work/${selected.contribution_id}`}>
        Open reported article · reported version {selected.contribution_version}
      </Link>}
      <p style={{whiteSpace:'pre-wrap'}}>{selected.body}</p>
      <label htmlFor="report-decision-note">Decision reason</label>
      <textarea id="report-decision-note" value={note} maxLength={4000}
        onChange={event=>setNote(event.target.value)}/>
      <div className="gs-builder-actions">
        <button type="button" className="button button-outline" disabled={busy||!note.trim()}
          onClick={()=>void resolve('dismissed')}>Dismiss report</button>
        {selected.contribution_id&&<button type="button" className="button button-outline"
          disabled={busy||!note.trim()} onClick={()=>void resolve('taken_down')}>Remove reported version</button>}
      </div>
    </div>}
  </section>;
}
