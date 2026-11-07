import { useEffect, useMemo, useState } from 'react';
import { Plus, Radio } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { pocketbaseClient as pb } from '@/lib/pocketbase-client';
import type { GhostProfile, Participation, Work } from '@/lib/network';
import { ContributionEditor } from '@/components/ghost-space/contributions/contribution-editor';
import { TableTalkCard, tableTalkRoleFor } from '@/components/ghost-space/table-talks/table-talk-card';
import { TableTalkDetail } from '@/components/ghost-space/table-talks/table-talk-detail';

type Tab = 'upcoming' | 'participating' | 'facilitating' | 'completed' | 'drafts' | 'archived';

const TABS: { key: Tab; label: string }[] = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'participating', label: 'Participating' },
  { key: 'facilitating', label: 'Facilitating' },
  { key: 'completed', label: 'Completed' },
  { key: 'drafts', label: 'Drafts' },
  { key: 'archived', label: 'Archived' },
];

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.round(days / 30)}mo ago`;
}

/**
 * The Table Talks workspace — the practice layer of Ghost Space. A member sees
 * the exercises they facilitate, participate in, or have completed, plus
 * focused views for upcoming sessions, drafts, and archived work. "Propose
 * Table Talk" opens the contribution editor seeded as an exercise. Opening an
 * exercise enters the TableTalkDetail workspace (overview, role, timeline,
 * injects, evidence, decisions, debrief, related work).
 *
 * The exercise lifecycle (`exercise_status`) is independent of publication
 * `status`. No popularity rankings or competitive scoring appear anywhere —
 * only lifecycle state, roles, and the reasoning captured in decisions.
 */
export function TableTalksWorkspace({
  profile,
  work,
  onRefresh,
}: {
 profile: GhostProfile | null;
	work: Work[];
	onRefresh: () => void;
}) {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('facilitating');
  const [editor, setEditor] = useState<{ mode: 'create' | 'edit'; work: Work | null } | null>(null);
  const [openExercise, setOpenExercise] = useState<Work | null>(null);
  const [participations, setParticipations] = useState<Participation[]>([]);
  const [revision, setRevision] = useState(0);

  const myExercises = useMemo(
    () => work.filter((w) => w.kind === 'exercise'),
    [work],
  );

  // The signed-in member's own participations (expand the related work + author).
  useEffect(() => {
    if (!user) return;
    let active = true;
    pb.collection('ghost_participations')
      .getFullList<Participation>({
        filter: pb.filter('owner = {:id}', { id: user.id }),
        expand: 'work.author',
        requestKey: null,
      })
      .then((rows) => { if (active) setParticipations(rows); })
      .catch(() => { if (active) setParticipations([]); });
    return () => { active = false; };
  }, [user, revision]);

  const membershipByWork = useMemo(() => {
    const map = new Map<string, Participation>();
    for (const p of participations) if (p.work) map.set(p.work, p);
    return map;
  }, [participations]);

  // Exercises the member participates in (contributor), excluding their own.
  const participatedExercises = useMemo(
    () => participations
      .filter((p) => (p.relation || 'contributor') === 'contributor' && p.expand?.work && p.expand.work.owner !== user?.id && p.expand.work.kind === 'exercise')
      .map((p) => p.expand!.work!),
    [participations, user],
  );

  const isMine = (w: Work) => w.owner === user?.id;

  const visible = useMemo(() => {
    if (tab === 'facilitating') {
      return myExercises.filter((w) => isMine(w) && w.status !== 'archived' && w.exercise_status !== 'archived' && w.exercise_status !== 'completed');
    }
    if (tab === 'upcoming') {
      const mine = myExercises.filter((w) => isMine(w) && (w.exercise_status === 'scheduled' || w.exercise_status === 'open') && w.status !== 'archived');
      const joined = participatedExercises.filter((w) => w.exercise_status === 'scheduled' || w.exercise_status === 'open');
      return [...mine, ...joined];
    }
    if (tab === 'participating') {
      return participatedExercises.filter((w) => w.exercise_status !== 'completed' && w.exercise_status !== 'archived');
    }
    if (tab === 'completed') {
      const mine = myExercises.filter((w) => isMine(w) && w.exercise_status === 'completed');
      const joined = participatedExercises.filter((w) => w.exercise_status === 'completed');
      return [...mine, ...joined];
    }
    if (tab === 'drafts') {
      return myExercises.filter((w) => isMine(w) && w.status === 'draft');
    }
    if (tab === 'archived') {
      return myExercises.filter((w) => isMine(w) && (w.status === 'archived' || w.exercise_status === 'archived'));
    }
    return [];
  }, [tab, myExercises, participatedExercises, user]);

  const counts = useMemo(() => {
    const map: Record<Tab, number> = { upcoming: 0, participating: 0, facilitating: 0, completed: 0, drafts: 0, archived: 0 };
    map.facilitating = myExercises.filter((w) => isMine(w) && w.status !== 'archived' && w.exercise_status !== 'archived' && w.exercise_status !== 'completed').length;
    map.upcoming = myExercises.filter((w) => isMine(w) && (w.exercise_status === 'scheduled' || w.exercise_status === 'open') && w.status !== 'archived').length
      + participatedExercises.filter((w) => w.exercise_status === 'scheduled' || w.exercise_status === 'open').length;
    map.participating = participatedExercises.filter((w) => w.exercise_status !== 'completed' && w.exercise_status !== 'archived').length;
    map.completed = myExercises.filter((w) => isMine(w) && w.exercise_status === 'completed').length
      + participatedExercises.filter((w) => w.exercise_status === 'completed').length;
    map.drafts = myExercises.filter((w) => isMine(w) && w.status === 'draft').length;
    map.archived = myExercises.filter((w) => isMine(w) && (w.status === 'archived' || w.exercise_status === 'archived')).length;
    return map;
  }, [myExercises, participatedExercises, user]);

  function refreshAll() {
    setRevision((r) => r + 1);
    onRefresh();
  }

  if (editor) {
    return (
      <ContributionEditor
        profile={profile}
        existing={editor.mode === 'edit' ? editor.work : null}
        defaultKind="exercise"
        onDone={(saved) => {
          setEditor(null);
          if (saved) refreshAll();
        }}
      />
    );
  }

  if (openExercise) {
    return (
      <TableTalkDetail
        work={openExercise}
        profile={profile}
        membership={membershipByWork.get(openExercise.id) || null}
        onBack={() => setOpenExercise(null)}
        onRefresh={refreshAll}
        onEdit={(w) => { setOpenExercise(null); setEditor({ mode: 'edit', work: w }); }}
      />
    );
  }

  return (
    <div className="gs-contributions">
      <header className="gs-section-head">
        <div>
          <span className="eyebrow"><span className="tiny-dot" /> GHOST SPACE / TABLE TALKS</span>
          <h1>Table Talks</h1>
          <p className="gs-section-lede">A practice environment for decision-making. Facilitate scenarios, assign roles, release injects, and capture the reasoning behind every decision — then publish the debrief. No scores, no rankings.</p>
        </div>
        <button type="button" className="button button-light gs-create-btn" onClick={() => setEditor({ mode: 'create', work: null })}>
          <Plus size={15} strokeWidth={1.5} /> Propose Table Talk
        </button>
      </header>

      <nav className="gs-tabs" role="tablist" aria-label="Table Talks views">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className={`gs-tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {counts[t.key] > 0 && <span className="gs-tab-count">{counts[t.key]}</span>}
          </button>
        ))}
      </nav>

      {visible.length === 0 ? (
        <div className="gs-empty-state">
          <Radio size={28} strokeWidth={1} />
          <p>{emptyMessage(tab)}</p>
          {(tab === 'facilitating' || tab === 'drafts' || tab === 'upcoming') && (
            <button type="button" className="button button-outline" onClick={() => setEditor({ mode: 'create', work: null })}>
              <Plus size={14} strokeWidth={1.5} /> Propose a Table Talk
            </button>
          )}
        </div>
      ) : (
        <ul className="gs-card-list">
          {visible.map((item, i) => {
            const membership = membershipByWork.get(item.id) || null;
            const isFacilitator = item.owner === user?.id;
            const role = tableTalkRoleFor(item, membership, isFacilitator);
            return (
              <li key={item.id}>
                <TableTalkCard
                  work={item}
                  index={i + 1}
                  role={role}
                  onOpen={() => setOpenExercise(item)}
                />
              </li>
            );
          })}
        </ul>
      )}
      <p className="sample-note">Table Talks separates practice from performance. Exercise lifecycle (Draft → Open → Scheduled → Completed → Archived) is independent of publication. Participants submit decisions at each decision point; the facilitator publishes the after-action summary once the exercise is complete. No competitive scoring — only the reasoning, recorded for the debrief.</p>
    </div>
  );
}

function emptyMessage(tab: Tab): string {
  switch (tab) {
    case 'facilitating': return 'You are not facilitating any active exercises yet. Propose a Table Talk to build a scenario, assign roles, and release injects.';
    case 'participating': return 'You are not participating in any exercises. Open a Table Talk on the public page and request to join a role.';
    case 'upcoming': return 'No upcoming exercises. Scheduled and open exercises you facilitate or participate in appear here.';
    case 'completed': return 'No completed exercises yet. Exercises marked Complete appear here with their debrief.';
    case 'drafts': return 'No draft exercises. Save a scenario as a draft to work on it before submitting for review.';
    case 'archived': return 'No archived exercises. Archived exercises are kept but hidden from the public network.';
  }
}
