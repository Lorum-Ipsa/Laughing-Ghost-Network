import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Search, X, SlidersHorizontal, ArrowUpRight } from 'lucide-react';
import { WorkCard, type WorkCardMeta } from '@/components/work-card';
import { SearchableMultiSelect } from '@/components/ghosts/searchable-multi-select';
import { ALL_SPECIALTIES } from '@/data/specialties';
import {
  RESEARCH_TYPES, DATE_RANGES, REVIEW_STATUSES, ATTACK_PATTERN, VULN_PATTERN,
  type DateRangeValue,
} from '@/data/research';
import { TOOL_OPTIONS, PLATFORM_OPTIONS, INDUSTRY_OPTIONS } from '@/data/taxonomy';
import { contentLanguageLabel } from '@/lib/languages';
import { KIND_ORDER, evidenceLabels, kindLabels, tagsOf, type Work, type WorkKind } from '@/lib/network';

type Filters = {
  query: string;
  researchTypes: string[];
  domains: string[];
  authors: string[];
  languages: string[];
  dateRange: DateRangeValue;
  tags: string[];
  platforms: string[];
  industries: string[];
  tools: string[];
  attack: string[];
  vulns: string[];
  reviewStatuses: string[];
};

const DEFAULT_FILTERS: Filters = {
  query: '', researchTypes: [], domains: [], authors: [], languages: [],
  dateRange: 'all', tags: [], platforms: [], industries: [], tools: [],
  attack: [], vulns: [], reviewStatuses: [],
};

