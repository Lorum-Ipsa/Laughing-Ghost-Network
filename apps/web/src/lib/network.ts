export type GhostProfile = { id: string; owner: string; handle: string; specialties: string; developing_specialties?: string; bio: string; portfolio: string; example: boolean; member: boolean; avatar?: string; language?: string; skills?: string; tools?: string; platform?: string; industry?: string; location?: string; location_disclosure?: LocationDisclosure; location_country?: string; location_region?: string; location_city?: string; languages?: string; available_for_work?: boolean; open_to_collaboration?: boolean; open_to_research?: boolean; open_to_mentorship?: boolean; open_to_speaking?: boolean; collaboration_interests?: string; external_links?: string; featured_work?: string; deleted?: boolean; deleted_at?: string; display_name?: string; pronouns?: string; show_external_identities?: boolean; show_language_proficiency?: boolean; allow_recruiter_contact?: boolean; preferred_translation_language?: string; always_show_original?: boolean; auto_translate?: boolean; never_translate_technical?: boolean; preferred_publication_language?: string; avatar_template?: string; avatar_visibility?: string; created: string; updated: string };

/**
 * Disclosure-controlled location model. A Ghost chooses how much location
 * detail to publish. Country is the maximum detail ever expected; city and
 * state/province are always optional and never required. The network never
 * exposes more location data than the Ghost has chosen to publish.
 */
export type LocationDisclosure = 'undisclosed' | 'remote' | 'country' | 'region' | 'city';

export const LOCATION_DISCLOSURES: { value: LocationDisclosure; label: string; hint: string }[] = [
  { value: 'undisclosed', label: 'Undisclosed', hint: 'No location shown.' },
  { value: 'remote', label: 'Remote', hint: 'Show “Remote” only.' },
  { value: 'country', label: 'Country', hint: 'Show your country.' },
];

/**
 * Coerce a stored disclosure value into one of the three offered options.
 * Legacy `region`/`city` values (from before the model was simplified to
 * Country / Remote / Undisclosed) collapse to `country` so existing profiles
 * never expose more than country going forward.
 */
export function normalizeDisclosure(value?: string | null): LocationDisclosure {
  if (value === 'remote' || value === 'country') return value;
  if (value === 'region' || value === 'city') return 'country';
  return 'undisclosed';
}

/** Reader-facing location string, capped at the Ghost's chosen disclosure level. */
export function locationDisplay(profile: { location_disclosure?: string | null; location_country?: string; location_region?: string; location_city?: string }): string {
  switch (profile.location_disclosure) {
    case 'remote': return 'Remote';
    case 'country': return profile.location_country || 'Undisclosed';
    case 'region': return [profile.location_region, profile.location_country].filter(Boolean).join(', ') || 'Undisclosed';
    case 'city': return [profile.location_city, profile.location_region, profile.location_country].filter(Boolean).join(', ') || 'Undisclosed';
    case 'undisclosed':
    default: return 'Undisclosed';
  }
}

/**
 * Filterable location tokens a Ghost has chosen to publish — never more.
 * Used by the directory and project filters so a search never surfaces
 * city/region data the Ghost has not disclosed.
 */
export function locationTokens(profile: { location_disclosure?: string | null; location_country?: string; location_region?: string; location_city?: string }): string[] {
  const tokens = new Set<string>();
  switch (profile.location_disclosure) {
    case 'remote': tokens.add('Remote'); break;
    case 'country':
      if (profile.location_country) tokens.add(profile.location_country);
      break;
    case 'region':
      if (profile.location_country) tokens.add(profile.location_country);
      if (profile.location_region) tokens.add(profile.location_region);
      break;
    case 'city':
      if (profile.location_country) tokens.add(profile.location_country);
      if (profile.location_region) tokens.add(profile.location_region);
      if (profile.location_city) tokens.add(profile.location_city);
      break;
    case 'undisclosed':
    default: tokens.add('Undisclosed'); break;
  }
  return [...tokens];
}

/** Published-work counts by kind, used as evidence on directory cards. */
export type WorkEvidence = Record<WorkKind, number>;

/** A directory entry: a profile enriched with its work evidence and a search index. */
export type DirectoryGhost = { profile: GhostProfile; evidence: WorkEvidence; searchIndex: string };

