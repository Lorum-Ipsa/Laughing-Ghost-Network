import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ArrowUpRight, Copy, Download, AlertCircle } from 'lucide-react';
import { GhostMark } from '@/components/ghost-mark';
import { Participation } from '@/components/work/participation';
import { evidenceLabels, kindLabels, KIND_ORDER, paragraphs, reviewStatusLabel, safeExternal, tagsOf, validationStatusLabel, type Translation, type Work, type WorkKind } from '@/lib/network';
import { projectStatusLabel } from '@/data/projects';
import { exerciseTypeLabel, scenarioTypeLabel, difficultyLabel, durationLabel, formatModeLabel, deliveryLabel, exerciseStatusLabel } from '@/data/table-talks';
import { contentLanguageLabel } from '@/lib/languages';
import { useI18n } from '@/lib/i18n';

export function Article({ work, translation, related = [], networkRelated = [], contributorCount = 0 }: { work: Work; translation?: Translation | null; related?: Work[]; networkRelated?: Work[]; contributorCount?: number }) {
  const { t } = useI18n();
  const [copyStatus, setCopyStatus] = useState('Copy');
  const source = safeExternal(work.source);
  const repository = safeExternal(work.repository);
  const handle = work.expand?.author?.handle;
  const profileUrl = handle ? `/ghosts/${encodeURIComponent(handle)}` : '/ghosts';
  const langLabel = contentLanguageLabel(work.language);
  const reviewLabel = reviewStatusLabel(work.review_status);
  const validationLabel = validationStatusLabel(work.validation_status);
  const publishedLabel = new Date(work.created).toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  const updatedLabel = work.updated && work.updated !== work.created ? new Date(work.updated).toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }) : '';
  const tags = tagsOf(work.tags);
  const isProject = work.kind === 'project';
  const roles = tagsOf(work.roles_needed);
  const tech = tagsOf(work.technologies);
  const milestones = work.milestones ? work.milestones.split('\n').map((m) => m.trim()).filter(Boolean) : [];

  // Related artifacts: the author's other published work, grouped by kind.
  const relatedGroups = useMemo(() => {
    const counts = new Map<WorkKind, number>();
    for (const r of related) counts.set(r.kind, (counts.get(r.kind) || 0) + 1);
    return KIND_ORDER.filter((k) => counts.has(k))
      .map((k) => ({ kind: k, count: counts.get(k)! }))
      .slice(0, 6);
  }, [related]);

  // Network-wide related work for projects, grouped by kind into Research,
  // Arsenal artifacts, and Table Talks streams.
  const networkGroups = useMemo(() => {
    const counts = new Map<WorkKind, Work[]>();
    for (const r of networkRelated) {
      const list = counts.get(r.kind) || [];
      list.push(r);
      counts.set(r.kind, list);
    }
    return KIND_ORDER.filter((k) => counts.has(k)).map((k) => ({ kind: k, items: counts.get(k)! }));
  }, [networkRelated]);

  async function copy() { try { await navigator.clipboard.writeText(work.code); setCopyStatus('Copied'); } catch { setCopyStatus('Copy unavailable'); } }
  function download() { const blob = new Blob([work.code], { type: 'text/plain;charset=utf-8' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${work.id}.${work.kind === 'detection' ? 'yml' : 'txt'}`; anchor.click(); URL.revokeObjectURL(url); }

  const projectSections = isProject ? [
    work.goals && { heading: 'Goals', body: work.goals },
    work.scope && { heading: 'Scope', body: work.scope },
    work.deliverables && { heading: 'Deliverables', body: work.deliverables },
  ].filter(Boolean) as { heading: string; body: string }[] : [];

  const isExercise = work.kind === 'exercise';
  const exerciseSections = isExercise ? [
    work.objectives && { heading: 'Learning Objectives', body: work.objectives },
    work.initial_conditions && { heading: 'Initial Conditions', body: work.initial_conditions },
    work.timeline && { heading: 'Timeline', body: work.timeline },
    work.injects && { heading: 'Injects', body: work.injects },
    work.evidence && { heading: 'Evidence', body: work.evidence },
    work.decision_points && { heading: 'Decision Points', body: work.decision_points },
    work.facilitator_notes && { heading: 'Facilitator Notes', body: work.facilitator_notes },
    work.debrief && { heading: 'Debrief', body: work.debrief },
    work.lessons_learned && { heading: 'Lessons Learned', body: work.lessons_learned },
  ].filter(Boolean) as { heading: string; body: string }[] : [];

  return <div className="article-layout rail"><article className="article-body">{translation && <div className="callout translation-banner" role="status"><AlertCircle size={15} /><span><strong>{t('lang.translated')} · {translation.source === 'human' ? 'human' : 'machine'}</strong> — {t('lang.translateNotice')}</span></div>}{work.example && <div className="callout" style={{ marginBottom: 35 }}>Educational demo artifact. The content illustrates the expected format; no production effectiveness is claimed.</div>}{paragraphs(work.body).map((part, i) => { const [heading, ...lines] = part.split('\n'); return <section key={i}>{lines.length ? <><h2>{heading}</h2><p>{lines.join('\n')}</p></> : <p>{heading}</p>}</section>; })}{projectSections.length > 0 && projectSections.map((s) => <section key={s.heading}><h2>{s.heading}</h2><p>{s.body}</p></section>)}{isProject && milestones.length > 0 && <section><h2>Milestones</h2><ol className="milestone-list">{milestones.map((m, i) => <li key={i}><span className="milestone-index">{String(i + 1).padStart(2, '0')}</span>{m}</li>)}</ol></section>}{exerciseSections.length > 0 && exerciseSections.map((s) => <section key={s.heading}><h2>{s.heading}</h2><p>{s.body}</p></section>)}{work.code && <div className="code-block"><div className="code-toolbar"><span>ARTIFACT / {kindLabels[work.kind].toUpperCase()}</span><div><button onClick={copy}><Copy size={12}/>{copyStatus}</button><button onClick={download}><Download size={12}/>Download</button></div></div><pre><code>{work.code}</code></pre><span className="sr-only" aria-live="polite">{copyStatus}</span></div>}{(work.kind === 'project' || work.kind === 'exercise') && <Participation work={work}/>}</article><aside className="article-sidebar"><div><h2>{t('work.publishedBy')}</h2><Link to={profileUrl} className="author-link"><GhostMark className="ghost-avatar"/>{handle || 'Ghost'}</Link></div><div><h2>{t('work.type')}</h2><span className="muted-note">{kindLabels[work.kind]}</span></div>{isProject && <div><h2>PROJECT STATUS</h2><span className="muted-note"><span className={`project-status-badge status-${work.project_status || 'proposed'}`}>{projectStatusLabel(work.project_status)}</span></span></div>}{isProject && work.accepting_contributors && <div><h2>CONTRIBUTORS</h2><span className="muted-note">{contributorCount} recorded · looking for contributors</span></div>}{isProject && roles.length > 0 && <div><h2>OPEN ROLES</h2><div className="tags">{roles.map((r) => <span key={r}>{r}</span>)}</div></div>}{isProject && tech.length > 0 && <div><h2>TECHNOLOGIES</h2><div className="tags">{tech.map((tch) => <span key={tch}>{tch}</span>)}</div></div>}{isExercise && <div><h2>EXERCISE TYPE</h2><span className="muted-note">{exerciseTypeLabel(work.exercise_type)}</span></div>}{isExercise && work.scenario_type && <div><h2>SCENARIO</h2><span className="muted-note">{scenarioTypeLabel(work.scenario_type)}</span></div>}{isExercise && work.difficulty && <div><h2>DIFFICULTY</h2><span className="muted-note">{difficultyLabel(work.difficulty)}</span></div>}{isExercise && work.duration && <div><h2>DURATION</h2><span className="muted-note">{durationLabel(work.duration)}</span></div>}{isExercise && work.format_mode && <div><h2>FORMAT</h2><span className="muted-note">{formatModeLabel(work.format_mode)}</span></div>}{isExercise && work.delivery && <div><h2>DELIVERY</h2><span className="muted-note">{deliveryLabel(work.delivery)}</span></div>}{isExercise && <div><h2>EXERCISE STATUS</h2><span className="muted-note"><span className={`exercise-status-badge status-${work.exercise_status || 'open'}`}>{exerciseStatusLabel(work.exercise_status)}</span></span></div>}{isExercise && roles.length > 0 && <div><h2>ROLES</h2><div className="tags">{roles.map((r) => <span key={r}>{r}</span>)}</div></div>}{isExercise && work.industry && <div><h2>INDUSTRY</h2><span className="muted-note">{work.industry}</span></div>}{work.domain && <div><h2>{t('work.researchDomain')}</h2><span className="muted-note">{work.domain}</span></div>}<div><h2>{t('work.reviewStatus')}</h2><span className="muted-note">{reviewLabel}</span></div>{validationLabel && <div><h2>VALIDATION</h2><span className="muted-note"><span className={`validation-badge validation-${work.validation_status || 'draft'}`}>{validationLabel}</span></span></div>}{work.version && <div><h2>VERSION</h2><span className="muted-note">{work.version}</span></div>}{work.license && <div><h2>LICENSE</h2><span className="muted-note">{work.license}</span></div>}{work.platform && <div><h2>PLATFORM</h2><span className="muted-note">{work.platform}</span></div>}{work.format && <div><h2>FORMAT</h2><span className="muted-note">{work.format}</span></div>}{work.tool && <div><h2>TOOL / TECHNOLOGY</h2><span className="muted-note">{work.tool}</span></div>}{langLabel && <div><h2>{t('work.originalLanguage')}</h2><span className="muted-note">{langLabel}</span></div>}<div><h2>{t('work.published')}</h2><span className="muted-note">{publishedLabel}</span></div>{updatedLabel && <div><h2>LAST UPDATED</h2><span className="muted-note">{updatedLabel}</span></div>}{tags.length > 0 && <div><h2>{t('work.domains')}</h2><div className="tags">{tags.map(tag => <span key={tag}>{tag}</span>)}</div></div>}{repository && <a href={repository} target="_blank" rel="noopener noreferrer" className="text-link">Repository <ArrowUpRight size={15}/></a>}{relatedGroups.length > 0 && <div><h2>{t('work.related')}</h2><ul className="related-list">{relatedGroups.map(g => <li key={g.kind}><Link to={profileUrl}><strong>{g.count}</strong> {evidenceLabels[g.kind]}</Link></li>)}</ul></div>}{networkGroups.length > 0 && <div><h2>RELATED ACROSS THE NETWORK</h2><ul className="related-list">{networkGroups.map(g => <li key={g.kind}><strong>{g.items.length}</strong> {evidenceLabels[g.kind]}</li>)}</ul></div>}{source && <a href={source} target="_blank" rel="noopener noreferrer" className="text-link">{t('work.sourceRepo')} <ArrowUpRight size={15}/></a>}<div className="callout">{t('work.useScope')}</div><Link to="/code" className="text-link">{t('work.readConduct')} <ArrowUpRight size={15}/></Link></aside></div>;
}
