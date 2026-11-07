import { Link } from 'react-router';
import { ArrowUpRight, Clock, Users, Globe, Gauge, Tag, Layers } from 'lucide-react';
import { kindLabels, tagsOf, type Work } from '@/lib/network';
import {
  exerciseTypeLabel,
  scenarioTypeLabel,
  difficultyLabel,
  durationLabel,
  formatModeLabel,
  exerciseStatusLabel,
} from '@/data/table-talks';
import { contentLanguageLabel } from '@/lib/languages';
import { GhostAvatar } from '@/components/ghost-avatar';

/**
 * A Table Talks exercise card. Unlike a generic work card, it surfaces the
 * practice context — exercise type, scenario domain, difficulty, duration,
 * roles, format, language, and lifecycle status — so a visitor can decide
 * whether to join before clicking through. No popularity ranking.
 */
export function ExerciseCard({ work, index }: { work: Work; index: number }) {
  const handle = work.expand?.author?.handle;
  const profileUrl = handle ? `/ghosts/${handle}` : '/ghosts';
  const roles = tagsOf(work.roles_needed);
  const langLabel = contentLanguageLabel(work.language);
  const typeLabel = exerciseTypeLabel(work.exercise_type);
  const scenarioLabel = scenarioTypeLabel(work.scenario_type);
  const diffLabel = difficultyLabel(work.difficulty);
  const durLabel = durationLabel(work.duration);
  const fmtLabel = formatModeLabel(work.format_mode);
  const statusLabel = exerciseStatusLabel(work.exercise_status);
  const domain = work.domain || '';

  return (
    <article className="exercise-card">
      <div className="exercise-card-head">
        <span className="exercise-number">TABLE TALK #{String(index).padStart(2, '0')}</span>
        <span className={`exercise-status-badge status-${work.exercise_status || 'open'}`}>{statusLabel}</span>
      </div>

      {scenarioLabel && <span className="exercise-scenario">{scenarioLabel}</span>}
      <h3><Link to={`/work/${work.id}`}>{work.title}</Link></h3>
      {domain && <p className="exercise-domain">{domain}</p>}
      <p className="exercise-summary">{work.summary}</p>

      <dl className="exercise-meta">
        <div className="exercise-meta-row">
          <dt><Layers size={13} /> Type</dt>
          <dd>{typeLabel}</dd>
        </div>
        {diffLabel && (
          <div className="exercise-meta-row">
            <dt><Gauge size={13} /> Difficulty</dt>
            <dd>{diffLabel}</dd>
          </div>
        )}
        {durLabel && (
          <div className="exercise-meta-row">
            <dt><Clock size={13} /> Duration</dt>
            <dd>{durLabel}</dd>
          </div>
        )}
        {roles.length > 0 && (
          <div className="exercise-meta-row">
            <dt><Users size={13} /> Roles</dt>
            <dd>{roles.join(' · ')}</dd>
          </div>
        )}
        {fmtLabel && (
          <div className="exercise-meta-row">
            <dt><Tag size={13} /> Format</dt>
            <dd>{fmtLabel}</dd>
          </div>
        )}
        {langLabel && (
          <div className="exercise-meta-row">
            <dt><Globe size={13} /> Language</dt>
            <dd>{langLabel}</dd>
          </div>
        )}
      </dl>

      <div className="exercise-card-foot">
        <Link to={`/work/${work.id}`} className="exercise-view">View exercise <ArrowUpRight size={14} /></Link>
        <Link to={profileUrl} className="exercise-author"><GhostAvatar profile={work.expand?.author ?? null} size={16} className="inline-avatar" /> {handle || 'Ghost'}</Link>
      </div>
      {work.example && <span className="example-badge exercise-example">Example</span>}
    </article>
  );
}
