import { useMemo, useState } from 'react';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { ProjectCard } from '@/components/projects/project-card';
import { SearchableMultiSelect } from '@/components/ghosts/searchable-multi-select';
import { ALL_SPECIALTIES } from '@/data/specialties';
import {
  PROJECT_STATUSES, PROJECT_TABS, PROJECT_ROLES,
  OPEN_PROJECT_STATUSES, COMPLETED_PROJECT_STATUSES,
  projectStatusLabel, type ProjectTabValue,
} from '@/data/projects';
import { TOOL_OPTIONS, PLATFORM_OPTIONS, INDUSTRY_OPTIONS } from '@/data/taxonomy';
import { contentLanguageLabel } from '@/lib/languages';
import { kindLabels, locationTokens, tagsOf, type ProjectStatus, type Work } from '@/lib/network';

type Filters = {
  query: string;
  domains: string[];
  roles: string[];
  skills: string[];
  tools: string[];
  platforms: string[];
  industries: string[];
  statuses: ProjectStatus[];
  languages: string[];
  locations: string[];
  maintainers: string[];
  accepting: boolean;
};

const DEFAULT_FILTERS: Filters = {
  query: '', domains: [], roles: [], skills: [], tools: [], platforms: [],
  industries: [], statuses: [], languages: [], locations: [], maintainers: [], accepting: false,
};

/** Hydration-safe label — explicit locale + UTC is deterministic. */
function inSet<T>(set: Set<T>, values: T[]): boolean {
  return values.some((v) => set.has(v));
}

