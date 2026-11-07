import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Search, X, SlidersHorizontal, ArrowUpRight } from 'lucide-react';
import { WorkCard, type WorkCardMeta } from '@/components/work-card';
import { SearchableMultiSelect } from '@/components/ghosts/searchable-multi-select';
import { ALL_SPECIALTIES } from '@/data/specialties';
import { ARSENAL_TYPES, VALIDATION_STATUSES, FORMAT_OPTIONS } from '@/data/arsenal';
import { TOOL_OPTIONS, PLATFORM_OPTIONS } from '@/data/taxonomy';
import { KIND_ORDER, evidenceLabels, kindLabels, tagsOf, type ValidationStatus, type Work, type WorkKind } from '@/lib/network';

type Filters = {
  query: string;
  artifactTypes: string[];
  domains: string[];
  authors: string[];
  platforms: string[];
  formats: string[];
  tools: string[];
  validationStatuses: ValidationStatus[];
};

const DEFAULT_FILTERS: Filters = {
  query: '', artifactTypes: [], domains: [], authors: [], platforms: [], formats: [], tools: [], validationStatuses: [],
};

/** Hydration-safe publication label — explicit locale + UTC is deterministic. */
function formatPublished(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

type ArtifactMap = Map<string, Record<WorkKind, number>>;

/** Count each author's published work by kind, for "related artifacts". */
function buildArtifacts(work: Work[]): ArtifactMap {
  const map: ArtifactMap = new Map();
  for (const item of work) {
    const counts = map.get(item.author) || ({} as Record<WorkKind, number>);
    counts[item.kind] = (counts[item.kind] || 0) + 1;
    map.set(item.author, counts);
  }
  return map;
}

function artifactsFor(artifacts: ArtifactMap, work: Work): { label: string; count: number }[] {
  const counts = artifacts.get(work.author);
  if (!counts) return [];
  const out: { label: string; count: number }[] = [];
  for (const kind of KIND_ORDER) {
    const count = (counts[kind] || 0) - (kind === work.kind ? 1 : 0);
    if (count > 0) out.push({ label: evidenceLabels[kind], count });
  }
  return out.slice(0, 4);
}

export function ArsenalLibrary({ work, allWork }: { work: Work[]; allWork: Work[] }) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [panelOpen, setPanelOpen] = useState(true);

  const artifacts = useMemo(() => buildArtifacts(allWork), [allWork]);

  const options = useMemo(() => {
    const domains = new Set<string>([...ALL_SPECIALTIES]);
    const platforms = new Set<string>();
    const formats = new Set<string>();
    const tools = new Set<string>();
    const authors = new Map<string, string>();
    for (const item of work) {
      if (item.domain) tagsOf(item.domain).forEach((d) => domains.add(d));
      tagsOf(item.platform || '').forEach((v) => platforms.add(v));
      tagsOf(item.format || '').forEach((v) => formats.add(v));
      tagsOf(item.tool || '').forEach((v) => tools.add(v));
      const author = item.expand?.author;
      if (author) {
        authors.set(author.id, author.handle);
        tagsOf(author.platform || '').forEach((v) => platforms.add(v));
        tagsOf(author.tools || '').forEach((v) => tools.add(v));
      }
    }
    return {
      artifactTypes: ARSENAL_TYPES.map((t) => ({ value: t.kind, label: t.label })),
      domains: [...domains].sort((a, b) => a.localeCompare(b)),
      authors: [...authors.entries()].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label)),
      platforms: [...new Set([...PLATFORM_OPTIONS, ...platforms])].sort((a, b) => a.localeCompare(b)),
      formats: [...new Set([...FORMAT_OPTIONS, ...formats])].sort((a, b) => a.localeCompare(b)),
      tools: [...new Set([...TOOL_OPTIONS, ...tools])].sort((a, b) => a.localeCompare(b)),
    };
  }, [work]);

  const searchIndex = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of work) {
      const author = item.expand?.author;
      map.set(item.id, [
        item.title, item.summary, item.body, item.tags, item.kind, kindLabels[item.kind],
        item.source, item.domain, item.platform, item.format, item.tool, item.version, item.license,
        author?.handle, author?.specialties, author?.skills, author?.tools,
        author?.platform, author?.industry, author?.languages,
      ].filter(Boolean).join(' ').toLowerCase());
    }
    return map;
  }, [work]);

  const results = useMemo(() => {
    const tokens = filters.query.toLowerCase().split(/\s+/).filter(Boolean);
    const typeKinds = new Set(filters.artifactTypes);
    const authorIds = new Set(filters.authors);
    const domainSet = new Set(filters.domains);
    const platformSet = new Set(filters.platforms);
    const formatSet = new Set(filters.formats);
    const toolSet = new Set(filters.tools);
    const validationSet = new Set(filters.validationStatuses);
    return work.filter((item) => {
      const idx = searchIndex.get(item.id) || '';
      if (tokens.length && !tokens.every((tok) => idx.includes(tok))) return false;
      if (typeKinds.size && !typeKinds.has(item.kind)) return false;
      if (domainSet.size && !tagsOf(item.domain || '').some((d) => domainSet.has(d))) return false;
      if (authorIds.size && !authorIds.has(item.author)) return false;
      if (platformSet.size && !tagsOf(item.platform || '').some((p) => platformSet.has(p))) return false;
      if (formatSet.size && !tagsOf(item.format || '').some((f) => formatSet.has(f))) return false;
      if (toolSet.size && !tagsOf(item.tool || '').some((p) => toolSet.has(p))) return false;
      if (validationSet.size && !validationSet.has((item.validation_status || 'draft') as ValidationStatus)) return false;
      return true;
    });
  }, [work, filters, searchIndex]);

  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => setFilters((prev) => ({ ...prev, [key]: value }));
  const reset = () => setFilters(DEFAULT_FILTERS);

  const activeCount =
    filters.artifactTypes.length + filters.domains.length + filters.authors.length +
    filters.platforms.length + filters.formats.length + filters.tools.length +
    filters.validationStatuses.length;

  const labelFor = (key: keyof Filters, value: string): string => {
    if (key === 'artifactTypes') return ARSENAL_TYPES.find((t) => t.kind === value)?.label || value;
    if (key === 'authors') return options.authors.find((a) => a.value === value)?.label || value;
    if (key === 'validationStatuses') return VALIDATION_STATUSES.find((s) => s.value === value)?.label || value;
    return value;
  };

  const chips = useMemo(() => {
    const list: { key: keyof Filters; value: string }[] = [];
    for (const key of ['artifactTypes', 'domains', 'authors', 'platforms', 'formats', 'tools', 'validationStatuses'] as (keyof Filters)[]) {
      for (const value of filters[key] as string[]) list.push({ key, value });
    }
    return list;
  }, [filters]);

  const removeChip = (key: keyof Filters, value: string) =>
    set(key, (filters[key] as string[]).filter((v) => v !== value) as Filters[typeof key]);

  const metaFor = (work: Work): WorkCardMeta => ({
    published: formatPublished(work.created),
    validationStatus: (work.validation_status || 'draft') as ValidationStatus,
    artifacts: artifactsFor(artifacts, work),
  });

  return (
    <section className="library rail">
      <div className="directory-discovery">
        <label className="directory-search">
          <Search size={17} />
          <span className="sr-only">Search artifacts</span>
          <input
            type="search"
            value={filters.query}
            onChange={(e) => set('query', e.target.value)}
            placeholder="Search artifact, tool, technique, platform, author, ATT&CK ID, CVE, or keyword…"
          />
          {filters.query && <button type="button" aria-label="Clear search" onClick={() => set('query', '')}><X size={15} /></button>}
        </label>
        <button type="button" className={`filter-toggle ${panelOpen || activeCount ? 'active' : ''}`} onClick={() => setPanelOpen((v) => !v)}>
          <SlidersHorizontal size={14} /> Filters {activeCount > 0 && <span className="filter-count">{activeCount}</span>}
        </button>
        <div className={`directory-filters ${panelOpen ? 'open' : ''}`}>
          <SearchableMultiSelect label="Artifact Type" options={options.artifactTypes} selected={filters.artifactTypes} onChange={(v) => set('artifactTypes', v)} placeholder="All artifact types" />
          <SearchableMultiSelect label="Domain / Specialty" options={options.domains} selected={filters.domains} onChange={(v) => set('domains', v)} placeholder="All domains" />
          <SearchableMultiSelect label="Platform" options={options.platforms} selected={filters.platforms} onChange={(v) => set('platforms', v)} placeholder="All platforms" />
          <SearchableMultiSelect label="Language / Format" options={options.formats} selected={filters.formats} onChange={(v) => set('formats', v)} placeholder="All formats" />
          <SearchableMultiSelect label="Tool / Technology" options={options.tools} selected={filters.tools} onChange={(v) => set('tools', v)} placeholder="All tools" />
          <SearchableMultiSelect label="Author / Ghost" options={options.authors} selected={filters.authors} onChange={(v) => set('authors', v)} placeholder="All authors" />
          <div className="filter-toggles">
            {VALIDATION_STATUSES.map((s) => (
              <label key={s.value} className="toggle-pill">
                <input
                  type="checkbox"
                  checked={filters.validationStatuses.includes(s.value)}
                  onChange={(e) => set('validationStatuses', e.target.checked ? [...filters.validationStatuses, s.value] : filters.validationStatuses.filter((v) => v !== s.value))}
                />
                <span>{s.label}</span>
              </label>
            ))}
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
      <p className="results-note">{results.length} ARTIFACT{results.length !== 1 ? 'S' : ''} · CHRONOLOGICAL ORDER, NO RANKING</p>
      <div className="work-grid">
        {results.map((item) => <WorkCard key={item.id} work={item} meta={metaFor(item)} />)}
      </div>
      {!results.length && (
        <div className="empty-state">
          <p>No artifact matches these criteria.</p>
          {activeCount > 0
            ? <button type="button" onClick={reset} style={{ color: 'hsl(var(--primary))', textDecoration: 'underline', background: 'none', border: 0, cursor: 'pointer' }}>Clear all filters</button>
            : <Link to="/contribute">Share an artifact</Link>}
        </div>
      )}
      <p className="sample-note">Artifact Type covers the full field — {ARSENAL_TYPES.length} types from detection rules and hunting queries to hardening guides, adversary emulation plans, and validation harnesses. Every filter is searchable and supports multiple selections; the taxonomy grows with what members contribute. Validation status tracks each artifact's lifecycle from Draft through Tested and Community/Maintainer Validated to Deprecated. Related artifacts link each piece to the author's other work across the network.</p>
      <div style={{ marginTop: 34 }}>
        <Link className="text-link" to="/contribute">Propose an artifact <ArrowUpRight size={16} /></Link>
      </div>
    </section>
  );
}
