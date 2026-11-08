import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useSupabaseAuth } from '@/hooks/use-supabase-auth';
import { supabaseBrowser } from '@/lib/supabase-browser';
export function ReportForm() {
  const { isAuthed, isLoading } = useSupabaseAuth();
  const [params] = useSearchParams();
  const contributionId = params.get('report'); const [busy, setBusy] = useState(false); const [sent, setSent] = useState(false); const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAuthed || busy) return;
    setBusy(true); setError('');
    const form = new FormData(event.currentTarget);
    try {
      const {error: saveError} = await supabaseBrowser().from('ghost_contribution_reports').insert({
        contribution_id: contributionId,
        subject: String(form.get('subject') ?? '').trim(),
        body: String(form.get('body') ?? '').trim(),
      });
      if (saveError) throw saveError;
      setSent(true);
    } catch {
      setError('The report was not saved. If the article was removed, return to the Code page and submit a general report.');
    } finally { setBusy(false); }
  }
  return <section id="report" className="prose-section"><h2>Something to report?</h2><p>This form sends a private report to moderation. Do not attach any secrets or unnecessary personal data. In an emergency or immediate danger, contact the relevant authorities; this form is not an emergency channel.</p>{isLoading ? <p className="loading-state">Loading session…</p> : !isAuthed ? <Link to="/login" className="button button-outline" style={{ marginTop: 25 }}>Sign in to report ↗</Link> : sent ? <div className="status-message" style={{ marginTop: 25 }} role="status">Report recorded. It is accessible only to moderation.</div> : <form onSubmit={submit} style={{ marginTop: 25 }}><div className="field"><label htmlFor="report-subject">Report subject</label><input id="report-subject" name="subject" required maxLength={180} placeholder="Contribution or behavior concerned"/></div><div className="field"><label htmlFor="report-body">Facts and context</label><textarea id="report-body" name="body" required minLength={20} maxLength={5000} placeholder="Describe the facts and indicate useful links, without disclosing any private identity."/></div>{error && <div role="alert" className="status-message error-message">{error}</div>}<button disabled={busy} className="button button-outline">{busy ? 'Saving…' : 'Send to moderation ↗'}</button></form>}</section>;
}
