import type { GhostProfile, Work } from '@/lib/network';

// Educational examples restored from the repository's English demo seed.
// Keep these separate from published member submissions.
const samples:(Pick<Work,'id'|'kind'|'title'|'summary'|'tags'|'body'> & Partial<Work>)[] = [
  {
    "id": "showcase-cloud-trust-paths",
    "domain": "Cloud IAM Analysis",
    "review_status": "peer_reviewed",
    "kind": "research",
    "title": "Cloud identities: the forgotten trust paths",
    "summary": "Map trust relationships and spot permissions that exceed operational need.",
    "tags": "Cloud, IAM, Analysis",
    "body": "RESEARCH QUESTION\nHow can unused trust relationships be identified without confusing inactivity with absence of need?\n\nSCOPE\nThe study covers a lab tenant and synthetic identities. It does not claim the existence of a vulnerability in a provider.\n\nPROTOCOL\nInventory service accounts, roles, and policies. Build a graph of trust relationships. Compare effective permissions to audit events over a representative period. Submit discrepancies to owners before any change.\n\nDELIVERABLES\nA reproducible inventory, a list of trust paths to review, and traceable privilege-reduction decisions.\n\nLIMITS\nThe absence of logs is not proof of absence of use. Seasonal tasks and recovery plans must be taken into account."
  },
  {
    "id": "showcase-log-timeline",
    "domain": "Digital Forensics",
    "review_status": "peer_reviewed",
    "kind": "writeup",
    "title": "Reconstructing a timeline from logs",
    "summary": "A reproducible DFIR writeup: time normalization, correlation, and explicit uncertainties.",
    "tags": "DFIR, Logs, Investigation",
    "body": "OBJECTIVE\nReconstruct a sequence of events from synthetic logs without presenting a hypothesis as a fact.\n\nSTEPS\nKeep source logs read-only and document their hash. Normalize timestamps to UTC while preserving the original timezone. Group events by host, account, and session ID.\n\nANALYSIS\nDistinguish observed facts, correlations, and hypotheses. For each step, indicate the source, confidence level, and missing data.\n\nREPRODUCIBILITY\nDeliver the applied transformations and a chronological table that lets you return to each source event.\n\nPRECAUTIONS\nDo not publish personal data or logs from a real incident without authorization and anonymization."
  },
  {
    "id": "showcase-lsass-detection",
    "domain": "Threat Hunting",
    "validation_status": "tested",
    "kind": "detection",
    "title": "Detecting suspicious access to LSASS",
    "summary": "A documented Sigma rule, its limitations, and a validation protocol on an isolated environment.",
    "tags": "Sigma, Windows, T1003.001",
    "body": "CONTEXT\nAccess to the LSASS process can be part of a credential-dumping attempt. An isolated event is not enough to conclude: diagnostic and security tools can produce comparable telemetry.\n\nMETHOD\nCollect Sysmon ProcessAccess events (Event ID 10) in an authorized Windows lab. Verify the presence of TargetImage, SourceImage, and GrantedAccess. Correlate events with process creation and operator identity.\n\nVALIDATION\nImport the rule into a Sigma-compatible engine. Replay a set of synthetic logs containing benign access and access to investigate. Document results and exceptions; do not enable automated response without human review.\n\nLIMITS\nSysmon configuration drives coverage. An overly broad exclusion can hide relevant behavior. This illustrative rule is not production-ready detection."
  },
  {
    "id": "showcase-log-lens",
    "domain": "Log Analysis",
    "validation_status": "community_validated",
    "kind": "tool",
    "title": "Log Lens — normalize before investigating",
    "summary": "A lab utility to inspect JSON events and ease an initial triage.",
    "tags": "Python, DFIR, JSON",
    "body": "USAGE\nThis example reads JSONL events from standard input and prints those containing the timestamp and event fields. It does not replace a forensic parser or an evidence preservation system.\n\nRUNNING\nSave the code as log_lens.py then run: python log_lens.py < events.jsonl\n\nEXPECTED INPUT\nOne JSON object per line, containing at least timestamp and event. Invalid lines are reported on stderr.\n\nSCOPE\nUse only authorized and anonymized logs. The code is educational, with no guarantee of compatibility with all formats."
  },
  {
    "id": "demo-detection-lab",
    "kind": "project",
    "author": "nullspectre",
    "summary": "Build a detection-validation lab together, documented and reproducible.",
    "tags": "Collaboration, Sigma, Lab",
    "body": "INTENT\nDemo project: design an isolated environment to test detection rules with synthetic telemetry.\n\nWORKSTREAMS\nDefine a test-set format, document collection prerequisites, and create a coverage matrix. Each proposal must include its hypotheses and a benign test case.\n\nCONTRIBUTE\nPropose documentation, an anonymized event set, or a validation method. Specify the scope, deliverable, and limits.\n\nGUARDRAILS\nNo testing on third-party systems. No datasets containing secrets or real identities. Human review is required before any publication.",
    "title": "Detection Lab",
    "project_status": "recruiting",
    "roles_needed": "Detection Engineer, Windows Researcher, Python Developer",
    "technologies": "Sigma, Sysmon, Windows, Lab",
    "goals": "Build an isolated, reproducible environment for validating detection rules against synthetic telemetry, with a documented coverage matrix.",
    "scope": "Windows endpoint telemetry (Sysmon + Event Log). No production systems, no real secrets, no testing against third-party infrastructure.",
    "deliverables": "A documented lab setup guide, a synthetic event dataset, and a detection coverage matrix with benign test cases for each rule.",
    "milestones": "Define the test-event format\nDocument collection prerequisites\nBuild the coverage matrix\nPublish the validation method"
  },
  {
    "id": "demo-cloud-incident",
    "kind": "exercise",
    "author": "quietbyte",
    "title": "Table Talk #01 — Cloud incident",
    "summary": "A tabletop exercise to analyze an IAM alert, compare hypotheses, and document decisions.",
    "tags": "Exercise, Cloud, Incident response",
    "body": "SCENARIO OVERVIEW\nA synthetic cloud tenant with audit logging enabled receives an IAM alert: a service account has created a new access key outside its usual maintenance window. Minutes later, a read permission is added to a role the account can assume. The on-call analyst must decide what to request, which hypotheses to test, and what containment is proportionate — before the situation is fully understood.\n\nThis is a tabletop exercise. No access to a real infrastructure is required. The goal is not to find the one right answer but to make the reasoning observable, comparable, and reusable.",
    "exercise_type": "tabletop_exercise",
    "scenario_type": "cloud_incident",
    "difficulty": "intermediate",
    "duration": "60-90",
    "format_mode": "team",
    "delivery": "self_paced",
    "exercise_status": "open",
    "industry": "Cloud",
    "domain": "Cloud Security, Incident Response",
    "roles_needed": "Analyst, Incident Lead",
    "platform": "AWS, Cloud",
    "objectives": "Practice triaging an IAM alert under incomplete information. Compare competing hypotheses before acting. Document decisions and their rationale. Communicate uncertainty without overstating confidence.",
    "initial_conditions": "A synthetic cloud tenant with audit logging enabled. A service account named svc-reporting normally creates one access key per quarter during a maintenance window. No production systems or real credentials are involved.",
    "timeline": "T+00 — svc-reporting creates a new access key outside its usual window.\nT+10 — a read permission is added to a role the service account can assume.\nT+25 — a short-lived API session queries object metadata from a bucket the account does not normally touch.\nT+40 — the alert reaches the on-call analyst.",
    "injects": "Inject 1 — the IAM alert with the key-creation event.\nInject 2 — the role-permission change audit entry.\nInject 3 — a partial CloudTrail excerpt showing the metadata API call.\nInject 4 — a stakeholder asking whether to disable the account immediately.",
    "evidence": "Synthetic CloudTrail events (key creation, role update, API call). IAM policy snapshot before and after the change. A redacted session activity log. All data is fabricated for the exercise.",
    "decision_points": "Disable the service account now or continue gathering context? Which hypotheses explain a benign key creation? What is the proportionate containment given the evidence? How do you escalate without confirming intent?",
    "facilitator_notes": "Let participants disagree before converging. Press for the evidence behind each hypothesis. Do not reveal whether the activity is malicious. Keep the focus on the decision process, not the “right” answer. Reserve the last 15 minutes for debrief.",
    "debrief": "Compare the timelines participants built. Which decisions were reversible, and which were not? Where did confidence outrun evidence? What additional telemetry would have changed the outcome?",
    "lessons_learned": "Document reusable signals (key creation outside maintenance windows, privilege creep). Note where logging gaps created ambiguity. Capture one detection idea and one process improvement per participant group."
  }
];
const code:Record<string,string> = {
  "showcase-lsass-detection": "title: LSASS process access — educational example\nstatus: experimental\ndescription: Triage signal to correlate with local context\nlogsource:\n  product: windows\n  category: process_access\ndetection:\n  selection:\n    TargetImage|endswith: '\\lsass.exe'\n  condition: selection\nfalsepositives:\n  - Authorized security and diagnostic tools\nlevel: medium",
  "showcase-log-lens": "import json\nimport sys\n\nfor number, line in enumerate(sys.stdin, start=1):\n    try:\n        event = json.loads(line)\n        if not isinstance(event, dict):\n            raise ValueError(\"Expected a JSON object\")\n        if \"timestamp\" in event and \"event\" in event:\n            print(json.dumps(event, ensure_ascii=False))\n        else:\n            print(f\"Line {number}: missing fields\", file=sys.stderr)\n    except (ValueError, TypeError):\n        print(f\"Line {number}: invalid JSON\", file=sys.stderr)"
};
const created=new Date(1791348900*1000).toISOString();

