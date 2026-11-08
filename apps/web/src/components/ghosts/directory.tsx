import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { DirectoryCard } from '@/components/ghosts/directory-card';
import { SearchableMultiSelect } from '@/components/ghosts/searchable-multi-select';
import { SPECIALTY_GROUPS, ALL_SPECIALTIES } from '@/data/specialties';
import { SKILL_OPTIONS, TOOL_OPTIONS, PLATFORM_OPTIONS, INDUSTRY_OPTIONS, LANGUAGE_NAMES } from '@/data/taxonomy';
import { contentLanguageLabel } from '@/lib/languages';
import { kindLabels, locationTokens, tagsOf, type DirectoryGhost, type GhostProfile, type WorkKind } from '@/lib/network';

type Filters = {
  query: string;
  specialties: string[];
  skills: string[];
  tools: string[];
  platforms: string[];
  industries: string[];
  contributionTypes: string[];
  languages: string[];
  locations: string[];
  availableForWork: boolean;
  openToCollaboration: boolean;
  openToResearch: boolean;
  openToMentorship: boolean;
  openToSpeaking: boolean;
};

const DEFAULT_FILTERS: Filters = {
  query: '', specialties: [], skills: [], tools: [], platforms: [],
  industries: [], contributionTypes: [], languages: [], locations: [],
  availableForWork: false, openToCollaboration: false, openToResearch: false, openToMentorship: false, openToSpeaking: false,
};

const CONTRIBUTION_LABELS = (Object.values(kindLabels) as string[]);

const KIND_BY_LABEL = new Map<string, WorkKind>(
  (Object.entries(kindLabels) as [WorkKind, string][]).map(([kind, label]) => [label, kind]),
);

function collectTags(ghosts: DirectoryGhost[], accessor: (p: GhostProfile) => string): string[] {
  const set = new Set<string>();
  for (const { profile } of ghosts) for (const tag of tagsOf(accessor(profile))) set.add(tag);
  return [...set];
}

/** Published location tokens across the network — never more than a Ghost disclosed. */
function collectLocations(ghosts: DirectoryGhost[]): string[] {
  const set = new Set<string>(['Remote', 'Undisclosed']);
  for (const { profile } of ghosts) for (const token of locationTokens(profile)) set.add(token);
  return [...set];
}