export type WorkKind = 'research' | 'detection' | 'intelligence' | 'writeup' | 'tool' | 'project' | 'exercise' | 'investigation' | 'malware_analysis' | 'vulnerability_research' | 'rules' | 'queries' | 'datasets' | 'playbooks' | 'frameworks' | 'advisories' | 'presentations' | 'papers' | 'labs' | 'code' | 'peer_review' | 'community' | 'analysis' | 'experiment' | 'case_study' | 'hunting_queries' | 'siem_queries' | 'yara_rules' | 'sigma_rules' | 'network_rules' | 'scripts' | 'utilities' | 'ioc_collections' | 'threat_feeds' | 'runbooks' | 'checklists' | 'detection_packs' | 'config_baselines' | 'hardening_guides' | 'policy_templates' | 'ir_kits' | 'forensic_artifacts' | 'malware_samples' | 'attack_simulations' | 'adversary_emulation' | 'exploit_pocs' | 'test_cases' | 'validation_harnesses';
export type ReviewStatus = 'unreviewed' | 'community_reviewed' | 'peer_reviewed';

/** Artifact validation state for Arsenal contributions. */
export type ValidationStatus = 'draft' | 'tested' | 'community_validated' | 'maintainer_validated' | 'deprecated';

/** Reader-facing label for an artifact's validation status. */
export function validationStatusLabel(status?: ValidationStatus | string | null): string {
  switch (status) {
    case 'tested': return 'Tested';
    case 'community_validated': return 'Community Validated';
    case 'maintainer_validated': return 'Maintainer Validated';
    case 'deprecated': return 'Deprecated';
    default: return 'Draft';
  }
}

/** Reader-facing label for a review status, independent of publication status. */
export function reviewStatusLabel(status?: ReviewStatus | string | null): string {
  switch (status) {
    case 'peer_reviewed': return 'Peer reviewed';
    case 'community_reviewed': return 'Community reviewed';
    default: return 'Unreviewed';
  }
}

/** Project lifecycle status, independent of publication status. */
export type ProjectStatus = 'proposed' | 'recruiting' | 'active' | 'paused' | 'complete' | 'archived';

/** Exercise type for Table Talks contributions. */
export type ExerciseType = 'tabletop_exercise' | 'incident_simulation' | 'threat_hunting' | 'investigation' | 'detection_exercise' | 'malware_analysis' | 'red_blue_team' | 'crisis_decision' | 'executive' | 'technical_drill' | 'case_study' | 'after_action_review';

/** Scenario domain for a Table Talks exercise. */
export type ScenarioType = 'ransomware' | 'identity_compromise' | 'cloud_incident' | 'insider_threat' | 'supply_chain' | 'web_appsec' | 'malware' | 'credential_theft' | 'lateral_movement' | 'data_exfiltration' | 'ot_ics' | 'healthcare' | 'ai_security' | 'physical_cyber' | 'third_party_compromise';

/** Difficulty level for a Table Talks exercise. */
export type Difficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';

/** Whether an exercise is run individually or as a team. */
export type FormatMode = 'individual' | 'team';

/** Whether an exercise is delivered live or self-paced. */
export type DeliveryMode = 'live' | 'self_paced';

/** Exercise lifecycle status, independent of publication status. */
export type ExerciseStatus = 'draft' | 'open' | 'scheduled' | 'completed' | 'archived';
export type WorkStatus = 'draft' | 'submitted' | 'revision_requested' | 'published' | 'rejected' | 'archived';
export type Work = { id: string; owner: string; author: string; title: string; kind: WorkKind; summary: string; body: string; tags: string; source: string; code: string; status: WorkStatus; example: boolean; deleted?: boolean; deleted_at?: string; language?: string; domain?: string; review_status?: ReviewStatus; validation_status?: ValidationStatus; version?: string; license?: string; platform?: string; format?: string; tool?: string; project_status?: ProjectStatus; roles_needed?: string; technologies?: string; repository?: string; goals?: string; scope?: string; deliverables?: string; milestones?: string; accepting_contributors?: boolean; exercise_type?: ExerciseType; scenario_type?: ScenarioType; difficulty?: Difficulty; duration?: string; format_mode?: FormatMode; delivery?: DeliveryMode; exercise_status?: ExerciseStatus; industry?: string; objectives?: string; initial_conditions?: string; timeline?: string; injects?: string; evidence?: string; decision_points?: string; facilitator_notes?: string; debrief?: string; lessons_learned?: string; created: string; updated: string; expand?: { author?: GhostProfile } };
/** A reader-facing translation of a published work's prose. Code/technical artifacts are never translated. */
export type Translation = { id: string; work: string; language: string; title: string; summary: string; body: string; source: 'machine' | 'human'; created: string; updated: string };

