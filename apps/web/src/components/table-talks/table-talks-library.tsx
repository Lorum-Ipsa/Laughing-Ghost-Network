import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Search, X, SlidersHorizontal, ArrowUpRight } from 'lucide-react';
import { ExerciseCard } from '@/components/table-talks/exercise-card';
import { SearchableMultiSelect } from '@/components/ghosts/searchable-multi-select';
import { ALL_SPECIALTIES } from '@/data/specialties';
import {
  EXERCISE_TYPES, SCENARIO_TYPES, DIFFICULTIES, DURATIONS,
  FORMAT_MODES, DELIVERY_MODES, EXERCISE_ROLES,
} from '@/data/table-talks';
import { PLATFORM_OPTIONS, INDUSTRY_OPTIONS } from '@/data/taxonomy';
import { contentLanguageLabel } from '@/lib/languages';
import { tagsOf, type Work } from '@/lib/network';

type Filters = {
  query: string;
  exerciseTypes: string[];
  domains: string[];
  scenarioTypes: string[];
  industries: string[];
  difficulties: string[];
  roles: string[];
  platforms: string[];
  languages: string[];
  durations: string[];
  formatModes: string[];
  deliveryModes: string[];
};

const DEFAULT_FILTERS: Filters = {
  query: '', exerciseTypes: [], domains: [], scenarioTypes: [], industries: [],
  difficulties: [], roles: [], platforms: [], languages: [], durations: [],
  formatModes: [], deliveryModes: [],
};