function mergeOptions(suggested: string[], collected: string[]): string[] {
  const set = new Set<string>([...suggested, ...collected]);
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function Directory({ ghosts }: { ghosts: DirectoryGhost[] }) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [panelOpen, setPanelOpen] = useState(true);

  const collected = useMemo(() => ({
    skills: collectTags(ghosts, (p) => p.skills || ''),
    tools: collectTags(ghosts, (p) => p.tools || ''),
    platforms: collectTags(ghosts, (p) => p.platform || ''),
    industries: collectTags(ghosts, (p) => p.industry || ''),
    locations: collectLocations(ghosts).sort((a, b) => a.localeCompare(b)),
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
    filters.specialties.length + filters.skills.length + filters.tools.length +
    filters.platforms.length + filters.industries.length + filters.contributionTypes.length +
    filters.languages.length + filters.locations.length +
    (filters.availableForWork ? 1 : 0) + (filters.openToCollaboration ? 1 : 0) + (filters.openToResearch ? 1 : 0) + (filters.openToMentorship ? 1 : 0) + (filters.openToSpeaking ? 1 : 0);

  const results = useMemo(() => {
    const tokens = filters.query.toLowerCase().split(/\s+/).filter(Boolean);
    const selectedKinds = filters.contributionTypes
      .map((label) => KIND_BY_LABEL.get(label))
      .filter((k): k is WorkKind => Boolean(k));
    return ghosts.filter(({ profile, evidence, searchIndex }) => {
      if (tokens.length && !tokens.every((token) => searchIndex.includes(token))) return false;
      if (filters.specialties.length && !filters.specialties.some((s) => tagsOf(profile.specialties).includes(s))) return false;
      if (filters.skills.length && !filters.skills.some((s) => tagsOf(profile.skills || '').includes(s))) return false;
      if (filters.tools.length && !filters.tools.some((s) => tagsOf(profile.tools || '').includes(s))) return false;
      if (filters.platforms.length && !filters.platforms.some((s) => tagsOf(profile.platform || '').includes(s))) return false;
      if (filters.industries.length && !filters.industries.some((s) => tagsOf(profile.industry || '').includes(s))) return false;
      if (selectedKinds.length && !selectedKinds.some((k) => evidence[k] > 0)) return false;
      if (filters.languages.length) {
        const langs = tagsOf(profile.languages || '');
        const native = contentLanguageLabel(profile.language);
        if (!filters.languages.some((l) => langs.includes(l) || l === native)) return false;
      }
      if (filters.locations.length && !filters.locations.some((l) => locationTokens(profile).includes(l))) return false;
      if (filters.availableForWork && !profile.available_for_work) return false;
      if (filters.openToCollaboration && !profile.open_to_collaboration) return false;
      if (filters.openToResearch && !profile.open_to_research) return false;
      if (filters.openToMentorship && !profile.open_to_mentorship) return false;
      if (filters.openToSpeaking && !profile.open_to_speaking) return false;
      return true;
    });
  }, [ghosts, filters]);

  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => setFilters((prev) => ({ ...prev, [key]: value }));
  const reset = () => setFilters(DEFAULT_FILTERS);

  // Active filter chips: each selected value, removable individually.
  const chips = useMemo(() => {
    const list: { key: keyof Filters; value: string }[] = [];
    for (const key of ['specialties', 'skills', 'tools', 'platforms', 'industries', 'contributionTypes', 'languages', 'locations'] as (keyof Filters)[]) {
      for (const value of filters[key] as string[]) list.push({ key, value });
    }
    return list;
  }, [filters]);

  const removeChip = (key: keyof Filters, value: string) =>
    set(key, (filters[key] as string[]).filter((v) => v !== value));

  return (
    <section className="library rail">
      <div className="directory-discovery">
        <label className="directory-search">
          <Search size={17} />
          <span className="sr-only">Search the network</span>
          <input
            type="search"
            value={filters.query}
            onChange={(e) => set('query', e.target.value)}
            placeholder="Search handle, bio, skill, tool, specialty, ATT&CK, research, language, location…"
          />
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
            <label className="toggle-pill">
              <input type="checkbox" checked={filters.availableForWork} onChange={(e) => set('availableForWork', e.target.checked)} />
              <span>Available for Work</span>
            </label>
            <label className="toggle-pill">
              <input type="checkbox" checked={filters.openToCollaboration} onChange={(e) => set('openToCollaboration', e.target.checked)} />
              <span>Open to Collaboration</span>
            </label>
            <label className="toggle-pill">
              <input type="checkbox" checked={filters.openToResearch} onChange={(e) => set('openToResearch', e.target.checked)} />
              <span>Open to Research</span>
            </label>
            <label className="toggle-pill">
              <input type="checkbox" checked={filters.openToMentorship} onChange={(e) => set('openToMentorship', e.target.checked)} />
              <span>Open to Mentorship</span>
            </label>
            <label className="toggle-pill">
              <input type="checkbox" checked={filters.openToSpeaking} onChange={(e) => set('openToSpeaking', e.target.checked)} />
              <span>Open to Speaking</span>
            </label>
          </div>
          {activeCount > 0 && <button type="button" className="filter-reset" onClick={reset}>Clear all filters</button>}
        </div>
        {chips.length > 0 && (
          <div className="filter-chips">
            {chips.map(({ key, value }) => (
              <button type="button" key={`${key}:${value}`} className="filter-chip" onClick={() => removeChip(key, value)}>
                {value} <X size={11} />
              </button>
            ))}
            <button type="button" className="filter-chip-clear" onClick={reset}>Clear all</button>
          </div>
        )}
      </div>
      <p className="results-note">{results.length} GHOST{results.length !== 1 ? 'S' : ''} · SORTED ALPHABETICALLY · NO POPULARITY RANKING</p>
      <div className="ghost-directory">
        {results.map((ghost) => <DirectoryCard key={ghost.profile.id} ghost={ghost} />)}
      </div>
      {!results.length && (
        <div className="empty-state">
          No Ghost matches these criteria. {activeCount > 0 && <button type="button" onClick={reset} style={{ color: 'hsl(var(--primary))', textDecoration: 'underline', background: 'none', border: 0, cursor: 'pointer' }}>Clear all filters</button>}
          {!activeCount && <Link to="/join">Become the first</Link>}
        </div>
      )}
      <p className="sample-note">“Example” profiles are fictional. Account email addresses are never exposed in this directory. Filters cover the full cybersecurity field — {ALL_SPECIALTIES.length} specialties across {SPECIALTY_GROUPS.length} groups, plus skills, tools, platforms, industries, contribution types, languages, and locations. Every filter is searchable and supports multiple selections; the taxonomy grows with what members contribute.</p>
    </section>
  );
}