/** Reader-facing singular labels for a contribution kind. */
export const kindLabels: Record<WorkKind, string> = {
  research: 'Research', detection: 'Detection', intelligence: 'Threat Intelligence', writeup: 'Writeup', tool: 'Tool', project: 'Project', exercise: 'Exercise',
  investigation: 'Investigation', malware_analysis: 'Malware Analysis', vulnerability_research: 'Vulnerability Research', rules: 'Rules', queries: 'Queries', datasets: 'Datasets', playbooks: 'Playbooks', frameworks: 'Frameworks', advisories: 'Advisories', presentations: 'Presentations', papers: 'Papers', labs: 'Labs', code: 'Code', peer_review: 'Peer Review', community: 'Community Contributions',
  analysis: 'Analysis', experiment: 'Experiment', case_study: 'Case Study',
  hunting_queries: 'Hunting Queries', siem_queries: 'SIEM Queries', yara_rules: 'YARA Rules', sigma_rules: 'Sigma Rules', network_rules: 'Suricata / Snort Rules', scripts: 'Scripts', utilities: 'Utilities', ioc_collections: 'IOC Collections', threat_feeds: 'Threat Feeds', runbooks: 'Runbooks', checklists: 'Checklists', detection_packs: 'Detection Packs', config_baselines: 'Configuration Baselines', hardening_guides: 'Hardening Guides', policy_templates: 'Policy Templates', ir_kits: 'Incident Response Kits', forensic_artifacts: 'Forensic Artifacts', malware_samples: 'Malware Samples', attack_simulations: 'Attack Simulations', adversary_emulation: 'Adversary Emulation Plans', exploit_pocs: 'Exploit PoCs', test_cases: 'Test Cases', validation_harnesses: 'Validation Harnesses',
};

/** Reader-facing plural labels for evidence counts. */
export const evidenceLabels: Record<WorkKind, string> = {
  research: 'Research Posts', detection: 'Detection Rules', intelligence: 'Intelligence Reports', writeup: 'Writeups', tool: 'Tools', project: 'Projects', exercise: 'Table Talks',
  investigation: 'Investigations', malware_analysis: 'Malware Analyses', vulnerability_research: 'Vulnerability Research', rules: 'Rules', queries: 'Queries', datasets: 'Datasets', playbooks: 'Playbooks', frameworks: 'Frameworks', advisories: 'Advisories', presentations: 'Presentations', papers: 'Papers', labs: 'Labs', code: 'Code', peer_review: 'Peer Reviews', community: 'Community Contributions',
  analysis: 'Analyses', experiment: 'Experiments', case_study: 'Case Studies',
  hunting_queries: 'Hunting Queries', siem_queries: 'SIEM Queries', yara_rules: 'YARA Rules', sigma_rules: 'Sigma Rules', network_rules: 'Suricata / Snort Rules', scripts: 'Scripts', utilities: 'Utilities', ioc_collections: 'IOC Collections', threat_feeds: 'Threat Feeds', runbooks: 'Runbooks', checklists: 'Checklists', detection_packs: 'Detection Packs', config_baselines: 'Configuration Baselines', hardening_guides: 'Hardening Guides', policy_templates: 'Policy Templates', ir_kits: 'Incident Response Kits', forensic_artifacts: 'Forensic Artifacts', malware_samples: 'Malware Samples', attack_simulations: 'Attack Simulations', adversary_emulation: 'Adversary Emulation Plans', exploit_pocs: 'Exploit PoCs', test_cases: 'Test Cases', validation_harnesses: 'Validation Harnesses',
};

/** Display order for contribution kinds across the directory and profile. */
export const KIND_ORDER: WorkKind[] = ['research', 'intelligence', 'investigation', 'analysis', 'experiment', 'case_study', 'detection', 'detection_packs', 'sigma_rules', 'yara_rules', 'network_rules', 'rules', 'hunting_queries', 'siem_queries', 'queries', 'malware_analysis', 'vulnerability_research', 'writeup', 'tool', 'utilities', 'scripts', 'code', 'datasets', 'ioc_collections', 'threat_feeds', 'playbooks', 'runbooks', 'frameworks', 'checklists', 'config_baselines', 'hardening_guides', 'policy_templates', 'ir_kits', 'forensic_artifacts', 'malware_samples', 'attack_simulations', 'adversary_emulation', 'exploit_pocs', 'test_cases', 'validation_harnesses', 'advisories', 'papers', 'presentations', 'labs', 'project', 'exercise', 'peer_review', 'community'];

