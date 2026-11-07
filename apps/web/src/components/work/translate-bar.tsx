import { useEffect, useRef, useState } from 'react';
import { Languages, Check, ChevronDown, AlertCircle } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { contentLanguageLabel } from '@/lib/languages';
import type { Translation, Work } from '@/lib/network';

/**
 * Reader-facing translation control for a piece of work.
 *
 * - The original publication is always authoritative and remains one click away.
 * - A translation is opt-in and clearly labelled (machine vs human).
 * - Code, commands, hashes, detection rules and other technical artifacts are
 *   NEVER translated — the parent renders the original `code` regardless of the
 *   active translation. This bar only governs title / summary / body prose.
 */
export function TranslateBar({
	work,
	translations,
	active,
	onSelect,
}: {
	work: Work;
	translations: Translation[];
	active: Translation | null;
	onSelect: (translation: Translation | null) => void;
}) {
	const { t } = useI18n();
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);
	const originalLabel = contentLanguageLabel(work.language) || t('lang.original');

	useEffect(() => {
		if (!open) return;
		function onClick(event: MouseEvent) {
			if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
		}
		function onKey(event: KeyboardEvent) {
			if (event.key === 'Escape') setOpen(false);
		}
		document.addEventListener('mousedown', onClick);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('mousedown', onClick);
			document.removeEventListener('keydown', onKey);
		};
	}, [open]);

	return (
		<div className="translate-bar rail" ref={ref}>
			<div className="translate-original">
				<span className="translate-dot" aria-hidden="true" />
				<span className="translate-label">{t('lang.original')}</span>
				<span className="translate-language">{originalLabel}</span>
			</div>

			<div className="translate-control">
				{active && (
					<span className={`translate-badge ${active.source === 'human' ? 'human' : 'machine'}`}>
						{t('lang.translated')} · {contentLanguageLabel(active.language)}
					</span>
				)}
				{active ? (
					<button type="button" className="translate-action" onClick={() => onSelect(null)}>
						{t('lang.showOriginal')}
					</button>
				) : (
					<button
						type="button"
						className="translate-action"
						onClick={() => setOpen((v) => !v)}
						aria-haspopup="listbox"
						aria-expanded={open}
					>
						<Languages size={14} strokeWidth={1.5} />
						{t('lang.translate')}
						<ChevronDown size={13} className={`lang-chevron ${open ? 'open' : ''}`} strokeWidth={1.5} />
					</button>
				)}
				{open && (
					<ul className="lang-menu translate-menu" role="listbox">
						{translations.length === 0 && (
							<li className="translate-empty">
								<AlertCircle size={14} strokeWidth={1.5} />
								<span>{t('lang.noTranslation')}</span>
							</li>
						)}
						{translations.map((tr) => (
							<li key={tr.id}>
								<button
									type="button"
									role="option"
									aria-selected={active?.id === tr.id}
									className={`lang-option ${active?.id === tr.id ? 'active' : ''}`}
									onClick={() => {
										onSelect(tr);
										setOpen(false);
									}}
								>
									<span className="lang-native">{contentLanguageLabel(tr.language)}</span>
									<span className={`translate-source ${tr.source === 'human' ? 'human' : 'machine'}`}>
										{tr.source === 'human' ? 'human' : 'machine'}
									</span>
									{active?.id === tr.id && <Check size={13} strokeWidth={2} />}
								</button>
							</li>
						))}
					</ul>
				)}
			</div>

			{active && <p className="translate-notice">{t('lang.translateNotice')}</p>}
		</div>
	);
}
