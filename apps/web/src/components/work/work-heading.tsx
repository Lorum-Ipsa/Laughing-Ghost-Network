import { Link } from 'react-router';
import { kindLabels, reviewStatusLabel, validationStatusLabel, type Work } from '@/lib/network';
import { projectStatusLabel } from '@/data/projects';
import { exerciseTypeLabel, scenarioTypeLabel, difficultyLabel, durationLabel, exerciseStatusLabel } from '@/data/table-talks';
import { ARSENAL_KINDS } from '@/data/arsenal';
import { contentLanguageLabel } from '@/lib/languages';
import { useI18n } from '@/lib/i18n';

export function WorkHeading({ work }: { work: Work }) {
  const { t } = useI18n();
  const reviewLabel = reviewStatusLabel(work.review_status);
  const validationLabel = validationStatusLabel(work.validation_status);
  const isProject = work.kind === 'project';
  const isExercise = work.kind === 'exercise';
  const projectStatus = projectStatusLabel(work.project_status);
  const arsenalKinds = new Set(ARSENAL_KINDS as readonly string[]);
  const section =
    work.kind === 'project'
      ? '/projects'
      : work.kind === 'exercise'
        ? '/table-talks'
        : arsenalKinds.has(work.kind)
          ? '/arsenal'
          : '/research';
  const langLabel = contentLanguageLabel(work.language);
  return (
    <section className="page-heading article-title rail">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span>/</span>
        <Link to={section}>Contributions</Link>
        <span>/</span>
        <span>{kindLabels[work.kind]}</span>
      </nav>
      <div className="eyebrow">
        {kindLabels[work.kind].toUpperCase()}{' '}
        {work.domain && <span className="work-heading-domain">{work.domain}</span>}
        {work.example && <span className="example-badge">{t('work.example')}</span>}
      </div>
      <div className="heading-line">
        <h1>{work.title}</h1>
      </div>
      <p>{work.summary}</p>
      {langLabel && (
        <div className="work-original-language">
          <span className="translate-dot" aria-hidden="true" />
          {t('work.originalLang')} · {langLabel}
        </div>
      )}
      <div className="work-heading-meta">
        <span><span className="meta-label">Published</span> {new Date(work.created).toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })}</span>
        {isProject && <span><span className="meta-label">Project status</span> <span className={`project-status-badge status-${work.project_status || 'proposed'}`}>{projectStatus}</span></span>}
        {isProject && work.accepting_contributors && <span><span className="meta-label">Looking for</span> Contributors</span>}
        {isExercise && <span><span className="meta-label">Type</span> {exerciseTypeLabel(work.exercise_type)}</span>}
        {isExercise && work.scenario_type && <span><span className="meta-label">Scenario</span> {scenarioTypeLabel(work.scenario_type)}</span>}
        {isExercise && work.difficulty && <span><span className="meta-label">Difficulty</span> {difficultyLabel(work.difficulty)}</span>}
        {isExercise && work.duration && <span><span className="meta-label">Duration</span> {durationLabel(work.duration)}</span>}
        {isExercise && <span><span className="meta-label">Exercise status</span> <span className={`exercise-status-badge status-${work.exercise_status || 'open'}`}>{exerciseStatusLabel(work.exercise_status)}</span></span>}
        {validationLabel && validationLabel !== 'Draft' && <span><span className="meta-label">Validation</span> <span className={`validation-badge validation-${work.validation_status || 'draft'}`}>{validationLabel}</span></span>}
        <span><span className="meta-label">Status</span> {reviewLabel}</span>
      </div>
    </section>
  );
}
