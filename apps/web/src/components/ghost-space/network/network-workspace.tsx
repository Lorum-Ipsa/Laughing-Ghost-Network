import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Search, X, SlidersHorizontal, FolderGit2, Radio, FileText, Users } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { pocketbaseClient as pb } from '@/lib/pocketbase-client';
import type { DirectoryGhost, GhostProfile, Work, WorkKind } from '@/lib/network';
import { kindLabels, locationTokens, tagsOf } from '@/lib/network';
import { SearchableMultiSelect } from '@/components/ghosts/searchable-multi-select';
import { ALL_SPECIALTIES, SPECIALTY_GROUPS } from '@/data/specialties';
import { SKILL_OPTIONS, TOOL_OPTIONS, PLATFORM_OPTIONS, INDUSTRY_OPTIONS, LANGUAGE_NAMES } from '@/data/taxonomy';
import { contentLanguageLabel } from '@/lib/languages';
import { NetworkGhostCard } from '@/components/ghost-space/network/network-ghost-card';
import { CollaborationRequestDialog } from '@/components/ghost-space/network/collaboration-request-dialog';
import { SavedSearches, type NetworkFilters } from '@/components/ghost-space/network/saved-searches';
import { CollaborationRequests } from '@/components/ghost-space/network/collaboration-requests';

const DEFAULT_FILTERS: NetworkFilters = {
	query: '', specialties: [], skills: [], tools: [], platforms: [],
	industries: [], languages: [], locations: [], contributionTypes: [],
	availableForWork: false, openToCollaboration: false, openToResearch: false,
	openToMentorship: false, openToSpeaking: false,
};

const CONTRIBUTION_LABELS = Object.values(kindLabels) as string[];
const KIND_BY_LABEL = new Map<string, WorkKind>(
	(Object.entries(kindLabels) as [WorkKind, string][]).map(([kind, label]) => [label, kind]),
);

function collectTags(ghosts: DirectoryGhost[], accessor: (p: GhostProfile) => string): string[] {
	const set = new Set<string>();
	for (const { profile } of ghosts) for (const tag of tagsOf(accessor(profile))) set.add(tag);
	return [...set];
}

function collectLocations(ghosts: DirectoryGhost[]): string[] {
	const set = new Set<string>(['Remote', 'Undisclosed']);
	for (const { profile } of ghosts) for (const token of locationTokens(profile)) set.add(token);
	return [...set].sort((a, b) => a.localeCompare(b));
}

function mergeOptions(suggested: string[], collected: string[]): string[] {
	return [...new Set<string>([...suggested, ...collected])].sort((a, b) => a.localeCompare(b));
}

