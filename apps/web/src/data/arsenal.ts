import type { ValidationStatus, WorkKind } from '@/lib/network';

/**
 * Arsenal taxonomy.
 *
 * The Arsenal is a repository of operational cybersecurity artifacts. This file
 * defines the artifact types surfaced in the Artifact Type filter, the
 * validation lifecycle (Draft → Tested → Community/Maintainer Validated →
 * Deprecated), and the suggested Language/Format and License options members can
 * attach to a contribution. Every list is open-ended: members may enter any
 * free-text value, and values that appear on artifacts are collected at runtime
 * and offered as filter options so the taxonomy grows with the network.
 */

/** Artifact types shown in the Arsenal Artifact Type filter, in display order. */
export const ARSENAL_TYPES: { kind: WorkKind; label: string }[] = [
  { kind: 'detection', label: 'Detection Rules' },
  { kind: 'sigma_rules', label: 'Sigma Rules' },
  { kind: 'yara_rules', label: 'YARA Rules' },
  { kind: 'network_rules', label: 'Suricata / Snort Rules' },
  { kind: 'rules', label: 'Other Rules' },
  { kind: 'hunting_queries', label: 'Hunting Queries' },
  { kind: 'siem_queries', label: 'SIEM Queries' },
  { kind: 'queries', label: 'Other Queries' },
  { kind: 'detection_packs', label: 'Detection Packs' },
  { kind: 'tool', label: 'Tools' },
  { kind: 'utilities', label: 'Utilities' },
  { kind: 'scripts', label: 'Scripts' },
  { kind: 'code', label: 'Code' },
  { kind: 'datasets', label: 'Datasets' },
  { kind: 'ioc_collections', label: 'IOC Collections' },
  { kind: 'threat_feeds', label: 'Threat Feeds' },
  { kind: 'playbooks', label: 'Playbooks' },
  { kind: 'runbooks', label: 'Runbooks' },
  { kind: 'frameworks', label: 'Frameworks' },
  { kind: 'checklists', label: 'Checklists' },
  { kind: 'config_baselines', label: 'Configuration Baselines' },
  { kind: 'hardening_guides', label: 'Hardening Guides' },
  { kind: 'policy_templates', label: 'Policy Templates' },
  { kind: 'ir_kits', label: 'Incident Response Kits' },
  { kind: 'forensic_artifacts', label: 'Forensic Artifacts' },
  { kind: 'malware_samples', label: 'Malware Samples' },
  { kind: 'attack_simulations', label: 'Attack Simulations' },
  { kind: 'adversary_emulation', label: 'Adversary Emulation Plans' },
  { kind: 'exploit_pocs', label: 'Exploit PoCs' },
  { kind: 'test_cases', label: 'Test Cases' },
  { kind: 'validation_harnesses', label: 'Validation Harnesses' },
  { kind: 'labs', label: 'Lab Environments' },
];

/** The set of kinds considered Arsenal artifacts, for loader filtering. */
export const ARSENAL_KINDS: WorkKind[] = ARSENAL_TYPES.map((t) => t.kind);

/** Label for an arsenal kind, or the generic kind label as fallback. */
export function arsenalTypeLabel(kind: WorkKind): string {
  return ARSENAL_TYPES.find((t) => t.kind === kind)?.label ?? kind;
}

/** Artifact validation lifecycle states. */
export const VALIDATION_STATUSES: { value: ValidationStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'tested', label: 'Tested' },
  { value: 'community_validated', label: 'Community Validated' },
  { value: 'maintainer_validated', label: 'Maintainer Validated' },
  { value: 'deprecated', label: 'Deprecated' },
];

/** Suggested Language / Format options for artifacts. */
export const FORMAT_OPTIONS: string[] = [
  'Python', 'YAML', 'JSON', 'KQL', 'SPL', 'Sigma', 'YARA', 'Rego', 'Lucene',
  'Suricata', 'Snort', 'STIX', 'OpenIOC', 'TAXII', 'PowerShell', 'Bash',
  'Go', 'Rust', 'C', 'C++', 'C#', 'Java', 'JavaScript', 'TypeScript',
  'Terraform', 'Ansible', 'CloudFormation', 'Markdown', 'XML', 'CSV',
  'SQL', 'Lua', 'Ruby', 'Dockerfile', 'HCL',
];

/** Suggested license options for artifacts. */
export const LICENSE_OPTIONS: string[] = [
  'MIT', 'Apache-2.0', 'BSD-3-Clause', 'BSD-2-Clause', 'GPL-3.0', 'GPL-2.0',
  'LGPL-3.0', 'MPL-2.0', 'AGPL-3.0', 'ISC', 'Unlicense', 'CC0-1.0',
  'CC-BY-4.0', 'CC-BY-SA-4.0', 'CC-BY-NC-4.0', 'Proprietary',
];