export function tagsOf(value?: string | null) { return (value || '').split(',').map(tag => tag.trim()).filter(Boolean); }

/**
 * Public avatar URL for a Ghost profile. Avatars are stored as files on the
 * `ghost_profiles` collection, served through the reverse-proxied PocketBase
 * at `/hcgi/platform`. Returns an empty string when no avatar is set so callers
 * can fall back to the Ghost mark. An optional thumb (e.g. `400x400`) selects a
 * PocketBase-generated thumbnail.
 */
export function profileAvatarUrl(profile: { id: string; avatar?: string | null }, thumb?: string): string {
  if (!profile?.avatar) return '';
  const base = '/hcgi/platform/api/files/ghost_profiles';
  const url = `${base}/${profile.id}/${profile.avatar}`;
  return thumb ? `${url}?thumb=${thumb}` : url;
}
export function safeExternal(value?: string | null) { try { const url = new URL(value || ''); return ['https:', 'http:'].includes(url.protocol) ? value : undefined; } catch { return undefined; } }
export function paragraphs(value: string) { return value.split('\n\n').filter(Boolean); }

/** Parse a member's external identity links, one per line as `Platform: url`. */
export type ExternalIdentity = { platform: string; url: string };
export function parseExternalLinks(value?: string): ExternalIdentity[] {
  if (!value) return [];
  return value.split('\n').map((line) => {
    const idx = line.indexOf(':');
    if (idx === -1) return null;
    const platform = line.slice(0, idx).trim();
    const url = line.slice(idx + 1).trim();
    if (!platform || !url) return null;
    const safe = safeExternal(url);
    return safe ? { platform, url: safe } : null;
  }).filter((x): x is ExternalIdentity => x !== null);
}

/** A member's relationship to a project or exercise: contributor, watcher, a pending request, or a maintainer invitation. */
export type ParticipationRelation = 'contributor' | 'watcher' | 'request' | 'invited';
export type Participation = { id: string; owner: string; work: string; message: string; role?: string; relation?: ParticipationRelation; created: string; updated: string; expand?: { work?: Work } };

/** Task lifecycle inside a project workspace. */
export type ProjectTaskStatus = 'open' | 'in_progress' | 'complete';
export type ProjectTask = { id: string; owner: string; work: string; title: string; description: string; assigned_to: string; skill: string; due_date: string; related_artifact: string; status: ProjectTaskStatus; created: string; updated: string; expand?: { assigned_to?: { id: string; name?: string }; related_artifact?: Work } };

/** A maintainer's progress post on a project. */
export type ProjectUpdate = { id: string; owner: string; work: string; title: string; body: string; created: string; updated: string };

/** An open role a Ghost can apply to. */
export type ProjectRole = { id: string; owner: string; work: string; title: string; skills: string; commitment: string; location: string; description: string; created: string; updated: string };

/** A snapshotted revision of a contribution's content. */
export type WorkRevision = { id: string; owner: string; work: string; title: string; summary: string; body: string; version: number; reason: string; created: string };

/** A participant's decision submitted during a Table Talks exercise. */
export type ExerciseDecision = { id: string; owner: string; work: string; role?: string; decision_point: string; decision: string; rationale?: string; created: string; updated: string; expand?: { owner?: { id: string; name?: string } } };

/** Structured collaboration request between two Ghosts. */
export type CollaborationRequestType = 'project_collaboration' | 'research_collaboration' | 'peer_review' | 'table_talk' | 'mentorship' | 'speaking' | 'general';
export type CollaborationRequestStatus = 'pending' | 'accepted' | 'declined';
export type CollaborationRequest = { id: string; owner: string; recipient: string; request_type: CollaborationRequestType; message: string; related_work?: string; status: CollaborationRequestStatus; created: string; updated: string; expand?: { recipient?: GhostProfile; owner?: { id: string; name?: string } } };

/** A member's saved network search. */
export type SavedSearch = { id: string; owner: string; name: string; query: string; filters: string; created: string; updated: string };

export const COLLAB_REQUEST_LABELS: Record<CollaborationRequestType, string> = {
  project_collaboration: 'Project collaboration',
  research_collaboration: 'Research collaboration',
  peer_review: 'Peer review',
  table_talk: 'Table Talk',
  mentorship: 'Mentorship',
  speaking: 'Speaking',
  general: 'General collaboration',
};

/** Parse a member's featured-work IDs (comma-separated). */
export function featuredIds(value?: string): string[] {
  if (!value) return [];
  return value.split(',').map((id) => id.trim()).filter(Boolean);
}