function relativeTime(iso: string): string {
	const then = new Date(iso).getTime();
	if (Number.isNaN(then)) return '';
	const diff = Date.now() - then;
	const mins = Math.round(diff / 60000);
	if (mins < 60) return `${mins}m ago`;
	const hours = Math.round(mins / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.round(hours / 24);
	if (days < 30) return `${days}d ago`;
	return `${Math.round(days / 30)}mo ago`;
}

/**
 * The Network workspace — the discovery and collaboration layer of Ghost Space.
 * A member searches the whole network (Ghosts, skills, tools, projects,
 * research, Table Talks), filters by specialty / taxonomy / language / location
 * / availability, discovers Ghosts they overlap with, projects recruiting, open
 * Table Talks, and recent work in their fields, save reusable searches, and
 * send structured collaboration requests. No followers, likes, rankings, or
 * popularity metrics — only overlap, lifecycle, and the work itself.
 */
export function NetworkWorkspace({
	profile,
	work,
}: {
	profile: GhostProfile | null;
	work: Work[];
	onRefresh: () => void;
}) {
	const { user } = useAuth();
	const [ghosts, setGhosts] = useState<DirectoryGhost[]>([]);
	const [allWork, setAllWork] = useState<Work[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [filters, setFilters] = useState<NetworkFilters>(DEFAULT_FILTERS);
	const [panelOpen, setPanelOpen] = useState(false);
	const [requestFor, setRequestFor] = useState<{ recipient: GhostProfile; relatedWork?: Work | null } | null>(null);
	const [reqRevision, setReqRevision] = useState(0);

	useEffect(() => {
		let active = true;
		setLoading(true);
		Promise.all([
			pb.collection('ghost_profiles').getFullList<GhostProfile>({ sort: 'handle', requestKey: null }),
			pb.collection('ghost_work').getFullList<Work>({ filter: "status = 'published'", expand: 'author', sort: '-created', requestKey: null }),
		])
			.then(([profiles, published]) => {
				if (!active) return;
				const workByAuthor = new Map<string, Work[]>();
				for (const item of published) {
					const list = workByAuthor.get(item.author) || [];
					list.push(item);
					workByAuthor.set(item.author, list);
				}
				const built = profiles
					.filter((p) => !p.deleted)
					.map((p) => {
						const authorWork = workByAuthor.get(p.id) || [];
						const searchIndex = [
							p.handle, p.bio, p.specialties, p.developing_specialties, p.skills, p.tools,
							p.platform, p.industry, p.languages, ...locationTokens(p), p.collaboration_interests,
							...authorWork.flatMap((item) => [item.title, item.summary, item.tags, item.kind, kindLabels[item.kind], item.domain || '', item.body.slice(0, 1200)]),
						].filter(Boolean).join(' ').toLowerCase();
						return { profile: p, evidence: {} as Record<WorkKind, number>, searchIndex };
					});
				setGhosts(built);
				setAllWork(published);
				setError('');
			})
			.catch(() => { if (active) setError('Could not load the network. Try again in a moment.'); })
			.finally(() => { if (active) setLoading(false); });
		return () => { active = false; };
	}, []);

	const collected = useMemo(() => ({
		skills: collectTags(ghosts, (p) => p.skills || ''),
		tools: collectTags(ghosts, (p) => p.tools || ''),
		platforms: collectTags(ghosts, (p) => p.platform || ''),
		industries: collectTags(ghosts, (p) => p.industry || ''),
		locations: collectLocations(ghosts),
		languages: collectTags(ghosts, (p) => p.languages || ''),
	}), [ghosts]);

	const options = useMemo(() => ({
		specialties: ALL_SPECIALTIES,
		skills: mergeOptions(SKILL_OPTIONS, collected.skills),
		tools: mergeOptions(TOOL_OPTIONS, collected.tools),
		platforms: mergeOptions(PLATFORM_OPTIONS, collected.platforms),
		industries: mergeOptions(INDUSTRY_OPTIONS, collected.industries),
		contributionTypes: CONTRIBUTION_LABELS,
		languages: mergeOptions(LANGUAGE_NAMES, collected.languages),
		locations: collected.locations,
	}), [collected]);

	const activeCount =
		filters.specialties.length + filters.skills.length + filters.tools.length + filters.platforms.length +
		filters.industries.length + filters.languages.length + filters.locations.length + filters.contributionTypes.length +
		(filters.availableForWork ? 1 : 0) + (filters.openToCollaboration ? 1 : 0) + (filters.openToResearch ? 1 : 0) +
		(filters.openToMentorship ? 1 : 0) + (filters.openToSpeaking ? 1 : 0);
	const isSearching = Boolean(filters.query || activeCount);

	const myProjects = useMemo(() => work.filter((w) => w.kind === 'project' || w.kind === 'community'), [work]);

	const filtered = useMemo(() => {
		if (!isSearching) return [];
		const tokens = filters.query.toLowerCase().split(/\s+/).filter(Boolean);
		const selectedKinds = filters.contributionTypes.map((l) => KIND_BY_LABEL.get(l)).filter((k): k is WorkKind => Boolean(k));
		return ghosts.filter(({ profile: p, searchIndex }) => {
			if (p.owner === user?.id) return false;
			if (tokens.length && !tokens.every((t) => searchIndex.includes(t))) return false;
			if (filters.specialties.length && !filters.specialties.some((s) => tagsOf(p.specialties).includes(s))) return false;
			if (filters.skills.length && !filters.skills.some((s) => tagsOf(p.skills || '').includes(s))) return false;
			if (filters.tools.length && !filters.tools.some((s) => tagsOf(p.tools || '').includes(s))) return false;
			if (filters.platforms.length && !filters.platforms.some((s) => tagsOf(p.platform || '').includes(s))) return false;
			if (filters.industries.length && !filters.industries.some((s) => tagsOf(p.industry || '').includes(s))) return false;
			if (selectedKinds.length) {
				const authorWork = allWork.filter((w) => w.author === p.id);
				if (!selectedKinds.some((k) => authorWork.some((w) => w.kind === k))) return false;
			}
			if (filters.languages.length) {
				const langs = tagsOf(p.languages || '');
				const native = contentLanguageLabel(p.language);
				if (!filters.languages.some((l) => langs.includes(l) || l === native)) return false;
			}
			if (filters.locations.length && !filters.locations.some((l) => locationTokens(p).includes(l))) return false;
			if (filters.availableForWork && !p.available_for_work) return false;
			if (filters.openToCollaboration && !p.open_to_collaboration) return false;
			if (filters.openToResearch && !p.open_to_research) return false;
			if (filters.openToMentorship && !p.open_to_mentorship) return false;
			if (filters.openToSpeaking && !p.open_to_speaking) return false;
			return true;
		});
	}, [ghosts, allWork, filters, isSearching, user]);

	// Discovery: Ghosts you may want to work with — overlap of specialties, skills, tools.
	const suggestedGhosts = useMemo(() => {
		if (!profile) return [];
		const myTokens = new Set([
			...tagsOf(profile.specialties), ...tagsOf(profile.developing_specialties || ''),
			...tagsOf(profile.skills || ''), ...tagsOf(profile.tools || ''),
		].map((t) => t.toLowerCase()));
		if (myTokens.size === 0) return [];
		return ghosts
			.filter((g) => g.profile.owner !== user?.id)
			.map((g) => {
				const theirs = [...tagsOf(g.profile.specialties), ...tagsOf(g.profile.skills || ''), ...tagsOf(g.profile.tools || '')].map((t) => t.toLowerCase());
				const overlap = new Set(theirs.filter((t) => myTokens.has(t))).size;
				return { g, overlap };
			})
			.filter((x) => x.overlap > 0)
			.sort((a, b) => b.overlap - a.overlap)
			.slice(0, 6)
			.map((x) => x.g);
	}, [ghosts, profile, user]);

	const recruitingProjects = useMemo(
		() => allWork.filter((w) => (w.kind === 'project' || w.kind === 'community') && w.owner !== user?.id && (w.accepting_contributors || w.project_status === 'recruiting')).slice(0, 4),
		[allWork, user],
	);

	const openTableTalks = useMemo(
		() => allWork.filter((w) => w.kind === 'exercise' && w.owner !== user?.id && (w.exercise_status === 'open' || w.exercise_status === 'scheduled')).slice(0, 4),
		[allWork, user],
	);

	const recentInFields = useMemo(() => {
		if (!profile) return [];
		const myTokens = new Set([
			...tagsOf(profile.specialties), ...tagsOf(profile.developing_specialties || ''),
			...tagsOf(profile.skills || ''), ...tagsOf(profile.tools || ''), ...tagsOf(profile.industry || ''),
		].map((t) => t.toLowerCase()));
		return allWork
			.filter((w) => w.owner !== user?.id)
			.filter((w) => {
				if (w.domain && myTokens.has(w.domain.toLowerCase())) return true;
				return tagsOf(w.tags).some((t) => myTokens.has(t.toLowerCase()));
			})
			.slice(0, 5);
	}, [allWork, profile, user]);

	const set = <K extends keyof NetworkFilters>(key: K, value: NetworkFilters[K]) => setFilters((prev) => ({ ...prev, [key]: value }));
	const reset = () => setFilters(DEFAULT_FILTERS);

	const chips = useMemo(() => {
		const list: { key: keyof NetworkFilters; value: string }[] = [];
		for (const key of ['specialties', 'skills', 'tools', 'platforms', 'industries', 'languages', 'locations', 'contributionTypes'] as (keyof NetworkFilters)[]) {
			for (const value of filters[key] as string[]) list.push({ key, value });
		}
		return list;
	}, [filters]);

	const removeChip = (key: keyof NetworkFilters, value: string) => set(key, (filters[key] as string[]).filter((v) => v !== value));

	if (loading) return <div className="rail loading-state" style={{ padding: '60px 0' }}>Loading the network…</div>;

	return (
		<div className="gs-network">
			<header className="gs-section-head">
				<div>
					<span className="eyebrow"><span className="tiny-dot" /> GHOST SPACE / NETWORK</span>
					<h1>Network</h1>
					<p className="gs-section-lede">A collaboration and discovery hub for the full field. Search Ghosts, skills, tools, projects, research, and Table Talks — then reach out with a structured request. No followers, likes, or rankings.</p>
				</div>
			</header>

			{error && <div className="status-message error-message" role="alert">{error}</div>}

			<div className="directory-discovery">
				<label className="directory-search">
					<Search size={17} />
					<span className="sr-only">Search the network</span>
					<input type="search" value={filters.query} onChange={(e) => set('query', e.target.value)} placeholder="Search Ghosts, skills, tools, projects, research, or specialties…" />
					{filters.query && <button type="button" aria-label="Clear search" onClick={() => set('query', '')}><X size={15} /></button>}
				</label>
				<button type="button" className={`filter-toggle ${panelOpen || activeCount ? 'active' : ''}`} onClick={() => setPanelOpen((v) => !v)}>
					<SlidersHorizontal size={14} /> Filters {activeCount > 0 && <span className="filter-count">{activeCount}</span>}
				</button>
				<div className={`directory-filters ${panelOpen ? 'open' : ''}`}>
					<SearchableMultiSelect label="Specialty" options={options.specialties} selected={filters.specialties} onChange={(v) => set('specialties', v)} placeholder="All specialties" />
					<SearchableMultiSelect label="Skills" options={options.skills} selected={filters.skills} onChange={(v) => set('skills', v)} placeholder="All skills" />
					<SearchableMultiSelect label="Tools / Technologies" options={options.tools} selected={filters.tools} onChange={(v) => set('tools', v)} placeholder="All tools" />
					<SearchableMultiSelect label="Platform / Environment" options={options.platforms} selected={filters.platforms} onChange={(v) => set('platforms', v)} placeholder="All platforms" />
					<SearchableMultiSelect label="Industry / Domain" options={options.industries} selected={filters.industries} onChange={(v) => set('industries', v)} placeholder="All industries" />
					<SearchableMultiSelect label="Contribution Type" options={options.contributionTypes} selected={filters.contributionTypes} onChange={(v) => set('contributionTypes', v)} placeholder="All contributions" />
					<SearchableMultiSelect label="Language" options={options.languages} selected={filters.languages} onChange={(v) => set('languages', v)} placeholder="All languages" />
					<SearchableMultiSelect label="Location" options={options.locations} selected={filters.locations} onChange={(v) => set('locations', v)} placeholder="All locations" />
					<div className="filter-toggles">
						<label className="toggle-pill"><input type="checkbox" checked={filters.availableForWork} onChange={(e) => set('availableForWork', e.target.checked)} /><span>Available for Work</span></label>
						<label className="toggle-pill"><input type="checkbox" checked={filters.openToCollaboration} onChange={(e) => set('openToCollaboration', e.target.checked)} /><span>Open to Collaboration</span></label>
						<label className="toggle-pill"><input type="checkbox" checked={filters.openToResearch} onChange={(e) => set('openToResearch', e.target.checked)} /><span>Open to Research</span></label>
						<label className="toggle-pill"><input type="checkbox" checked={filters.openToMentorship} onChange={(e) => set('openToMentorship', e.target.checked)} /><span>Open to Mentorship</span></label>
						<label className="toggle-pill"><input type="checkbox" checked={filters.openToSpeaking} onChange={(e) => set('openToSpeaking', e.target.checked)} /><span>Open to Speaking</span></label>
					</div>
					{activeCount > 0 && <button type="button" className="filter-reset" onClick={reset}>Clear all filters</button>}
				</div>
				{chips.length > 0 && (
					<div className="filter-chips">
						{chips.map(({ key, value }) => (
							<button type="button" key={`${key}:${value}`} className="filter-chip" onClick={() => removeChip(key, value)}>{value} <X size={11} /></button>
						))}
						<button type="button" className="filter-chip-clear" onClick={reset}>Clear all</button>
					</div>
				)}
			</div>

			<div className="gs-network-body">
				<div className="gs-network-main">
					{isSearching ? (
						<section className="gs-network-section">
							<p className="results-note">{filtered.length} GHOST{filtered.length !== 1 ? 'S' : ''} MATCH · NO POPULARITY RANKING</p>
							{filtered.length === 0 ? (
								<div className="empty-state">No Ghost matches these criteria. <button type="button" onClick={reset} style={{ color: 'hsl(var(--primary))', textDecoration: 'underline', background: 'none', border: 0, cursor: 'pointer' }}>Clear all filters</button></div>
							) : (
								<div className="gs-network-grid">
									{filtered.map((g) => <NetworkGhostCard key={g.profile.id} profile={g.profile} myProjects={myProjects} onRequest={(recipient, relatedWork) => setRequestFor({ recipient, relatedWork })} />)}
								</div>
							)}
						</section>
					) : (
						<>
							{suggestedGhosts.length > 0 && (
								<section className="gs-network-section">
									<div className="gs-network-section-head">
										<h2><Users size={16} strokeWidth={1.5} /> Ghosts you may want to work with</h2>
										<p>Based on overlapping specialties, skills, and tools.</p>
									</div>
									<div className="gs-network-grid">
										{suggestedGhosts.map((g) => <NetworkGhostCard key={g.profile.id} profile={g.profile} myProjects={myProjects} onRequest={(recipient, relatedWork) => setRequestFor({ recipient, relatedWork })} />)}
									</div>
								</section>
							)}

							<section className="gs-network-section">
								<div className="gs-network-section-head">
									<h2><FolderGit2 size={16} strokeWidth={1.5} /> Projects looking for contributors</h2>
									<p>Open roles and recruiting projects across the network.</p>
								</div>
								{recruitingProjects.length === 0 ? (
									<p className="muted-note">No projects are recruiting right now. Start one of your own from the Projects workspace.</p>
								) : (
									<ul className="gs-discovery-list">
										{recruitingProjects.map((w) => (
											<li key={w.id}>
												<Link to={`/work/${w.id}`} className="gs-discovery-item">
													<span className="gs-discovery-type">{kindLabels[w.kind]}</span>
													<span className="gs-discovery-title">{w.title}</span>
													{w.domain && <span className="gs-discovery-domain">{w.domain}</span>}
													<span className="gs-discovery-meta">{w.project_status || 'active'} · updated {relativeTime(w.updated)}</span>
												</Link>
											</li>
										))}
									</ul>
								)}
							</section>

							<section className="gs-network-section">
								<div className="gs-network-section-head">
									<h2><Radio size={16} strokeWidth={1.5} /> Open Table Talks</h2>
									<p>Scheduled and open exercises you can join.</p>
								</div>
								{openTableTalks.length === 0 ? (
									<p className="muted-note">No open Table Talks right now. Propose one from the Table Talks workspace.</p>
								) : (
									<ul className="gs-discovery-list">
										{openTableTalks.map((w) => (
											<li key={w.id}>
												<Link to={`/work/${w.id}`} className="gs-discovery-item">
													<span className="gs-discovery-type">{w.exercise_type?.replace(/_/g, ' ') || 'exercise'}</span>
													<span className="gs-discovery-title">{w.title}</span>
													{w.scenario_type && <span className="gs-discovery-domain">{w.scenario_type.replace(/_/g, ' ')}</span>}
													<span className="gs-discovery-meta">{w.exercise_status || 'open'} · {w.duration || 'self-paced'}</span>
												</Link>
											</li>
										))}
									</ul>
								)}
							</section>

							<section className="gs-network-section">
								<div className="gs-network-section-head">
									<h2><FileText size={16} strokeWidth={1.5} /> Recent work in your fields</h2>
									<p>Published contributions matching your specialties, skills, and industry.</p>
								</div>
								{recentInFields.length === 0 ? (
									<p className="muted-note">No matching work yet. Add specialties and skills to your profile to surface relevant contributions here.</p>
								) : (
									<ul className="gs-discovery-list">
										{recentInFields.map((w) => (
											<li key={w.id}>
												<Link to={`/work/${w.id}`} className="gs-discovery-item">
													<span className="gs-discovery-type">{kindLabels[w.kind]}</span>
													<span className="gs-discovery-title">{w.title}</span>
													{w.domain && <span className="gs-discovery-domain">{w.domain}</span>}
													<span className="gs-discovery-meta">{relativeTime(w.created)}</span>
												</Link>
											</li>
										))}
									</ul>
								)}
							</section>
						</>
					)}
				</div>

				<aside className="gs-network-side">
					<SavedSearches filters={filters} onApply={(f) => setFilters(f)} />
					<CollaborationRequests revision={reqRevision} />
				</aside>
			</div>

			<p className="sample-note">Network discovery spans {ALL_SPECIALTIES.length} specialties across {SPECIALTY_GROUPS.length} groups, plus skills, tools, platforms, industries, contribution types, languages, and locations. Every filter is searchable and supports multiple selections. Collaboration requests are structured and moderatable — no open DM inbox, no followers, no rankings.</p>

			{requestFor && (
				<CollaborationRequestDialog
					recipient={requestFor.recipient}
					relatedWork={requestFor.relatedWork}
					myProjects={myProjects}
					onClose={() => setRequestFor(null)}
					onSent={() => setReqRevision((r) => r + 1)}
				/>
			)}
		</div>
	);
}
