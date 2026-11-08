import type { WorkKind } from '@/lib/network';

/**
 * Research library taxonomy.
 *
 * The Research page separates **Research Type** (the form a contribution takes)
 * from **Domain / Specialty** (the area of cybersecurity it covers). Research
 * Type maps to a curated set of contribution kinds; Domain reuses the network's
 * canonical specialty taxonomy so the Research page and the Ghost directory
 * share one vocabulary.
 */

/** Research Types — contribution kinds surfaced on the Research page. */
export const RESEARCH_TYPES: { kind: WorkKind; label: string }[] = [
  { kind: 'research', label: 'Research' },
  { kind: 'investigation', label: 'Investigation' },
  { kind: 'analysis', label: 'Analysis' },
  { kind: 'papers', label: 'Paper' },
  { kind: 'presentations', label: 'Presentation' },
  { kind: 'advisories', label: 'Advisory' },
  { kind: 'writeup', label: 'Writeup' },
  { kind: 'datasets', label: 'Dataset' },
  { kind: 'experiment', label: 'Experiment' },
  { kind: 'case_study', label: 'Case Study' },
  { kind: 'peer_review', label: 'Peer Review' },
  { kind: 'malware_analysis', label: 'Malware Analysis' },
  { kind: 'vulnerability_research', label: 'Vulnerability Research' },
  { kind: 'intelligence', label: 'Threat Intelligence' },
];

/** The set of kinds considered research, for loader filtering. */
export const RESEARCH_KINDS: WorkKind[] = RESEARCH_TYPES.map((t) => t.kind);

/** Label for a research kind, or the generic kind label as fallback. */
export function researchTypeLabel(kind: WorkKind): string {
  return RESEARCH_TYPES.find((t) => t.kind === kind)?.label ?? kind;
}

/** Publication-date filter ranges. Values compared client-side after hydration. */
export const DATE_RANGES = [
  { value: 'all', label: 'All time' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '12m', label: 'Last 12 months' },
  { value: '2026', label: '2026' },
  { value: '2025', label: '2025' },
] as const;

export type DateRangeValue = (typeof DATE_RANGES)[number]['value'];

/** Review-status filter options. */
export const REVIEW_STATUSES = [
  { value: 'peer_reviewed', label: 'Peer reviewed' },
  { value: 'community_reviewed', label: 'Community reviewed' },
  { value: 'unreviewed', label: 'Unreviewed' },
] as const;

/** Regex for ATT&CK technique IDs (e.g. T1003, T1003.001). */
export const ATTACK_PATTERN = /\bT\d{4}(\.\d{3})?\b/gi;
/** Regex for CVE and CWE identifiers (e.g. CVE-2026-1234, CWE-79). */
export const VULN_PATTERN = /\b(?:CVE-\d{4}-\d{4,}|CWE-\d+)\b/gi;
