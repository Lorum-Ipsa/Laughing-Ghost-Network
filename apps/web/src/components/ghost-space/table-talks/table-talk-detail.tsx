import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, ExternalLink, Settings, BookOpen, ClipboardList, Clock, FlaskConical, GitBranch, Scale, Users, Radio, Check, X, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { pocketbaseClient as pb } from '@/lib/pocketbase-client';
import { kindLabels, paragraphs, safeExternal, tagsOf, type GhostProfile, type Participation, type Work } from '@/lib/network';
import { EXERCISE_STATUSES, exerciseStatusLabel, exerciseTypeLabel, scenarioTypeLabel, difficultyLabel, durationLabel, formatModeLabel } from '@/data/table-talks';
import { contentLanguageLabel } from '@/lib/languages';
import { TableTalkDecisions } from '@/components/ghost-space/table-talks/table-talk-decisions';

type SubTab = 'overview' | 'role' | 'timeline' | 'injects' | 'evidence' | 'decisions' | 'debrief' | 'related';

const SUB_TABS: { key: SubTab; label: string; icon: typeof Settings }[] = [
  { key: 'overview', label: 'Overview', icon: BookOpen },
  { key: 'role', label: 'Role', icon: Users },
  { key: 'timeline', label: 'Timeline', icon: Clock },
  { key: 'injects', label: 'Injects', icon: Radio },
  { key: 'evidence', label: 'Evidence', icon: FlaskConical },
  { key: 'decisions', label: 'Decisions', icon: Scale },
  { key: 'debrief', label: 'Debrief', icon: ClipboardList },
  { key: 'related', label: 'Related Work', icon: GitBranch },
];

/**
 * The Table Talks exercise workspace — opened from a workspace card. A
 * facilitator (the exercise's owner) edits the scenario, manages participants
 * and roles, releases injects, and publishes the after-action summary; a
 * participant views their role, the scenario materials, the released injects,
 * submits decisions, and reads the debrief once the exercise is complete.
 *
 * The exercise lifecycle (`exercise_status`) stays independent of publication
 * `status`. No rankings or competitive scoring appear anywhere.
 */
