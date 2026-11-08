import type { Work } from '@/lib/network';

// Educational examples restored from the repository's English demo seed.
// Keep these separate from published member submissions.
const samples:Pick<Work,'id'|'kind'|'title'|'summary'|'tags'|'body'>[] = [
  {
    "id": "showcase-cloud-trust-paths",
    "kind": "research",
    "title": "Cloud identities: the forgotten trust paths",
    "summary": "Map trust relationships and spot permissions that exceed operational need.",
    "tags": "Cloud, IAM, Analysis",
    "body": "RESEARCH QUESTION\nHow can unused trust relationships be identified without confusing inactivity with absence of need?\n\nSCOPE\nThe study covers a lab tenant and synthetic identities. It does not claim the existence of a vulnerability in a provider.\n\nPROTOCOL\nInventory service accounts, roles, and policies. Build a graph of trust relationships. Compare effective permissions to audit events over a representative period. Submit discrepancies to owners before any change.\n\nDELIVERABLES\nA reproducible inventory, a list of trust paths to review, and traceable privilege-reduction decisions.\n\nLIMITS\nThe absence of logs is not proof of absence of use. Seasonal tasks and recovery plans must be taken into account."
  },
  {
    "id": "showcase-log-timeline",
    "kind": "writeup",
    "title": "Reconstructing a timeline from logs",
    "summary": "A reproducible DFIR writeup: time normalization, correlation, and explicit uncertainties.",
    "tags": "DFIR, Logs, Investigation",
    "body": "OBJECTIVE\nReconstruct a sequence of events from synthetic logs without presenting a hypothesis as a fact.\n\nSTEPS\nKeep source logs read-only and document their hash. Normalize timestamps to UTC while preserving the original timezone. Group events by host, account, and session ID.\n\nANALYSIS\nDistinguish observed facts, correlations, and hypotheses. For each step, indicate the source, confidence level, and missing data.\n\nREPRODUCIBILITY\nDeliver the applied transformations and a chronological table that lets you return to each source event.\n\nPRECAUTIONS\nDo not publish personal data or logs from a real incident without authorization and anonymization."
  },
  {
    "id": "showcase-lsass-detection",
    "kind": "detection",
    "title": "Detecting suspicious access to LSASS",
    "summary": "A documented Sigma rule, its limitations, and a validation protocol on an isolated environment.",
    "tags": "Sigma, Windows, T1003.001",
    "body": "CONTEXT\nAccess to the LSASS process can be part of a credential-dumping attempt. An isolated event is not enough to conclude: diagnostic and security tools can produce comparable telemetry.\n\nMETHOD\nCollect Sysmon ProcessAccess events (Event ID 10) in an authorized Windows lab. Verify the presence of TargetImage, SourceImage, and GrantedAccess. Correlate events with process creation and operator identity.\n\nVALIDATION\nImport the rule into a Sigma-compatible engine. Replay a set of synthetic logs containing benign access and access to investigate. Document results and exceptions; do not enable automated response without human review.\n\nLIMITS\nSysmon configuration drives coverage. An overly broad exclusion can hide relevant behavior. This illustrative rule is not production-ready detection."
  },
  {
    "id": "showcase-log-lens",
    "kind": "tool",
    "title": "Log Lens — normalize before investigating",
    "summary": "A lab utility to inspect JSON events and ease an initial triage.",
    "tags": "Python, DFIR, JSON",
    "body": "USAGE\nThis example reads JSONL events from standard input and prints those containing the timestamp and event fields. It does not replace a forensic parser or an evidence preservation system.\n\nRUNNING\nSave the code as log_lens.py then run: python log_lens.py < events.jsonl\n\nEXPECTED INPUT\nOne JSON object per line, containing at least timestamp and event. Invalid lines are reported on stderr.\n\nSCOPE\nUse only authorized and anonymized logs. The code is educational, with no guarantee of compatibility with all formats."
  }
];
const code:Record<string,string> = {
  "showcase-lsass-detection": "title: LSASS process access — educational example\nstatus: experimental\ndescription: Triage signal to correlate with local context\nlogsource:\n  product: windows\n  category: process_access\ndetection:\n  selection:\n    TargetImage|endswith: '\\lsass.exe'\n  condition: selection\nfalsepositives:\n  - Authorized security and diagnostic tools\nlevel: medium",
  "showcase-log-lens": "import json\nimport sys\n\nfor number, line in enumerate(sys.stdin, start=1):\n    try:\n        event = json.loads(line)\n        if not isinstance(event, dict):\n            raise ValueError(\"Expected a JSON object\")\n        if \"timestamp\" in event and \"event\" in event:\n            print(json.dumps(event, ensure_ascii=False))\n        else:\n            print(f\"Line {number}: missing fields\", file=sys.stderr)\n    except (ValueError, TypeError):\n        print(f\"Line {number}: invalid JSON\", file=sys.stderr)"
};
const created=new Date(1791348900*1000).toISOString();

export const showcaseWork:Work[]=samples.map(item=>({
  ...item,owner:'',author:'',source:'',code:code[item.id]??'',status:'published',
  example:true,language:'en',created,updated:created,
}));