export function ProjectsLibrary({ work, contributorCounts }: { work: Work[]; contributorCounts: Record<string, number> }) {
  const [tab, setTab] = useState<ProjectTabValue>('all');
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [panelOpen, setPanelOpen] = useState(true);

  const options = useMemo(() => {
    const domains = new Set<string>([...ALL_SPECIALTIES]);
    const roles = new Set<string>(PROJECT_ROLES);
    const skills = new Set<string>();
    const tools = new Set<string>(TOOL_OPTIONS);
    const platforms = new Set<string>(PLATFORM_OPTIONS);
    const industries = new Set<string>(INDUSTRY_OPTIONS);
    const languages = new Set<string>();
    const locations = new Set<string>();
    const maintainers = new Map<string, string>();
    for (const item of work) {
      if (item.domain) tagsOf(item.domain).forEach((d) => domains.add(d));
      tagsOf(item.roles_needed).forEach((r) => roles.add(r));
      tagsOf(item.technologies).forEach((t) => { skills.add(t); tools.add(t); });
      tagsOf(item.tags).forEach((t) => skills.add(t));
      tagsOf(item.platform || '').forEach((p) => platforms.add(p));
      const author = item.expand?.author;
      if (author) {
        maintainers.set(author.id, author.handle);
        tagsOf(author.specialties || '').forEach((s) => domains.add(s));
        tagsOf(author.tools || '').forEach((t) => tools.add(t));
        tagsOf(author.platform || '').forEach((p) => platforms.add(p));
        tagsOf(author.industry || '').forEach((i) => industries.add(i));
        locationTokens(author).forEach((l) => locations.add(l));
        const lang = contentLanguageLabel(author.language);
        if (lang) languages.add(lang);
      }
      const lang = contentLanguageLabel(item.language);
      if (lang) languages.add(lang);
    }
    return {
      domains: [...domains].sort((a, b) => a.localeCompare(b)),
      roles: [...roles].sort((a, b) => a.localeCompare(b)),
      skills: [...skills].sort((a, b) => a.localeCompare(b)),
      tools: [...tools].sort((a, b) => a.localeCompare(b)),
      platforms: [...platforms].sort((a, b) => a.localeCompare(b)),
      industries: [...industries].sort((a, b) => a.localeCompare(b)),
      languages: [...languages].sort((a, b) => a.localeCompare(b)),
      locations: [...locations].sort((a, b) => a.localeCompare(b)),
      maintainers: [...maintainers.entries()].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label)),
      statuses: PROJECT_STATUSES.map((s) => ({ value: s.value, label: s.label })),
    };
  }, [work]);

  const searchIndex = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of work) {
      const author = item.expand?.author;
      map.set(item.id, [
        item.title, item.summary, item.body, item.tags, item.kind, kindLabels[item.kind],
        item.domain, item.technologies, item.roles_needed, item.source,
        author?.handle, author?.specialties, author?.skills, author?.tools,
        author?.platform, author?.industry, author?.languages,
        author ? locationTokens(author).join(' ') : '',
      ].filter(Boolean).join(' ').toLowerCase());
    }
    return map;
  }, [work]);

  const tabMatches = (item: Work): boolean => {
    if (tab === 'all') return true;
    if (tab === 'community') return item.kind === 'community';
    if (item.kind !== 'project') return false;
    const ps = (item.project_status || 'proposed') as ProjectStatus;
    if (tab === 'open') return OPEN_PROJECT_STATUSES.includes(ps);
    if (tab === 'recruiting') return ps === 'recruiting';
    if (tab === 'active') return ps === 'active';
    if (tab === 'completed') return COMPLETED_PROJECT_STATUSES.includes(ps);
    return true;
  };

  const results = useMemo(() => {
    const tokens = filters.query.toLowerCase().split(/\s+/).filter(Boolean);
    const domainSet = new Set(filters.domains);
    const roleSet = new Set(filters.roles);
    const skillSet = new Set(filters.skills);
    const toolSet = new Set(filters.tools);
    const platformSet = new Set(filters.platforms);
    const industrySet = new Set(filters.industries);
    const statusSet = new Set(filters.statuses);
    const langSet = new Set(filters.languages);
    const locationSet = new Set(filters.locations);
    const maintainerSet = new Set(filters.maintainers);
    return work.filter((item) => {
      if (!tabMatches(item)) return false;
      const idx = searchIndex.get(item.id) || '';
      if (tokens.length && !tokens.every((tok) => idx.includes(tok))) return false;
      if (domainSet.size) {
        const author = item.expand?.author;
        const vals = [...tagsOf(item.domain || ''), ...tagsOf(author?.specialties || '')];
        if (!inSet(domainSet, vals)) return false;
      }
      if (roleSet.size && !inSet(roleSet, tagsOf(item.roles_needed))) return false;
      if (skillSet.size) {
        const vals = [...tagsOf(item.technologies), ...tagsOf(item.tags)];
        if (!inSet(skillSet, vals)) return false;
      }
      if (toolSet.size) {
        const author = item.expand?.author;
        const vals = [...tagsOf(item.technologies), ...tagsOf(author?.tools || '')];
        if (!inSet(toolSet, vals)) return false;
      }
      if (platformSet.size) {
        const author = item.expand?.author;
        const vals = [...tagsOf(item.platform || ''), ...tagsOf(author?.platform || '')];
        if (!inSet(platformSet, vals)) return false;
      }
      if (industrySet.size) {
        const author = item.expand?.author;
        if (!inSet(industrySet, tagsOf(author?.industry || ''))) return false;
      }
      if (statusSet.size && !statusSet.has((item.project_status || 'proposed') as ProjectStatus)) return false;
      if (langSet.size && !langSet.has(contentLanguageLabel(item.language))) return false;
      if (locationSet.size) {
        const author = item.expand?.author;
        if (!inSet(locationSet, locationTokens(author || {}))) return false;
      }
      if (maintainerSet.size && !maintainerSet.has(item.author)) return false;
      if (filters.accepting && !item.accepting_contributors) return false;
      return true;
    });
  }, [work, filters, tab, searchIndex]);

  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => setFilters((prev) => ({ ...prev, [key]: value }));
  const reset = () => setFilters(DEFAULT_FILTERS);

  const activeCount =
    filters.domains.length + filters.roles.length + filters.skills.length +
    filters.tools.length + filters.platforms.length + filters.industries.length +
    filters.statuses.length + filters.languages.length + filters.locations.length +
    filters.maintainers.length + (filters.accepting ? 1 : 0);

  const labelFor = (key: keyof Filters, value: string): string => {
    if (key === 'statuses') return projectStatusLabel(value);
    if (key === 'maintainers') return options.maintainers.find((a) => a.value === value)?.label || value;
    return value;
  };

  const chips = useMemo(() => {
    const list: { key: keyof Filters; value: string }[] = [];
    for (const key of ['domains', 'roles', 'skills', 'tools', 'platforms', 'industries', 'statuses', 'languages', 'locations', 'maintainers'] as (keyof Filters)[]) {
      for (const value of filters[key] as string[]) list.push({ key, value });
    }
    return list;
  }, [filters]);

  const removeChip = (key: keyof Filters, value: string) =>
    set(key, (filters[key] as string[]).filter((v) => v !== value) as Filters[typeof key]);

  const noun = tab === 'community' ? 'CONTRIBUTION' : 'PROJECT';

  return (
    <section className="library rail">
      <div className="project-tabs" role="tablist" aria-label="Project discovery">
        {PROJECT_TABS.map((t) => (
          <button
            key={t.value}
            role="tab"
            aria-selected={tab === t.value}
            className={`filter-button ${tab === t.value ? 'active' : ''}`}
            onClick={() => setTab(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="directory-discovery">
        <label className="directory-search">
          <Search size={17} />
          <span className="sr-only">Search projects</span>
          <input
            type="search"
            value={filters.query}
            onChange={(e) => set('query', e.target.value)}
            placeholder="Search project, skill, tool, technique, maintainer, or keyword…"
          />
          {filters.query && <button type="button" aria-label="Clear search" onClick={() => set('query', '')}><X size={15} /></button>}
        </label>
        <button type="button" className={`filter-toggle ${panelOpen || activeCount ? 'active' : ''}`} onClick={() => setPanelOpen((v) => !v)}>
          <SlidersHorizontal size={14} /> Filters {activeCount > 0 && <span className="filter-count">{activeCount}</span>}
        </button>
        <div className={`directory-filters ${panelOpen ? 'open' : ''}`}>
          <SearchableMultiSelect label="Specialty / Domain" options={options.domains} selected={filters.domains} onChange={(v) => set('domains', v)} placeholder="All specialties" />
          <SearchableMultiSelect label="Open Roles" options={options.roles} selected={filters.roles} onChange={(v) => set('roles', v)} placeholder="All roles" />
          <SearchableMultiSelect label="Skills Needed" options={options.skills} selected={filters.skills} onChange={(v) => set('skills', v)} placeholder="All skills" />
          <SearchableMultiSelect label="Tools / Technologies" options={options.tools} selected={filters.tools} onChange={(v) => set('tools', v)} placeholder="All tools" />
          <SearchableMultiSelect label="Platform" options={options.platforms} selected={filters.platforms} onChange={(v) => set('platforms', v)} placeholder="All platforms" />
          <SearchableMultiSelect label="Industry" options={options.industries} selected={filters.industries} onChange={(v) => set('industries', v)} placeholder="All industries" />
          <SearchableMultiSelect label="Status" options={options.statuses} selected={filters.statuses as unknown as string[]} onChange={(v) => set('statuses', v as ProjectStatus[])} placeholder="All statuses" />
          <SearchableMultiSelect label="Language" options={options.languages} selected={filters.languages} onChange={(v) => set('languages', v)} placeholder="All languages" />
          <SearchableMultiSelect label="Location / Remote" options={options.locations} selected={filters.locations} onChange={(v) => set('locations', v)} placeholder="All locations" />
          <SearchableMultiSelect label="Maintainer / Ghost" options={options.maintainers} selected={filters.maintainers} onChange={(v) => set('maintainers', v)} placeholder="All maintainers" />
          <div className="filter-toggles">
            <label className="toggle-pill">
              <input type="checkbox" checked={filters.accepting} onChange={(e) => set('accepting', e.target.checked)} />
              <span>Looking for contributors</span>
            </label>
          </div>
          {activeCount > 0 && <button type="button" className="filter-reset" onClick={reset}>Clear all filters</button>}
        </div>
        {chips.length > 0 && (
          <div className="filter-chips">
            {chips.map(({ key, value }) => (
              <button type="button" key={`${key}:${value}`} className="filter-chip" onClick={() => removeChip(key, value)}>
                {labelFor(key, value)} <X size={11} />
              </button>
            ))}
            <button type="button" className="filter-chip-clear" onClick={reset}>Clear all</button>
          </div>
        )}
      </div>
      <p className="results-note">{results.length} {noun}{results.length !== 1 ? 'S' : ''} · CHRONOLOGICAL ORDER, NO RANKING</p>
      <div className="lgn-library-grid">
        {results.map((item) => <ProjectCard key={item.id} work={item} contributors={contributorCounts[item.id] || 0} />)}
      </div>
      {!results.length && (
        <div className="empty-state">
          <p>No {tab === 'community' ? 'community contributions' : 'projects'} match these criteria.</p>
          {activeCount > 0 && <button type="button" onClick={reset} style={{ color: 'hsl(var(--primary))', textDecoration: 'underline', background: 'none', border: 0, cursor: 'pointer' }}>Clear all filters</button>}
        </div>
      )}
      <p className="sample-note">Projects separate discovery from participation. Lifecycle status (Proposed → Recruiting → Active → Paused → Complete → Archived) is independent of publication. Every filter is searchable and supports multiple selections; the taxonomy grows with what members contribute. Contributor counts reflect recorded participation. No popularity rankings — only chronological order.</p>
    </section>
  );
}
