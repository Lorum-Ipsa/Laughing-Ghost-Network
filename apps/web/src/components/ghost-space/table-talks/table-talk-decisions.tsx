import { useEffect, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { pocketbaseClient as pb } from '@/lib/pocketbase-client';
import { tagsOf, type ExerciseDecision, type Work } from '@/lib/network';

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.round(days / 30)}mo ago`;
}

/**
 * The Decisions tab of a Table Talks exercise. A participant submits the
 * decisions they make at each decision point — the decision itself and the
 * rationale behind it. A participant sees only their own decisions; the
 * facilitator sees every participant's decisions. No scores or rankings —
 * only the reasoning, recorded for the debrief.
 */
export function TableTalkDecisions({ work, isFacilitator }: { work: Work; isFacilitator: boolean }) {
  const { user } = useAuth();
  const [decisions, setDecisions] = useState<ExerciseDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    pb.collection('ghost_exercise_decisions')
      .getFullList<ExerciseDecision>({
        filter: pb.filter('work = {:id}', { id: work.id }),
        expand: 'owner',
        sort: 'created',
        requestKey: null,
      })
      .then((rows) => { if (active) setDecisions(rows); })
      .catch(() => { if (active) setError('Could not load decisions.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [work]);

  async function remove(id: string) {
    setError('');
    try {
      await pb.collection('ghost_exercise_decisions').delete(id);
      setDecisions((prev) => prev.filter((d) => d.id !== id));
    } catch {
      setError('Could not remove the decision.');
    }
  }

  function onCreated(decision: ExerciseDecision) {
    setDecisions((prev) => [...prev, decision]);
    setCreating(false);
  }

  const points = tagsOf(work.decision_points).filter(Boolean);

  return (
    <div className="gs-detail-section">
      {error && <div className="status-message error-message" role="alert">{error}</div>}
      {!isFacilitator && !creating && (
        <button type="button" className="button button-outline gs-add-btn" onClick={() => setCreating(true)}>
          <Plus size={14} strokeWidth={1.5} /> Record a decision
        </button>
      )}
      {creating && (
        <DecisionForm work={work} defaultRole="" decisionPoints={points} onDone={onCreated} onCancel={() => setCreating(false)} />
      )}
      {loading ? (
        <p className="muted-note">Loading decisions…</p>
      ) : decisions.length === 0 && !creating ? (
        <p className="muted-note">No decisions recorded yet. {isFacilitator ? 'Decisions participants submit during the exercise appear here.' : 'Record a decision at a decision point to capture your reasoning for the debrief.'}</p>
      ) : (
        <ul className="gs-decision-list">
          {decisions.map((d) => {
            const mine = d.owner === user?.id;
            const author = d.expand?.owner;
            return (
              <li key={d.id} className="gs-decision">
                <div className="gs-decision-head">
                  <span className="gs-decision-point">{d.decision_point}</span>
                  <span className="gs-decision-date">{relativeTime(d.created)}</span>
                </div>
                {d.role && <span className="gs-decision-role">Role: {d.role}</span>}
                <p className="gs-decision-body">{d.decision}</p>
                {d.rationale && <p className="gs-decision-rationale">{d.rationale}</p>}
                <div className="gs-decision-foot">
                  <span className="gs-decision-author">{isFacilitator && !mine ? (author?.name || 'Participant') : 'You'}</span>
                  {(mine || isFacilitator) && <button type="button" className="gs-icon-btn" aria-label="Delete decision" onClick={() => remove(d.id)}><Trash2 size={13} strokeWidth={1.5} /></button>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function DecisionForm({ work, defaultRole, decisionPoints, onDone, onCancel }: { work: Work; defaultRole: string; decisionPoints: string[]; onDone: (d: ExerciseDecision) => void; onCancel: () => void }) {
  const { user } = useAuth();
  const [decisionPoint, setDecisionPoint] = useState('');
  const [role, setRole] = useState(defaultRole);
  const [decision, setDecision] = useState('');
  const [rationale, setRationale] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    if (!user || !decisionPoint.trim() || !decision.trim()) return;
    setBusy(true);
    setError('');
    try {
      const rec = await pb.collection('ghost_exercise_decisions').create<ExerciseDecision>({
        owner: user.id,
        work: work.id,
        role: role.trim(),
        decision_point: decisionPoint.trim(),
        decision: decision.trim(),
        rationale: rationale.trim(),
      });
      onDone(rec);
    } catch {
      setError('The decision was not saved.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="gs-inline-form">
      <div className="field">
        <label htmlFor="dec-point">Decision point *</label>
        {decisionPoints.length > 0 ? (
          <select id="dec-point" value={decisionPoint} onChange={(e) => setDecisionPoint(e.target.value)}>
            <option value="">Select a decision point…</option>
            {decisionPoints.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        ) : (
          <input id="dec-point" value={decisionPoint} onChange={(e) => setDecisionPoint(e.target.value)} maxLength={500} placeholder="The decision you are responding to" />
        )}
      </div>
      <div className="field"><label htmlFor="dec-role">Your role</label><input id="dec-role" value={role} onChange={(e) => setRole(e.target.value)} maxLength={100} placeholder="Incident Analyst" /></div>
      <div className="field"><label htmlFor="dec-decision">Decision *</label><textarea id="dec-decision" value={decision} onChange={(e) => setDecision(e.target.value)} maxLength={2000} style={{ minHeight: 70 }} placeholder="What you decided to do." /></div>
      <div className="field"><label htmlFor="dec-rationale">Rationale</label><textarea id="dec-rationale" value={rationale} onChange={(e) => setRationale(e.target.value)} maxLength={5000} style={{ minHeight: 80 }} placeholder="The evidence and reasoning behind the decision." /></div>
      {error && <div className="status-message error-message" role="alert">{error}</div>}
      <div className="gs-editor-actions">
        <button type="button" className="button button-light" disabled={busy || !decisionPoint.trim() || !decision.trim()} onClick={save}>{busy ? 'Saving…' : 'Record decision'}</button>
        <button type="button" className="button button-outline" onClick={onCancel}><X size={13} strokeWidth={1.5} /> Cancel</button>
      </div>
    </div>
  );
}
