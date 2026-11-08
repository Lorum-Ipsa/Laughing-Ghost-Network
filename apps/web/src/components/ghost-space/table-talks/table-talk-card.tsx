import { Link } from 'react-router';
import { ArrowUpRight, Clock, Users, Gauge, Tag, Radio } from 'lucide-react';
import { tagsOf, type Participation, type Work } from '@/lib/network';
import {
  scenarioTypeLabel, difficultyLabel, durationLabel, formatModeLabel, exerciseStatusLabel,
} from '@/data/table-talks';
import { contentLanguageLabel } from '@/lib/languages';

/**
 * A Table Talks card in the Ghost Space workspace. Surfaces the exercise
 * number, scenario type, the member's role, duration, language, format, and
 * lifecycle status — so a member can decide whether to enter the exercise.
 * No popularity metrics.
 */
export function TableTalkCard({
  work,
  index,
  role,
  onOpen,
}: {
  work: Work;
  index: number;
  role: string;
  onOpen: () => void;
}) {
  const scenarioLabel = scenarioTypeLabel(work.scenario_type);
  const diffLabel = difficultyLabel(work.difficulty);
  const durLabel = durationLabel(work.duration);
  const fmtLabel = formatModeLabel(work.format_mode);
  const statusLabel = exerciseStatusLabel(work.exercise_status);
  const langLabel = contentLanguageLabel(work.language);
  const roles = tagsOf(work.roles_needed);
  const isDraft = work.status === 'draft';

  return (
    <article className="gs-card gs-exercise-card">
      <div className="gs-card-main">
        <div className="gs-card-head">
          <span className="gs-exercise-number">TABLE TALK #{String(index).padStart(2, '0')}</span>
          <span className={`gs-status gs-status-${work.exercise_status || 'open'}`}>{statusLabel}</span>
          {isDraft && <span className="gs-status gs-status-draft">Draft</span>}
          {work.status === 'published' && !isDraft && <span className="gs-status gs-status-published">Published</span>}
        </div>
        <h3 className="gs-card-title">{work.title}</h3>
        <div className="gs-card-meta">
          {scenarioLabel && <span>{scenarioLabel}</span>}
          {work.domain && <span>{work.domain}</span>}
          {langLabel && <span>{langLabel}</span>}
        </div>
        {work.summary && <p className="gs-exercise-summary">{work.summary}</p>}

        <dl className="project-meta gs-exercise-meta">
          <div className="project-meta-row">
            <dt>Your role</dt>
            <dd>{role}</dd>
          </div>
          {durLabel && (
            <div className="project-meta-row">
              <dt><Clock size={12} /> Duration</dt>
              <dd>{durLabel}</dd>
            </div>
          )}
          {diffLabel && (
            <div className="project-meta-row">
              <dt><Gauge size={12} /> Difficulty</dt>
              <dd>{diffLabel}</dd>
            </div>
          )}
          {fmtLabel && (
            <div className="project-meta-row">
              <dt><Tag size={12} /> Format</dt>
              <dd>{fmtLabel}</dd>
            </div>
          )}
          {roles.length > 0 && (
            <div className="project-meta-row">
              <dt><Users size={12} /> Roles</dt>
              <dd>{roles.join(' · ')}</dd>
            </div>
          )}
        </dl>
      </div>
      <div className="gs-card-actions">
        <button type="button" className="gs-card-action primary" onClick={onOpen}>
          <ArrowUpRight size={13} strokeWidth={1.5} /> Enter Exercise
        </button>
        {work.status === 'published' && (
          <Link to={`/work/${work.id}`} className="gs-card-action">
            <Radio size={12} strokeWidth={1.5} /> View Brief
          </Link>
        )}
      </div>
    </article>
  );
}

export function tableTalkRoleFor(work: Work, membership: Participation | null, isFacilitator: boolean): string {
  if (isFacilitator) return 'Facilitator';
  if (membership?.relation === 'watcher') return 'Watcher';
  if (membership?.relation === 'request') return 'Pending request';
  return membership?.role || 'Participant';
}