export const demoProfiles: GhostProfile[] = [
  {
    "handle": "nullspectre",
    "specialties": "Detection Engineering, Threat Hunting",
    "bio": "Demo profile. Specialties: behavioral detection, Windows telemetry, and Sigma rule validation."
  },
  {
    "handle": "quietbyte",
    "specialties": "Cloud Security, Security Research",
    "bio": "Demo profile. Specialties: cloud identities, least privilege, and audit log analysis."
  },
  {
    "handle": "echo_zero",
    "specialties": "DFIR, Reverse Engineering",
    "bio": "Demo profile. Specialties: digital forensics, timeline reconstruction, and static analysis."
  }
].map(profile => ({
  ...profile, id: `demo-${profile.handle}`, owner: '', portfolio: '', member: false,
  example: true, language: 'en', created, updated: created,
}));

const sampleAuthors: Record<string, string> = {
  'showcase-cloud-trust-paths': 'quietbyte',
  'showcase-log-timeline': 'echo_zero',
  'showcase-lsass-detection': 'nullspectre',
  'showcase-log-lens': 'echo_zero',
};

export const showcaseWork: Work[] = samples.map(item => {
  const profile = demoProfiles.find(profile => profile.handle === (item.author ?? sampleAuthors[item.id]));
  return {
    ...item, owner: '', author: profile?.id ?? '', source: '', code: code[item.id] ?? '',
    status: 'published', example: true, language: 'en', created, updated: created,
    expand: { author: profile },
  };
});