/** Hydration-safe publication label — explicit locale + UTC is deterministic. */
function formatPublished(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function extractIds(text: string, pattern: RegExp): string[] {
  const ids = new Set<string>();
  const re = new RegExp(pattern.source, pattern.flags);
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) ids.add(m[0].toUpperCase());
  return [...ids];
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

export function ResearchLibrary({ work, allWork }: { work: Work[]; allWork: Work[] }) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [panelOpen, setPanelOpen] = useState(true);

  const artifacts = useMemo(() => buildArtifacts(allWork), [allWork]);

  const options = useMemo(() => {
    const domains = new Set<string>([...ALL_SPECIALTIES]);
    const tags = new Set<string>();
    const attack = new Set<string>();
    const vulns = new Set<string>();
    const platforms = new Set<string>();
    const industries = new Set<string>();
    const tools = new Set<string>();
    const authors = new Map<string, string>();
    const languages = new Set<string>();
    const attackRe = /^T\d{4}(\.\d{3})?$/i;
    const vulnRe = /^(?:CVE|CWE)-\d{4}-?\d+$/i;
    for (const item of work) {
      if (item.domain) tagsOf(item.domain).forEach((d) => domains.add(d));
      const allTags = tagsOf(item.tags);
      for (const tag of allTags) {
        const up = tag.toUpperCase();
        if (attackRe.test(tag)) attack.add(up);
        else if (vulnRe.test(tag)) vulns.add(up);
        else tags.add(tag);
      }
      const author = item.expand?.author;
      if (author) {
        authors.set(author.id, author.handle);
        tagsOf(author.platform || '').forEach((v) => platforms.add(v));
        tagsOf(author.industry || '').forEach((v) => industries.add(v));
        tagsOf(author.tools || '').forEach((v) => tools.add(v));
      }
      const lang = contentLanguageLabel(item.language);
      if (lang) languages.add(lang);
    }
    return {
      researchTypes: RESEARCH_TYPES.map((t) => ({ value: t.kind, label: t.label })),
      domains: [...domains].sort((a, b) => a.localeCompare(b)),
      authors: [...authors.entries()].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label)),
      languages: [...languages].sort((a, b) => a.localeCompare(b)),
      tags: [...tags].sort((a, b) => a.localeCompare(b)),
      platforms: [...new Set([...PLATFORM_OPTIONS, ...platforms])].sort((a, b) => a.localeCompare(b)),
      industries: [...new Set([...INDUSTRY_OPTIONS, ...industries])].sort((a, b) => a.localeCompare(b)),
      tools: [...new Set([...TOOL_OPTIONS, ...tools])].sort((a, b) => a.localeCompare(b)),
      attack: [...attack].sort(),
      vulns: [...vulns].sort(),
    };
  }, [work]);

  const searchIndex = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of work) {
      const author = item.expand?.author;
      map.set(item.id, [
        item.title, item.summary, item.body, item.tags, item.kind, kindLabels[item.kind],
        item.source, item.domain, extractIds(item.tags, ATTACK_PATTERN).join(' '),
        extractIds(item.tags, VULN_PATTERN).join(' '),
        author?.handle, author?.specialties, author?.skills, author?.tools,
        author?.platform, author?.industry, author?.languages,
      ].filter(Boolean).join(' ').toLowerCase());
    }
    return map;
  }, [work]);

  const results = useMemo(() => {
    const tokens = filters.query.toLowerCase().split(/\s+/).filter(Boolean);
    const typeKinds = new Set(filters.researchTypes);
    const authorIds = new Set(filters.authors);
    const domainSet = new Set(filters.domains);
    const langSet = new Set(filters.languages);
    const tagSet = new Set(filters.tags);
    const platformSet = new Set(filters.platforms);
    const industrySet = new Set(filters.industries);
    const toolSet = new Set(filters.tools);
    const attackSet = new Set(filters.attack);
    const vulnSet = new Set(filters.vulns);
    const reviewSet = new Set(filters.reviewStatuses);
    const now = Date.now();
    const day = 86400000;
    return work.filter((item) => {
      const idx = searchIndex.get(item.id) || '';
      if (tokens.length && !tokens.every((tok) => idx.includes(tok))) return false;
      if (typeKinds.size && !typeKinds.has(item.kind)) return false;
      if (domainSet.size && !tagsOf(item.domain || '').some((d) => domainSet.has(d))) return false;
      if (authorIds.size && !authorIds.has(item.author)) return false;
      if (langSet.size && !langSet.has(contentLanguageLabel(item.language))) return false;
      if (reviewSet.size && !reviewSet.has(item.review_status || 'unreviewed')) return false;
      if (filters.dateRange !== 'all') {
        const d = new Date(item.created).getTime();
        if (filters.dateRange === '30d' && d < now - 30 * day) return false;
        if (filters.dateRange === '90d' && d < now - 90 * day) return false;
        if (filters.dateRange === '12m' && d < now - 365 * day) return false;
        if (filters.dateRange === '2026' && new Date(item.created).getUTCFullYear() !== 2026) return false;
        if (filters.dateRange === '2025' && new Date(item.created).getUTCFullYear() !== 2025) return false;
      }
      if (tagSet.size || attackSet.size || vulnSet.size) {
        const itemTags = tagsOf(item.tags);
        if (tagSet.size && !itemTags.some((t) => tagSet.has(t))) return false;
        if (attackSet.size && !itemTags.some((t) => attackSet.has(t.toUpperCase()))) return false;
        if (vulnSet.size && !itemTags.some((t) => vulnSet.has(t.toUpperCase()))) return false;
      }
      const author = item.expand?.author;
      if (platformSet.size && !(author && tagsOf(author.platform || '').some((p) => platformSet.has(p)))) return false;
      if (industrySet.size && !(author && tagsOf(author.industry || '').some((p) => industrySet.has(p)))) return false;
      if (toolSet.size && !(author && tagsOf(author.tools || '').some((p) => toolSet.has(p)))) return false;
      return true;
    });
  }, [work, filters, searchIndex]);

  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => setFilters((prev) => ({ ...prev, [key]: value }));
  const reset = () => setFilters(DEFAULT_FILTERS);

  const activeCount =
    filters.researchTypes.length + filters.domains.length + filters.authors.length +
    filters.languages.length + filters.tags.length + filters.platforms.length +
    filters.industries.length + filters.tools.length + filters.attack.length +
    filters.vulns.length + filters.reviewStatuses.length +
    (filters.dateRange !== 'all' ? 1 : 0);

  const labelFor = (key: keyof Filters, value: string): string => {
    if (key === 'researchTypes') return RESEARCH_TYPES.find((t) => t.kind === value)?.label || value;
    if (key === 'authors') return options.authors.find((a) => a.value === value)?.label || value;
    return value;
  };

  const chips = useMemo(() => {
    const list: { key: keyof Filters; value: string }[] = [];
    for (const key of ['researchTypes', 'domains', 'authors', 'languages', 'tags', 'platforms', 'industries', 'tools', 'attack', 'vulns', 'reviewStatuses'] as (keyof Filters)[]) {
      for (const value of filters[key] as string[]) list.push({ key, value });
    }
    return list;
  }, [filters]);

  const removeChip = (key: keyof Filters, value: string) =>
    set(key, (filters[key] as string[]).filter((v) => v !== value));

  const metaFor = (work: Work): WorkCardMeta => ({
    published: formatPublished(work.created),
    reviewStatus: work.review_status || 'unreviewed',
    artifacts: artifactsFor(artifacts, work),
  });

  return (
    <section className="library rail">
      <div className="directory-discovery">
        <label className="directory-search">
          <Search size={17} />
          <span className="sr-only">Search research</span>
          <input
            type="search"
            value={filters.query}
            onChange={(e) => set('query', e.target.value)}
            placeholder="Search topic, technique, tool, CVE, ATT&CK ID, author, or keyword…"
          />
          {filters.query && <button type="button" aria-label="Clear search" onClick={() => set('query', '')}><X size={15} /></button>}
        </label>
        <button type="button" className={`filter-toggle ${panelOpen || activeCount ? 'active' : ''}`} onClick={() => setPanelOpen((v) => !v)}>
          <SlidersHorizontal size={14} /> Filters {activeCount > 0 && <span className="filter-count">{activeCount}</span>}
        </button>
        <div className={`directory-filters ${panelOpen ? 'open' : ''}`}>
          <SearchableMultiSelect label="Research Type" options={options.researchTypes} selected={filters.researchTypes} onChange={(v) => set('researchTypes', v)} placeholder="All research types" />
          <SearchableMultiSelect label="Domain / Specialty" options={options.domains} selected={filters.domains} onChange={(v) => set('domains', v)} placeholder="All domains" />
          <SearchableMultiSelect label="Author / Ghost" options={options.authors} selected={filters.authors} onChange={(v) => set('authors', v)} placeholder="All authors" />
          <SearchableMultiSelect label="Language" options={options.languages} selected={filters.languages} onChange={(v) => set('languages', v)} placeholder="All languages" />
          <div className="filter-field">
            <span>Publication date</span>
            <select value={filters.dateRange} onChange={(e) => set('dateRange', e.target.value as DateRangeValue)}>
              {DATE_RANGES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <SearchableMultiSelect label="Tags" options={options.tags} selected={filters.tags} onChange={(v) => set('tags', v)} placeholder="All tags" />
          <SearchableMultiSelect label="Platform" options={options.platforms} selected={filters.platforms} onChange={(v) => set('platforms', v)} placeholder="All platforms" />
          <SearchableMultiSelect label="Industry / Domain" options={options.industries} selected={filters.industries} onChange={(v) => set('industries', v)} placeholder="All industries" />
          <SearchableMultiSelect label="Tools / Technologies" options={options.tools} selected={filters.tools} onChange={(v) => set('tools', v)} placeholder="All tools" />
          <SearchableMultiSelect label="ATT&CK technique" options={options.attack} selected={filters.attack} onChange={(v) => set('attack', v)} placeholder="All techniques" />
          <SearchableMultiSelect label="CVE / CWE" options={options.vulns} selected={filters.vulns} onChange={(v) => set('vulns', v)} placeholder="All advisories" />
          <div className="filter-toggles">
            {REVIEW_STATUSES.map((r) => (
              <label key={r.value} className="toggle-pill">
                <input
                  type="checkbox"
                  checked={filters.reviewStatuses.includes(r.value)}
                  onChange={(e) => set('reviewStatuses', e.target.checked ? [...filters.reviewStatuses, r.value] : filters.reviewStatuses.filter((v) => v !== r.value))}
                />
                <span>{r.label}</span>
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
      <p className="results-note">{results.length} CONTRIBUTION{results.length !== 1 ? 'S' : ''} · CHRONOLOGICAL ORDER, NO RANKING</p>
      <div className="work-grid">
        {results.map((item) => <WorkCard key={item.id} work={item} meta={metaFor(item)} />)}
      </div>
      {!results.length && (
        <div className="empty-state">
          <p>No research matches these criteria.</p>
          {activeCount > 0
            ? <button type="button" onClick={reset} style={{ color: 'hsl(var(--primary))', textDecoration: 'underline', background: 'none', border: 0, cursor: 'pointer' }}>Clear all filters</button>
            : <Link to="/contribute">Share research</Link>}
        </div>
      )}
      <p className="sample-note">Research Type is separated from Domain/Specialty. Domains cover the full cybersecurity field — {ALL_SPECIALTIES.length} specialties plus skills, tools, platforms, industries, ATT&CK techniques, and CVE/CWE identifiers collected from member contributions. Every filter is searchable and supports multiple selections; the taxonomy grows with what members contribute. Related artifacts link each piece of research to the author's other work across the network.</p>
      <div style={{ marginTop: 34 }}>
        <Link className="text-link" to="/contribute">Share research <ArrowUpRight size={16} /></Link>
      </div>
    </section>
  );
}
