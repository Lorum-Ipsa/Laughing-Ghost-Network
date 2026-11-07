import { Users, HandHeart, GitBranch, ArrowUpRight } from 'lucide-react';
import { kindLabels, tagsOf, type Work } from '@/lib/network';
import { projectStatusLabel } from '@/data/projects';
import { contentLanguageLabel } from '@/lib/languages';

/**
 * A project card in the Ghost Space Projects workspace. Surfaces the lifecycle
 * status, the member's role on the project, specialty/domain, technologies,
 * contributor count, open roles, and the next milestone — so a member can
 * decide whether to open the workspace. No popularity metrics.
 */
export function ProjectCard({
	work,
	role,
	contributors,
	updated,
	onOpen,
}: {
	work: Work;
	role: string;
	contributors: number;
	updated: string;
	onOpen: () => void;
}) {
	const status = projectStatusLabel(work.project_status);
	const tech = tagsOf(work.technologies);
	const roles = tagsOf(work.roles_needed);
	const milestones = tagsOf(work.milestones).map((m) => m.trim()).filter(Boolean);
	const nextMilestone = milestones[0] || '';
	const langLabel = contentLanguageLabel(work.language);
	const accepting = work.accepting_contributors;

	return (
		<article className="gs-card gs-project-card">
			<div className="gs-card-main">
				<div className="gs-card-head">
					<span className="gs-card-type">{kindLabels[work.kind] || work.kind}</span>
					<span className={`gs-status gs-status-${work.project_status || 'proposed'}`}>{status}</span>
					{accepting && <span className="gs-status gs-status-recruiting"><HandHeart size={11} strokeWidth={1.5} /> Recruiting</span>}
				</div>
				<h3 className="gs-card-title">{work.title}</h3>
				<div className="gs-card-meta">
					{work.domain && <span>{work.domain}</span>}
					{langLabel && <span>{langLabel}</span>}
					<span>Updated {updated}</span>
				</div>
				{work.summary && <p className="gs-project-summary">{work.summary}</p>}

				{(tech.length > 0 || roles.length > 0) && (
					<div className="project-tags">
						{tech.slice(0, 4).map((t) => <span key={t}>{t}</span>)}
						{roles.slice(0, 3).map((r) => <span key={r} className="project-role-tag">{r}</span>)}
					</div>
				)}

				<dl className="project-meta">
					<div className="project-meta-row">
						<dt>Your role</dt>
						<dd>{role}</dd>
					</div>
					<div className="project-meta-row">
						<dt><Users size={12} /> Contributors</dt>
						<dd>{contributors}</dd>
					</div>
					{roles.length > 0 && (
						<div className="project-meta-row">
							<dt><HandHeart size={12} /> Open roles</dt>
							<dd>{roles.join(' · ')}</dd>
						</div>
					)}
					{nextMilestone && (
						<div className="project-meta-row">
							<dt><GitBranch size={12} /> Next milestone</dt>
							<dd>{nextMilestone}</dd>
						</div>
					)}
				</dl>
			</div>
			<div className="gs-card-actions">
				<button type="button" className="gs-card-action primary" onClick={onOpen}>
					<ArrowUpRight size={13} strokeWidth={1.5} /> Open Workspace
				</button>
			</div>
		</article>
	);
}
