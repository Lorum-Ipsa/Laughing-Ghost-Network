import type { ProjectStatus } from '@/lib/network';

/**
 * Projects hub taxonomy.
 *
 * The Projects page separates project discovery from participation. A project
 * carries a lifecycle `project_status` (Proposed → Recruiting → Active →
 * Paused → Complete → Archived) that is independent of its publication status.
 * The top-level discovery tabs group projects by lifecycle stage, with no
 * popularity ranking. "Community Contributions" is a separate stream for
 * looser, community-driven work that is not a structured project.
 */

/** Project lifecycle states, in canonical order. */
export const PROJECT_STATUSES: { value: ProjectStatus; label: string }[] = [
  { value: 'proposed', label: 'Proposed' },
  { value: 'recruiting', label: 'Recruiting' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'complete', label: 'Complete' },
  { value: 'archived', label: 'Archived' },
];

/** Reader-facing label for a project lifecycle status. */
export function projectStatusLabel(status?: ProjectStatus | string | null): string {
  return PROJECT_STATUSES.find((s) => s.value === status)?.label || 'Proposed';
}

/** Statuses considered "open" — still accepting energy, not finished. */
export const OPEN_PROJECT_STATUSES: ProjectStatus[] = ['proposed', 'recruiting', 'active', 'paused'];

/** Statuses considered "completed". */
export const COMPLETED_PROJECT_STATUSES: ProjectStatus[] = ['complete', 'archived'];

/**
 * Top-level discovery tabs. Status-based groupings replace the old flat
 * "All · Project · Community Contributions" split, with Community Contributions
 * kept as its own stream.
 */
export const PROJECT_TABS = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open Projects' },
  { value: 'recruiting', label: 'Recruiting' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'community', label: 'Community Contributions' },
] as const;

export type ProjectTabValue = (typeof PROJECT_TABS)[number]['value'];

/**
 * Roles a project can request. Open-ended — members may enter any role not
 * listed here, and every role that appears on a project is collected at runtime
 * and offered as a filter option.
 */
export const PROJECT_ROLES: string[] = [
  'Researcher', 'Threat Hunter', 'Detection Engineer', 'Malware Analyst',
  'Reverse Engineer', 'Developer', 'DFIR Analyst', 'Cloud Engineer',
  'AppSec Engineer', 'GRC / Policy', 'Technical Writer', 'Reviewer',
  'Facilitator', 'Data Analyst',
];

/** Kinds surfaced on the Projects hub. */
export const PROJECT_KINDS = ['project', 'community'] as const;
