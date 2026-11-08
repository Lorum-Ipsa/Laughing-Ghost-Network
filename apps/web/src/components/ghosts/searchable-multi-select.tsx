import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';

type Option = string | { value: string; label: string };

type Props = {
  label: string;
  options: Option[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
};

function toOption(o: Option): { value: string; label: string } {
  return typeof o === 'string' ? { value: o, label: o } : o;
}

/**
 * A searchable, multi-select dropdown. Options can be a broad taxonomy plus any
 * free-text values members have entered. Typing filters the list; multiple
 * values can be selected (OR within a filter). Closes on outside click or Esc.
 */
export function SearchableMultiSelect({ label, options, selected, onChange, placeholder = 'All' }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onMouse = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onMouse);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouse);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const opts = useMemo(() => options.map(toOption), [options]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? opts.filter((o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q))
      : opts;
    return [...list].sort((a, b) => a.label.localeCompare(b.label));
  }, [opts, query]);

  const toggle = (value: string) => {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  };

  return (
    <div className="filter-field" ref={ref}>
      <span>{label}</span>
      <button
        type="button"
        className={`sms-trigger ${selected.length ? 'active' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="sms-value">{selected.length ? `${selected.length} selected` : placeholder}</span>
        <ChevronDown size={14} className={`sms-chevron ${open ? 'open' : ''}`} />
      </button>
      {open && (
        <div className="sms-panel" role="listbox">
          <div className="sms-search">
            <Search size={13} />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}…`}
              aria-label={`Search ${label}`}
            />
            {query && (
              <button type="button" aria-label="Clear search" onClick={() => setQuery('')}>
                <X size={12} />
              </button>
            )}
          </div>
          <div className="sms-list">
            {filtered.length === 0 && <div className="sms-empty">No matches</div>}
            {filtered.map((o) => {
              const checked = selected.includes(o.value);
              return (
                <button
                  type="button"
                  key={o.value}
                  role="option"
                  aria-selected={checked}
                  className={`sms-option ${checked ? 'checked' : ''}`}
                  onClick={() => toggle(o.value)}
                >
                  <span className="sms-check">{checked && <Check size={12} />}</span>
                  <span>{o.label}</span>
                </button>
              );
            })}
          </div>
          {selected.length > 0 && (
            <button type="button" className="sms-clear" onClick={() => onChange([])}>
              Clear selection
            </button>
          )}
        </div>
      )}
    </div>
  );
}
