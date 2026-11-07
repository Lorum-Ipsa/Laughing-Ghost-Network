import { useEffect, useState } from 'react';
import { Bookmark, Trash2, Search, Plus, X } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { pocketbaseClient as pb } from '@/lib/pocketbase-client';
import type { SavedSearch } from '@/lib/network';

export type NetworkFilters = {
	query: string;
	specialties: string[];
	skills: string[];
	tools: string[];
	platforms: string[];
	industries: string[];
	languages: string[];
	locations: string[];
	contributionTypes: string[];
	availableForWork: boolean;
	openToCollaboration: boolean;
	openToResearch: boolean;
	openToMentorship: boolean;
	openToSpeaking: boolean;
};

/**
 * Saved searches — a member's reusable network queries. Saving the current
 * search snapshots the query text and active filters as JSON; applying one
 * restores it. This turns repeated discovery ("Malware + Windows + YARA") into
 * a one-click recall. No rankings — only the member's own saved queries.
 */
export function SavedSearches({
	filters,
	onApply,
}: {
	filters: NetworkFilters;
	onApply: (filters: NetworkFilters) => void;
}) {
	const { user } = useAuth();
	const [saved, setSaved] = useState<SavedSearch[]>([]);
	const [name, setName] = useState('');
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');
	const [open, setOpen] = useState(false);

	useEffect(() => {
		if (!user) return;
		let active = true;
		pb.collection('ghost_saved_searches')
			.getFullList<SavedSearch>({ sort: '-created', requestKey: null })
			.then((rows) => { if (active) setSaved(rows); })
			.catch(() => { if (active) setSaved([]); });
		return () => { active = false; };
	}, [user]);

	async function save() {
		if (!user || !name.trim()) return;
		setBusy(true);
		setError('');
		try {
			const rec = await pb.collection('ghost_saved_searches').create<SavedSearch>({
				name: name.trim(),
				query: filters.query,
				filters: JSON.stringify(filters),
				owner: user.id,
			});
			setSaved((prev) => [rec, ...prev]);
			setName('');
			setOpen(false);
		} catch {
			setError('The search could not be saved.');
		} finally {
			setBusy(false);
		}
	}

	async function remove(id: string) {
		try {
			await pb.collection('ghost_saved_searches').delete(id);
			setSaved((prev) => prev.filter((s) => s.id !== id));
		} catch {
			setError('Could not delete the saved search.');
		}
	}

	function apply(row: SavedSearch) {
		try {
			const parsed = JSON.parse(row.filters || '{}') as Partial<NetworkFilters>;
			onApply({
				query: row.query || '',
				specialties: parsed.specialties || [],
				skills: parsed.skills || [],
				tools: parsed.tools || [],
				platforms: parsed.platforms || [],
				industries: parsed.industries || [],
				languages: parsed.languages || [],
				locations: parsed.locations || [],
				contributionTypes: parsed.contributionTypes || [],
				availableForWork: parsed.availableForWork || false,
				openToCollaboration: parsed.openToCollaboration || false,
				openToResearch: parsed.openToResearch || false,
				openToMentorship: parsed.openToMentorship || false,
				openToSpeaking: parsed.openToSpeaking || false,
			});
		} catch {
			setError('This saved search could not be applied.');
		}
	}

	const hasActive = filters.query || Object.values(filters).some((v) => Array.isArray(v) ? v.length : v);

	return (
		<section className="gs-panel gs-saved-searches">
			<div className="gs-panel-head">
				<span className="gs-panel-title"><Bookmark size={13} strokeWidth={1.5} style={{ display: 'inline', marginRight: 7, verticalAlign: '-2px' }} />Saved searches</span>
				{hasActive && !open && <button type="button" className="gs-panel-link" onClick={() => setOpen(true)}>Save current</button>}
			</div>
			{error && <div className="status-message error-message" role="alert" style={{ marginBottom: 12 }}>{error}</div>}
			{open && (
				<div className="gs-inline-form" style={{ marginBottom: 14 }}>
					<div className="field" style={{ marginBottom: 10 }}>
						<input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="e.g. Malware + Windows + YARA" aria-label="Saved search name" />
					</div>
					<div className="gs-editor-actions" style={{ marginTop: 0, paddingTop: 0, borderTop: 0 }}>
						<button type="button" className="button button-light" disabled={busy || !name.trim()} onClick={save}><Plus size={13} strokeWidth={1.5} /> {busy ? 'Saving…' : 'Save'}</button>
						<button type="button" className="button button-outline" onClick={() => setOpen(false)}><X size={13} strokeWidth={1.5} /> Cancel</button>
					</div>
				</div>
			)}
			{saved.length === 0 ? (
				<p className="muted-note" style={{ fontSize: 12 }}>Save a search to recall it later — for example “Healthcare + Detection Engineering” or “ICS + Incident Response + German”.</p>
			) : (
				<ul className="gs-saved-list">
					{saved.map((row) => (
						<li key={row.id}>
							<button type="button" className="gs-saved-item" onClick={() => apply(row)}>
								<Search size={13} strokeWidth={1.5} />
								<span className="gs-saved-name">{row.name}</span>
								{row.query && <span className="gs-saved-query">{row.query}</span>}
							</button>
							<button type="button" className="gs-icon-btn" aria-label={`Delete ${row.name}`} onClick={() => remove(row.id)}><Trash2 size={13} strokeWidth={1.5} /></button>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