export function TableTalkDetail({
  work,
  profile,
  membership,
  onBack,
  onRefresh,
  onEdit,
}: {
  work: Work;
  profile: GhostProfile | null;
  membership: Participation | null;
  onBack: () => void;
  onRefresh: () => void;
  onEdit: (w: Work) => void;
}) {
  const { user } = useAuth();
  const [sub, setSub] = useState<SubTab>('overview');
  const [related, setRelated] = useState<Work[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const isFacilitator = work.owner === user?.id;
  const status = exerciseStatusLabel(work.exercise_status);
  const isComplete = work.exercise_status === 'completed';
  const langLabel = contentLanguageLabel(work.language);

  useEffect(() => {
    let active = true;
    pb.collection('ghost_work')
      .getFullList<Work>({
        filter: pb.filter('id != {:id} && status = "published"', { id: work.id }),
        expand: 'author',
        sort: '-created',
        requestKey: null,
      })
      .then((rows) => {
        if (!active) return;
        const tags = new Set(tagsOf(work.tags).map((t) => t.toLowerCase()));
        setRelated(rows.filter((item) => {
          if (work.domain && item.domain && item.domain === work.domain) return true;
          if (tags.size && tagsOf(item.tags).some((t) => tags.has(t.toLowerCase()))) return true;
          return false;
        }).slice(0, 8));
      })
      .catch(() => { if (active) setRelated([]); });
    return () => { active = false; };
  }, [work]);

  async function changeExerciseStatus(target: string) {
    setBusy(true);
    setError('');
    try {
      await pb.collection('ghost_work').update(work.id, { exercise_status: target });
      onRefresh();
    } catch {
      setError('Could not update the exercise status.');
    } finally {
      setBusy(false);
    }
  }

  async function archiveExercise() {
    setBusy(true);
    setError('');
    try {
      await pb.collection('ghost_work').update(work.id, { status: 'archived' });
      onRefresh();
      onBack();
    } catch {
      setError('Could not archive the exercise.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="gs-project-detail gs-exercise-detail">
      <header className="gs-detail-head">
        <button type="button" className="gs-back" onClick={onBack}>
          <ArrowLeft size={15} strokeWidth={1.5} /> Table Talks
        </button>
        <div className="gs-detail-title-row">
          <div>
            <div className="gs-card-head">
              <span className="gs-card-type">{exerciseTypeLabel(work.exercise_type)}</span>
              <span className={`gs-status gs-status-${work.exercise_status || 'open'}`}>{status}</span>
              {work.status === 'published'
                ? <Link to={`/work/${work.id}`} className="gs-status gs-status-published"><ExternalLink size={11} /> Public page</Link>
                : <span className="gs-status gs-status-draft">{work.status === 'archived' ? 'Archived' : 'Private'}</span>}
            </div>
            <h1 className="gs-detail-title">{work.title}</h1>
            <div className="gs-card-meta">
              {scenarioTypeLabel(work.scenario_type) && <span>{scenarioTypeLabel(work.scenario_type)}</span>}
              {work.domain && <span>{work.domain}</span>}
              {langLabel && <span>{langLabel}</span>}
              {work.repository && safeExternal(work.repository) && <a href={safeExternal(work.repository) ?? undefined} target="_blank" rel="noreferrer">Repository ↗</a>}
            </div>
          </div>
        </div>
      </header>

      {error && <div className="status-message error-message" role="alert">{error}</div>}

      <nav className="gs-subtabs" role="tablist" aria-label="Exercise workspace">
        {SUB_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={sub === t.key}
            className={`gs-subtab ${sub === t.key ? 'active' : ''}`}
            onClick={() => setSub(t.key)}
          >
            <t.icon size={13} strokeWidth={1.5} />
            {t.label}
          </button>
        ))}
      </nav>

      {sub === 'overview' && (
        <div className="gs-detail-section">
          {work.summary && <p className="gs-detail-summary">{work.summary}</p>}
          <dl className="project-meta gs-overview-meta">
            <div className="project-meta-row"><dt>Scenario type</dt><dd>{scenarioTypeLabel(work.scenario_type) || '—'}</dd></div>
            <div className="project-meta-row"><dt>Industry</dt><dd>{work.industry || '—'}</dd></div>
            <div className="project-meta-row"><dt>Difficulty</dt><dd>{difficultyLabel(work.difficulty) || '—'}</dd></div>
            <div className="project-meta-row"><dt>Duration</dt><dd>{durationLabel(work.duration) || '—'}</dd></div>
            <div className="project-meta-row"><dt>Format</dt><dd>{formatModeLabel(work.format_mode) || '—'}</dd></div>
            <div className="project-meta-row"><dt>Delivery</dt><dd>{work.delivery === 'live' ? 'Live' : work.delivery === 'self_paced' ? 'Self-paced' : '—'}</dd></div>
            <div className="project-meta-row"><dt>Roles</dt><dd>{tagsOf(work.roles_needed).join(' · ') || '—'}</dd></div>
          </dl>
          {work.objectives && <DetailBlock label="Learning objectives" body={work.objectives} />}
          {work.initial_conditions && <DetailBlock label="Initial conditions" body={work.initial_conditions} />}
          {work.decision_points && <DetailBlock label="Decision points" body={work.decision_points} />}
          {isFacilitator && work.facilitator_notes && <DetailBlock label="Facilitator notes" body={work.facilitator_notes} />}
          {work.body && <DetailBlock label="Scenario overview" body={work.body} />}
        </div>
      )}

      {sub === 'role' && (
        <ExerciseRoles work={work} profile={profile} membership={membership} isFacilitator={isFacilitator} onRefresh={onRefresh} />
      )}

      {sub === 'timeline' && (
        <div className="gs-detail-section">
          {work.timeline ? (
            <DetailBlock label="Timeline" body={work.timeline} />
          ) : (
            <p className="muted-note">No timeline defined yet. {isFacilitator && 'Add a timeline in the scenario editor (Settings → Edit scenario).'}</p>
          )}
        </div>
      )}

      {sub === 'injects' && (
        <div className="gs-detail-section">
          {work.injects ? (
            <ol className="gs-inject-list">
              {paragraphs(work.injects).map((line, i) => (
                <li key={i}><span className="gs-inject-index">{String(i + 1).padStart(2, '0')}</span>{line}</li>
              ))}
            </ol>
          ) : (
            <p className="muted-note">No injects defined yet. {isFacilitator && 'Add injects in the scenario editor (Settings → Edit scenario).'}</p>
          )}
        </div>
      )}

      {sub === 'evidence' && (
        <div className="gs-detail-section">
          {work.evidence ? (
            <DetailBlock label="Evidence" body={work.evidence} />
          ) : (
            <p className="muted-note">No evidence materials provided for this exercise.</p>
          )}
        </div>
      )}

      {sub === 'decisions' && (
        <TableTalkDecisions work={work} isFacilitator={isFacilitator} />
      )}

      {sub === 'debrief' && (
        <div className="gs-detail-section">
          {!isComplete && !isFacilitator ? (
            <p className="muted-note">The debrief is published once the exercise is marked Complete. {membership?.relation === 'watcher' ? 'You are watching this exercise.' : 'Submit your decisions before the debrief.'}</p>
          ) : (
            <>
              {work.debrief && <DetailBlock label="After-action summary" body={work.debrief} />}
              {work.lessons_learned && <DetailBlock label="Lessons learned" body={work.lessons_learned} />}
              {!work.debrief && !work.lessons_learned && <p className="muted-note">No debrief has been published yet. {isFacilitator && 'Write the after-action summary in the scenario editor.'}</p>}
            </>
          )}
        </div>
      )}

      {sub === 'related' && (
        <div className="gs-detail-section">
          {related.length === 0 ? (
            <p className="muted-note">No related work yet. Related research, Arsenal artifacts, and projects surface here when they share this exercise's domain or tags.</p>
          ) : (
            <ul className="gs-related-list">
              {related.map((item) => (
                <li key={item.id}>
                  <Link to={`/work/${item.id}`}>
                    <strong>{kindLabels[item.kind]}</strong>
                    <span>{item.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {isFacilitator && sub === 'overview' && (
        <div className="gs-settings-row" style={{ marginTop: 26 }}>
          <div>
            <h3 className="gs-settings-title">Edit scenario</h3>
            <p className="muted-note">Change the scenario, timeline, injects, evidence, decision points, and debrief.</p>
          </div>
          <button type="button" className="button button-outline" onClick={() => onEdit(work)}>Edit scenario</button>
        </div>
      )}

      {isFacilitator && (
        <div className="gs-detail-section" style={{ marginTop: 26 }}>
          <div className="gs-settings-row">
            <div>
              <h3 className="gs-settings-title">Exercise status</h3>
              <p className="muted-note">Lifecycle state, independent of publication. Mark Complete to release the debrief to participants.</p>
            </div>
            <select value={work.exercise_status || 'open'} disabled={busy} onChange={(e) => changeExerciseStatus(e.target.value)} aria-label="Exercise status">
              {EXERCISE_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="gs-settings-row">
            <div>
              <h3 className="gs-settings-title">Archive exercise</h3>
              <p className="muted-note">Hide from the public network. The exercise stays in your workspace and can be restored.</p>
            </div>
            <button type="button" className="button button-outline" disabled={busy} onClick={archiveExercise}>Archive</button>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailBlock({ label, body }: { label: string; body: string }) {
  return (
    <section className="gs-detail-block">
      <h2>{label}</h2>
      {paragraphs(body).map((p, i) => <p key={i}>{p}</p>)}
    </section>
  );
}

/**
 * The Role tab. A facilitator manages participants — accepts or declines join
 * requests, assigns scenario roles, and removes contributors. A participant
 * sees their assigned role and the scenario roles still open. No popularity
 * metrics — only named roles and accepted participation.
 */
function ExerciseRoles({ work, profile, membership, isFacilitator, onRefresh }: { work: Work; profile: GhostProfile | null; membership: Participation | null; isFacilitator: boolean; onRefresh: () => void }) {
  const { user } = useAuth();
  const [participations, setParticipations] = useState<Participation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    pb.collection('ghost_participations')
      .getFullList<Participation>({
        filter: pb.filter('work = {:id}', { id: work.id }),
        sort: 'created',
        requestKey: null,
      })
      .then((rows) => { if (active) setParticipations(rows); })
      .catch(() => { if (active) setError('Could not load participants.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [work]);

  const contributors = participations.filter((p) => (p.relation || 'contributor') === 'contributor');
  const requests = participations.filter((p) => p.relation === 'request');
  const openRoles = tagsOf(work.roles_needed);

  async function accept(p: Participation) {
    setError('');
    try {
      await pb.collection('ghost_participations').update(p.id, { relation: 'contributor' });
      setParticipations((prev) => prev.map((x) => (x.id === p.id ? { ...x, relation: 'contributor' } : x)));
    } catch {
      setError('Could not accept the request.');
    }
  }

  async function decline(p: Participation) {
    setError('');
    try {
      await pb.collection('ghost_participations').delete(p.id);
      setParticipations((prev) => prev.filter((x) => x.id !== p.id));
    } catch {
      setError('Could not decline the request.');
    }
  }

  async function removeContributor(p: Participation) {
    setError('');
    try {
      await pb.collection('ghost_participations').delete(p.id);
      setParticipations((prev) => prev.filter((x) => x.id !== p.id));
      onRefresh();
    } catch {
      setError('Could not remove the participant.');
    }
  }

  async function assignRole(p: Participation, role: string) {
    setError('');
    try {
      await pb.collection('ghost_participations').update(p.id, { role });
      setParticipations((prev) => prev.map((x) => (x.id === p.id ? { ...x, role } : x)));
    } catch {
      setError('Could not assign the role.');
    }
  }

  async function requestJoin() {
    if (!user || !profile) return;
    setError('');
    try {
      await pb.collection('ghost_participations').create({
        owner: user.id,
        work: work.id,
        message: 'Request to join the exercise',
        relation: 'request',
        role: '',
      });
      onRefresh();
    } catch {
      setError('Could not send your request. You may have already requested to join.');
    }
  }

  if (loading) return <p className="muted-note">Loading participants…</p>;

  return (
    <div className="gs-detail-section">
      {error && <div className="status-message error-message" role="alert">{error}</div>}

      {!isFacilitator && (
        <div className="gs-join-bar">
          {membership?.relation === 'request'
            ? <span className="muted-note">Your request to join is pending.</span>
            : membership?.relation === 'contributor'
              ? <span className="muted-note">You are a participant. Your role: {membership.role || 'Unassigned'}.</span>
              : <span className="muted-note">Interested in this exercise?</span>}
          <div className="gs-join-actions">
            {!membership && <button type="button" className="button button-light" onClick={requestJoin}>Request to join</button>}
          </div>
        </div>
      )}

      <section className="gs-roster-section">
        <h2 className="gs-roster-title">Participants <span className="gs-tab-count">{contributors.length}</span></h2>
        {contributors.length === 0 ? (
          <p className="muted-note">No participants yet.</p>
        ) : (
          <ul className="gs-roster-list">
            {contributors.map((p) => (
              <li key={p.id}>
                <span className="gs-roster-name">{p.role || 'Participant'}</span>
                {isFacilitator ? (
                  <span className="gs-roster-actions">
                    <select value={p.role || ''} onChange={(e) => assignRole(p, e.target.value)} aria-label="Assign role">
                      <option value="">Unassigned</option>
                      {openRoles.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                    {p.owner !== user?.id && <button type="button" className="gs-icon-btn" aria-label="Remove participant" onClick={() => removeContributor(p)}><LogOut size={13} strokeWidth={1.5} /></button>}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {isFacilitator && requests.length > 0 && (
        <section className="gs-roster-section">
          <h2 className="gs-roster-title">Join requests <span className="gs-tab-count">{requests.length}</span></h2>
          <ul className="gs-roster-list">
            {requests.map((p) => (
              <li key={p.id}>
                <span className="gs-roster-name">{p.role || 'Join request'}{p.message ? ` — ${p.message}` : ''}</span>
                <span className="gs-roster-actions">
                  <button type="button" className="gs-icon-btn gs-accept" aria-label="Accept" onClick={() => accept(p)}><Check size={13} strokeWidth={1.5} /></button>
                  <button type="button" className="gs-icon-btn" aria-label="Decline" onClick={() => decline(p)}><X size={13} strokeWidth={1.5} /></button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="gs-roster-section">
        <h2 className="gs-roster-title">Scenario roles <span className="gs-tab-count">{openRoles.length}</span></h2>
        {openRoles.length === 0 ? (
          <p className="muted-note">No scenario roles defined. {isFacilitator ? 'Add roles in the scenario editor.' : ''}</p>
        ) : (
          <div className="tags profile-interests">{openRoles.map((r) => <span key={r}>{r}</span>)}</div>
        )}
      </section>
    </div>
  );
}
