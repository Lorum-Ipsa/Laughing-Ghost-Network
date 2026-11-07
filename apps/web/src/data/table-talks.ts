import type { Difficulty, DeliveryMode, ExerciseStatus, ExerciseType, FormatMode, ScenarioType } from '@/lib/network';

/**
 * Table Talks taxonomy.
 *
 * Table Talks is a practice environment for decision-making across
 * cybersecurity. An exercise carries its own lifecycle (`exercise_status`),
 * independent of its publication status, plus practice context: exercise type,
 * scenario domain, difficulty, duration, format (individual/team), and delivery
 * (live/self-paced). No rankings or popularity scores — only chronological
 * order and a debrief.
 */

/** Exercise types shown in the Exercise Type filter, in display order. */
export const EXERCISE_TYPES: { value: ExerciseType; label: string }[] = [
  { value: 'tabletop_exercise', label: 'Tabletop Exercise' },
  { value: 'incident_simulation', label: 'Incident Simulation' },
  { value: 'threat_hunting', label: 'Threat Hunting Exercise' },
  { value: 'investigation', label: 'Investigation Exercise' },
  { value: 'detection_exercise', label: 'Detection Exercise' },
  { value: 'malware_analysis', label: 'Malware Analysis Scenario' },
  { value: 'red_blue_team', label: 'Red Team / Blue Team Scenario' },
  { value: 'crisis_decision', label: 'Crisis Decision Exercise' },
  { value: 'executive', label: 'Executive Exercise' },
  { value: 'technical_drill', label: 'Technical Drill' },
  { value: 'case_study', label: 'Case Study' },
  { value: 'after_action_review', label: 'After-Action Review' },
];

/** Scenario domains shown in the Scenario Type filter. */
export const SCENARIO_TYPES: { value: ScenarioType; label: string }[] = [
  { value: 'ransomware', label: 'Ransomware' },
  { value: 'identity_compromise', label: 'Identity Compromise' },
  { value: 'cloud_incident', label: 'Cloud Incident' },
  { value: 'insider_threat', label: 'Insider Threat' },
  { value: 'supply_chain', label: 'Supply Chain' },
  { value: 'web_appsec', label: 'Web/AppSec' },
  { value: 'malware', label: 'Malware' },
  { value: 'credential_theft', label: 'Credential Theft' },
  { value: 'lateral_movement', label: 'Lateral Movement' },
  { value: 'data_exfiltration', label: 'Data Exfiltration' },
  { value: 'ot_ics', label: 'OT/ICS' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'ai_security', label: 'AI Security' },
  { value: 'physical_cyber', label: 'Physical/Cyber' },
  { value: 'third_party_compromise', label: 'Third-Party Compromise' },
];

/** Difficulty levels. */
export const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'expert', label: 'Expert' },
];

/** Duration buckets for the Duration filter. */
export const DURATIONS: { value: string; label: string }[] = [
  { value: '30', label: 'Under 30 min' },
  { value: '30-60', label: '30–60 min' },
  { value: '60-90', label: '60–90 min' },
  { value: '90-120', label: '90–120 min' },
  { value: '120+', label: 'Over 120 min' },
  { value: 'self-paced', label: 'Self-paced' },
];

/** Individual or team format. */
export const FORMAT_MODES: { value: FormatMode; label: string }[] = [
  { value: 'individual', label: 'Individual' },
  { value: 'team', label: 'Team' },
];

/** Live or self-paced delivery. */
export const DELIVERY_MODES: { value: DeliveryMode; label: string }[] = [
  { value: 'live', label: 'Live' },
  { value: 'self_paced', label: 'Self-paced' },
];

/** Exercise lifecycle states, independent of publication status. */
export const EXERCISE_STATUSES: { value: ExerciseStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'open', label: 'Open' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

/** Reader-facing label for an exercise type. */
export function exerciseTypeLabel(value?: ExerciseType | string | null): string {
  return EXERCISE_TYPES.find((t) => t.value === value)?.label || 'Exercise';
}

/** Reader-facing label for a scenario type. */
export function scenarioTypeLabel(value?: ScenarioType | string | null): string {
  return SCENARIO_TYPES.find((t) => t.value === value)?.label || value || '';
}

/** Reader-facing label for a difficulty. */
export function difficultyLabel(value?: Difficulty | string | null): string {
  return DIFFICULTIES.find((d) => d.value === value)?.label || '';
}

/** Reader-facing label for a duration bucket. */
export function durationLabel(value?: string | null): string {
  return DURATIONS.find((d) => d.value === value)?.label || '';
}

/** Reader-facing label for a format mode. */
export function formatModeLabel(value?: FormatMode | string | null): string {
  return FORMAT_MODES.find((f) => f.value === value)?.label || '';
}

/** Reader-facing label for a delivery mode. */
export function deliveryLabel(value?: DeliveryMode | string | null): string {
  return DELIVERY_MODES.find((d) => d.value === value)?.label || '';
}

/** Reader-facing label for an exercise status. */
export function exerciseStatusLabel(value?: ExerciseStatus | string | null): string {
  return EXERCISE_STATUSES.find((s) => s.value === value)?.label || 'Open';
}

/**
 * Roles an exercise can be built around. Open-ended — members may enter any
 * role not listed here, and every role that appears on an exercise is collected
 * at runtime and offered as a filter option.
 */
export const EXERCISE_ROLES: string[] = [
  'Facilitator', 'Analyst', 'Incident Lead', 'Threat Hunter', 'Detection Engineer',
  'Malware Analyst', 'Forensics Analyst', 'Cloud Engineer', 'Red Team Operator',
  'Blue Team Defender', 'Executive', 'Communications Lead', 'Scribe', 'Observer',
];
