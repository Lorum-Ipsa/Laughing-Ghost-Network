import { Link } from 'react-router';
import { ArrowUpRight, Users, GitBranch, Globe, Clock, UserCircle, HandHeart } from 'lucide-react';
import { kindLabels, tagsOf, type Work } from '@/lib/network';
import { projectStatusLabel } from '@/data/projects';
import { contentLanguageLabel } from '@/lib/languages';
import { GhostAvatar } from '@/components/ghost-avatar';

/**
 * A richer project card. Unlike a generic work card, it surfaces the
 * lifecycle status, maintainer, open roles, contributor count, technologies,
 * language, last update, and whether the project is accepting contributors —
 * so a visitor can decide whether to join before clicking through.
 */
export function ProjectCard({ work, contributors = 0 }: { work: Work; contributors?: number }) {
  const isCommunity = work.kind === 'community';
  const status = projectStatusLabel(work.project_status);
  const handle = work.expand?.author?.handle;
  const profileUrl = handle ? `/ghosts/${handle}` : '/ghosts';
  const roles = tagsOf(work.roles_needed);
  const tech = tagsOf(work.technologies);
  const langLabel = contentLanguageLabel(work.language);
  const updated = new Date(work.updated || work.created).toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  const accepting = work.accepting_contributors && !isCommunity;

  return (
    <article className="project-card">
      <div className="project-card-head">
        <span className="project-type">{kindLabels[work.kind]}</span>
        {!isCommunity && <span className={`project-status-badge status-${work.project_status || 'proposed'}`}>{status}</span>}
        {accepting && <span className="project-accepting" title="Looking for contributors"><HandHeart size={12} /> Open</span>}
      </div>

      <h3><Link to={`/work/${work.id}`}>{work.title}</Link></h3>
      {work.domain && <p className="project-domain">{work.domain}</p>}
      <p className="project-summary">{work.summary}</p>

      {(tech.length > 0 || roles.length > 0) && (
        <div className="project-tags">
          {tech.slice(0, 4).map((t) => <span key={t}>{t}</span>)}
          {roles.slice(0, 2).map((r) => <span key={r} className="project-role-tag">{r}</span>)}
        </div>
      )}

      <dl className="project-meta">
        <div className="project-meta-row">
          <dt><UserCircle size={13} /> Maintainer</dt>
          <dd><GhostAvatar profile={work.expand?.author ?? null} size={16} className="inline-avatar" /> <Link to={profileUrl}>{handle || 'Ghost'}</Link></dd>
        </div>
        {roles.length > 0 && (
          <div className="project-meta-row">
            <dt><HandHeart size={13} /> Looking for</dt>
            <dd>{roles.join(' · ')}</dd>
          </div>
        )}
        <div className="project-meta-row">
          <dt><Users size={13} /> Contributors</dt>
          <dd>{contributors}</dd>
        </div>
        {langLabel && (
          <div className="project-meta-row">
            <dt><Globe size={13} /> Language</dt>
            <dd>{langLabel}</dd>
          </div>
        )}
        <div className="project-meta-row">
          <dt><Clock size={13} /> Updated</dt>
          <dd>{updated}</dd>
        </div>
      </dl>

      <Link to={`/work/${work.id}`} className="project-view">View project <ArrowUpRight size={14} /></Link>
      {work.example && <span className="example-badge project-example">Example</span>}
    </article>
  );
}
