import { useId, useMemo, useState } from 'react';
import { X, Plus } from 'lucide-react';

type Props = {
	label: string;
	suggestions: string[];
	selected: string[];
	onChange: (next: string[]) => void;
	placeholder?: string;
	hint?: string;
};

/**
 * A searchable, free-text multi-select for profile fields that accept both
 * canonical suggestions and member-entered custom values (skills, tools,
 * platforms, industries, languages). Selected values render as removable chips;
 * typing filters the suggestion list, and Enter or comma adds the typed value
 * even when it is not in the list. Values are stored as a comma-separated string
 * on the profile, so this component works on string arrays and joins on save.
 */
export function TagInput({ label, suggestions, selected, onChange, placeholder = 'Type and press Enter', hint }: Props) {
	const listId = useId();
	const [query, setQuery] = useState('');

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		const pool = q ? suggestions.filter((s) => s.toLowerCase().includes(q)) : suggestions;
		return [...new Set([...pool])].filter((s) => !selected.includes(s)).sort((a, b) => a.localeCompare(b)).slice(0, 40);
	}, [suggestions, query, selected]);

	function add(value: string) {
		const v = value.trim();
		if (!v || selected.includes(v)) { setQuery(''); return; }
		onChange([...selected, v]);
		setQuery('');
	}

	function remove(value: string) {
		onChange(selected.filter((v) => v !== value));
	}

	function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
		if (e.key === 'Enter' || e.key === ',') {
			e.preventDefault();
			add(query);
		} else if (e.key === 'Backspace' && !query && selected.length) {
			remove(selected[selected.length - 1]);
		}
	}

	return (
		<div className="field">
			<label>{label}</label>
			<div className="tag-input">
				{selected.map((v) => (
					<span key={v} className="tag-chip">
						{v}
						<button type="button" aria-label={`Remove ${v}`} onClick={() => remove(v)}><X size={11} strokeWidth={2} /></button>
					</span>
				))}
				<input
				 list={listId}
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					onKeyDown={onKey}
					onBlur={() => query && add(query)}
					placeholder={selected.length ? '' : placeholder}
					aria-label={label}
				/>
			</div>
			{filtered.length > 0 && (
				<ul className="tag-suggestions">
					{filtered.map((s) => (
						<li key={s}>
							<button type="button" onClick={() => add(s)}><Plus size={11} strokeWidth={2} /> {s}</button>
						</li>
					))}
				</ul>
			)}
			{hint && <small>{hint}</small>}
			<datalist id={listId}>{suggestions.map((s) => <option key={s} value={s} />)}</datalist>
		</div>
	);
}
