import { ghostProfilePath } from '@/lib/ghost-handle';
import { Link } from 'react-router';
import { ArrowUpRight, FileText, ScanLine, Terminal, FlaskConical, GitBranch, MessagesSquare, Radar, Search, Bug, ShieldAlert, Database, BookOpen, Boxes, Megaphone, Presentation, ClipboardCheck, Users, Code2, ShieldCheck, Filter, Microscope, FileSearch, FileCode, Wrench, Tags, Rss, ListChecks, SlidersHorizontal, Crosshair, Target, Zap, BadgeCheck } from 'lucide-react';
import { kindLabels, reviewStatusLabel, tagsOf, validationStatusLabel, type ValidationStatus, type Work, type WorkKind } from '@/lib/network';
import { contentLanguageLabel } from '@/lib/languages';
import { GhostAvatar } from '@/components/ghost-avatar';

const icons: Record<WorkKind, typeof FileText> = {
  research: FlaskConical, detection: ScanLine, tool: Terminal, writeup: FileText, project: GitBranch, exercise: MessagesSquare, intelligence: Radar,
  investigation: Search, malware_analysis: Bug, vulnerability_research: ShieldAlert, rules: ShieldCheck, queries: Filter, datasets: Database, playbooks: BookOpen, frameworks: Boxes, advisories: Megaphone, presentations: Presentation, papers: FileText, labs: FlaskConical, code: Code2, peer_review: ClipboardCheck, community: Users,
  analysis: Microscope, experiment: FlaskConical, case_study: FileSearch,
  hunting_queries: Search, siem_queries: Filter, yara_rules: ShieldCheck, sigma_rules: FileCode, network_rules: Radar, scripts: Terminal, utilities: Wrench, ioc_collections: Tags, threat_feeds: Rss, runbooks: BookOpen, checklists: ListChecks, detection_packs: Boxes, config_baselines: SlidersHorizontal, hardening_guides: ShieldCheck, policy_templates: FileText, ir_kits: ClipboardCheck, forensic_artifacts: FileSearch, malware_samples: Bug, attack_simulations: Crosshair, adversary_emulation: Target, exploit_pocs: Zap, test_cases: FlaskConical, validation_harnesses: BadgeCheck,
};

/** Optional card metadata computed by the Research and Arsenal libraries. */
export type WorkCardMeta = {
  /** Pre-formatted publication label, e.g. "Oct 2026". */
  published?: string;
  /** Peer-review state, independent of publication status. */
  reviewStatus?: 'unreviewed' | 'community_reviewed' | 'peer_reviewed';
  /** Artifact validation state (Arsenal), independent of publication status. */
  validationStatus?: ValidationStatus;
  /** Related artifacts from the same author, e.g. 2 detections · 1 project. */
  artifacts?: { label: string; count: number }[];
};

export function WorkCard({ work, meta, panel = false }: { work: Work; meta?: WorkCardMeta; panel?: boolean }) {
  const Icon = icons[work.kind];
  const langLabel = contentLanguageLabel(work.language);
  const reviewLabel = meta?.reviewStatus ? reviewStatusLabel(meta.reviewStatus) : undefined;
  const validationLabel = meta?.validationStatus ? validationStatusLabel(meta.validationStatus) : undefined;
  const hasMeta = meta && (meta.published || reviewLabel || validationLabel || (meta.artifacts && meta.artifacts.length > 0));
  return <article className={panel?"work-card library-work-panel":"work-card"}>{!panel&&<div className={`work-visual visual-${work.kind}`} aria-hidden="true"><Icon strokeWidth={1} size={65}/><span className="visual-cross cross-a">+</span><span className="visual-cross cross-b">+</span><span className="visual-caption">LGN / {work.kind.toUpperCase()}</span>{work.kind === 'detection' && <div className="visual-code"><span>logsource: windows</span><span>condition: selection</span><span>level: medium</span></div>}{work.kind === 'research' && <div className="visual-orbit"/>}{work.kind === 'writeup' && <div className="visual-lines"/>}</div>}<div className="work-card-content"><div className="work-category">{kindLabels[work.kind]}{!panel&&<ArrowUpRight size={16}/>}</div>{work.domain && <p className="work-domain">{work.domain}</p>}<h3><Link to={`/work/${work.id}`}>{work.title}</Link></h3><p>{work.summary}</p><div className="tags">{tagsOf(work.tags).slice(0, 3).map(tag => <span key={tag}>{tag}</span>)}</div><div className="work-author">{work.example&&!work.expand?.author?<span>Laughing Ghost Network</span>:<Link to={ghostProfilePath(work.expand?.author?.handle || '')}><GhostAvatar profile={work.expand?.author ?? null} size={18} className="inline-avatar" /> {work.expand?.author?.handle || 'Ghost'}</Link>}<span className="work-author-meta">{langLabel && <span className="work-lang">{langLabel}</span>}</span></div>{hasMeta && <dl className="work-meta">{meta!.published && <div className="work-meta-row"><dt>Published</dt><dd>{meta!.published}</dd></div>}{validationLabel && <div className="work-meta-row"><dt>Validation</dt><dd><span className={`validation-badge validation-${meta!.validationStatus}`}>{validationLabel}</span></dd></div>}{reviewLabel && <div className="work-meta-row"><dt>Status</dt><dd>{reviewLabel}</dd></div>}{meta!.artifacts && meta!.artifacts.length > 0 && <div className="work-meta-row"><dt>Related artifacts</dt><dd>{meta!.artifacts.map(a => `${a.count} ${a.label}`).join(' · ')}</dd></div>}</dl>}{panel&&<Link to={`/work/${work.id}`} className="library-panel-view">View contribution <ArrowUpRight size={14} /></Link>}</div></article>;
}