export function TableTalksLibrary({ work }: { work: Work[] }) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [panelOpen, setPanelOpen] = useState(true);

  const options = useMemo(() => {
    const domains = new Set<string>([...ALL_SPECIALTIES]);
    const industries = new Set<string>(INDUSTRY_OPTIONS);
    const roles = new Set<string>(EXERCISE_ROLES);
    const platforms = new Set<string>(PLATFORM_OPTIONS);
    const languages = new Set<string>();
    for (const item of work) {
      if (item.domain) tagsOf(item.domain).forEach((d) => domains.add(d));
      tagsOf(item.industry || '').forEach((v) => industries.add(v));
      tagsOf(item.roles_needed || '').forEach((r) => roles.add(r));
      tagsOf(item.platform || '').forEach((v) => platforms.add(v));
      const lang = contentLanguageLabel(item.language);
      if (lang) languages.add(lang);
    }
    return {
      exerciseTypes: EXERCISE_TYPES.map((t) => ({ value: t.value, label: t.label })),
      domains: [...domains].sort((a, b) => a.localeCompare(b)),
      scenarioTypes: SCENARIO_TYPES.map((t) => ({ value: t.value, label: t.label })),
      industries: [...industries].sort((a, b) => a.localeCompare(b)),
      difficulties: DIFFICULTIES.map((d) => ({ value: d.value, label: d.label })),
      roles: [...roles].sort((a, b) => a.localeCompare(b)),
      platforms: [...platforms].sort((a, b) => a.localeCompare(b)),
      languages: [...languages].sort((a, b) => a.localeCompare(b)),
      durations: DURATIONS.map((d) => ({ value: d.value, label: d.label })),
    };
  }, [work]);

  const searchIndex = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of work) {
      const author = item.expand?.author;
      map.set(item.id, [
        item.title, item.summary, item.body, item.tags, item.kind,
        item.domain, item.industry, item.platform, item.roles_needed,
        item.exercise_type, item.scenario_type, item.difficulty, item.duration,
        item.format_mode, item.delivery, item.exercise_status,
        author?.handle, author?.specialties, author?.skills, author?.tools,
        author?.platform, author?.industry, author?.languages,
      ].filter(Boolean).join(' ').toLowerCase());
    }
    return map;
  }, [work]);

  const results = useMemo(() => {
    const tokens = filters.query.toLowerCase().split(/\s+/).filter(Boolean);
    const typeSet = new Set(filters.exerciseTypes);
    const domainSet = new Set(filters.domains);
    const scenarioSet = new Set(filters.scenarioTypes);
    const industrySet = new Set(filters.industries);
    const diffSet = new Set(filters.difficulties);
    const roleSet = new Set(filters.roles);
    const platformSet = new Set(filters.platforms);
    const langSet = new Set(filters.languages);
    const durSet = new Set(filters.durations);
    const fmtSet = new Set(filters.formatModes);
    const deliverySet = new Set(filters.deliveryModes);
    return work.filter((item) => {
      const idx = searchIndex.get(item.id) || '';
      if (tokens.length && !tokens.every((tok) => idx.includes(tok))) return false;
      if (typeSet.size && !typeSet.has(item.exercise_type || '')) return false;
      if (domainSet.size && !tagsOf(item.domain || '').some((d) => domainSet.has(d))) return false;
      if (scenarioSet.size && !scenarioSet.has(item.scenario_type || '')) return false;
      if (industrySet.size && !tagsOf(item.industry || '').some((i) => industrySet.has(i))) return false;
      if (diffSet.size && !diffSet.has(item.difficulty || '')) return false;
      if (roleSet.size && !tagsOf(item.roles_needed || '').some((r) => roleSet.has(r))) return false;
      if (platformSet.size && !tagsOf(item.platform || '').some((p) => platformSet.has(p))) return false;
      if (langSet.size && !langSet.has(contentLanguageLabel(item.language))) return false;
      if (durSet.size && !durSet.has(item.duration || '')) return false;
      if (fmtSet.size && !fmtSet.has(item.format_mode || '')) return false;
      if (deliverySet.size && !deliverySet.has(item.delivery || '')) return false;
      return true;
    });
  }, [work, filters, searchIndex]);

  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => setFilters((prev) => ({ ...prev, [key]: value }));
  const reset = () => setFilters(DEFAULT_FILTERS);

  const activeCount =
    filters.exerciseTypes.length + filters.domains.length + filters.scenarioTypes.length +
    filters.industries.length + filters.difficulties.length + filters.roles.length +
    filters.platforms.length + filters.languages.length + filters.durations.length +
    filters.formatModes.length + filters.deliveryModes.length;

  const labelFor = (key: keyof Filters, value: string): string => {
    if (key === 'exerciseTypes') return EXERCISE_TYPES.find((t) => t.value === value)?.label || value;
    if (key === 'scenarioTypes') return SCENARIO_TYPES.find((t) => t.value === value)?.label || value;
    if (key === 'difficulties') return DIFFICULTIES.find((d) => d.value === value)?.label || value;
    if (key === 'durations') return DURATIONS.find((d) => d.value === value)?.label || value;
    if (key === 'formatModes') return FORMAT_MODES.find((f) => f.value === value)?.label || value;
    if (key === 'deliveryModes') return DELIVERY_MODES.find((d) => d.value === value)?.label || value;
    return value;
  };

  const chips = useMemo(() => {
    const list: { key: keyof Filters; value: string }[] = [];
    for (const key of [
      'exerciseTypes', 'domains', 'scenarioTypes', 'industries', 'difficulties',
      'roles', 'platforms', 'languages', 'durations', 'formatModes', 'deliveryModes',
    ] as (keyof Filters)[]) {
      for (const value of filters[key] as string[]) list.push({ key, value });
    }
    return list;
  }, [filters]);

  const removeChip = (key: keyof Filters, value: string) =>
    set(key, (filters[key] as string[]).filter((v) => v !== value) as Filters[typeof key]);

  return (
    <section className="library rail">
      <div className="directory-discovery">
        <label className="directory-search">
          <Search size={17} />
          <span className="sr-only">Search exercises</span>
          <input
            type="search"
            value={filters.query}
            onChange={(e) => set('query', e.target.value)}
            placeholder="Search scenario, technique, role, industry, platform, or keyword…"
          />
          {filters.query && <button type="button" aria-label="Clear search" onClick={() => set('query', '')}><X size={15} /></button>}
        </label>
        <button type="button" className={`filter-toggle ${panelOpen || activeCount ? 'active' : ''}`} onClick={() => setPanelOpen((v) => !v)}>
          <SlidersHorizontal size={14} /> Filters {activeCount > 0 && <span className="filter-count">{activeCount}</span>}
        </button>
        <div className={`directory-filters ${panelOpen ? 'open' : ''}`}>
          <SearchableMultiSelect label="Exercise Type" options={options.exerciseTypes} selected={filters.exerciseTypes} onChange={(v) => set('exerciseTypes', v)} placeholder="All exercise types" />
          <SearchableMultiSelect label="Specialty / Domain" options={options.domains} selected={filters.domains} onChange={(v) => set('domains', v)} placeholder="All specialties" />
          <SearchableMultiSelect label="Scenario Type" options={options.scenarioTypes} selected={filters.scenarioTypes} onChange={(v) => set('scenarioTypes', v)} placeholder="All scenarios" />
          <SearchableMultiSelect label="Industry" options={options.industries} selected={filters.industries} onChange={(v) => set('industries', v)} placeholder="All industries" />
          <SearchableMultiSelect label="Difficulty" options={options.difficulties} selected={filters.difficulties} onChange={(v) => set('difficulties', v)} placeholder="All levels" />
          <SearchableMultiSelect label="Role" options={options.roles} selected={filters.roles} onChange={(v) => set('roles', v)} placeholder="All roles" />
          <SearchableMultiSelect label="Platform / Environment" options={options.platforms} selected={filters.platforms} onChange={(v) => set('platforms', v)} placeholder="All platforms" />
          <SearchableMultiSelect label="Language" options={options.languages} selected={filters.languages} onChange={(v) => set('languages', v)} placeholder="All languages" />
          <SearchableMultiSelect label="Duration" options={options.durations} selected={filters.durations} onChange={(v) => set('durations', v)} placeholder="All durations" />
          <div className="filter-toggles">
            <span className="filter-toggle-label">Format</span>
            {FORMAT_MODES.map((f) => (
              <label key={f.value} className="toggle-pill">
                <input
                  type="checkbox"
                  checked={filters.formatModes.includes(f.value)}
                  onChange={(e) => set('formatModes', e.target.checked ? [...filters.formatModes, f.value] : filters.formatModes.filter((v) => v !== f.value))}
                />
                <span>{f.label}</span>
              </label>
            ))}
            <span className="filter-toggle-label">Delivery</span>
            {DELIVERY_MODES.map((d) => (
              <label key={d.value} className="toggle-pill">
                <input
                  type="checkbox"
                  checked={filters.deliveryModes.includes(d.value)}
                  onChange={(e) => set('deliveryModes', e.target.checked ? [...filters.deliveryModes, d.value] : filters.deliveryModes.filter((v) => v !== d.value))}
                />
                <span>{d.label}</span>
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
      <p className="results-note">{results.length} EXERCISE{results.length !== 1 ? 'S' : ''} · CHRONOLOGICAL ORDER, NO RANKING</p>
      <div className="exercise-grid">
        {results.map((item, i) => <ExerciseCard key={item.id} work={item} index={i + 1} />)}
      </div>
      {!results.length && (
        <div className="empty-state">
          <p>No exercise matches these criteria.</p>
          {activeCount > 0
            ? <button type="button" onClick={reset} style={{ color: 'hsl(var(--primary))', textDecoration: 'underline', background: 'none', border: 0, cursor: 'pointer' }}>Clear all filters</button>
            : <Link to="/contribute">Propose an exercise</Link>}
        </div>
      )}
      <p className="sample-note">Table Talks is where the network practices making decisions. Every filter is searchable and supports multiple selections; the taxonomy grows with what members contribute. Exercise lifecycle status (Draft → Open → Scheduled → Completed → Archived) is independent of publication. No popularity rankings — only chronological order and a debrief.</p>
      <div style={{ marginTop: 34 }}>
        <Link className="text-link" to="/contribute">Propose an exercise <ArrowUpRight size={16} /></Link>
      </div>
    </section>
  );
}
