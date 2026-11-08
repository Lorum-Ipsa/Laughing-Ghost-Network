import { useEffect, useRef, useState } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { hasBrowserTranslator } from '@/lib/browser-translation';
import { LANGUAGES, hasBuiltInInterfaceLanguage, useI18n } from '@/lib/i18n';

/**
 * Interface language selector. Switches the UI language (client-side
 * preference). It does NOT translate member content — content keeps its
 * original language and offers its own "Translate" affordance.
 */
export function LanguageSelector({ variant = 'header' }: { variant?: 'header' | 'mobile' }) {
	const { lang, setLang, t, translating, languageError } = useI18n();
	const [open, setOpen] = useState(false);
	const [automatic,setAutomatic]=useState(false);
	useEffect(()=>setAutomatic(hasBrowserTranslator()),[]);
	const ref = useRef<HTMLDivElement>(null);

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

	const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

	return (
		<div className={`lang-selector lang-selector-${variant}`} ref={ref}>
			<button
				type="button"
				className="lang-trigger"
				onClick={() => setOpen((v) => !v)}
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-label={t('header.lang')}
				title="Site language"
			>
				<Globe size={15} strokeWidth={1.5} />
				<span className="lang-code">{current.code.toUpperCase()}</span>
				<ChevronDown size={13} className={`lang-chevron ${open ? 'open' : ''}`} strokeWidth={1.5} />
			</button>
			{open && (
				<ul className="lang-menu" role="listbox" aria-label={t('lang.interface')}>
					<li className="lang-menu-heading">{t('lang.interface')}</li>
					{translating&&<li role="status">Translating site interface…</li>}
					{languageError&&<li role="alert">{languageError}</li>}
					{LANGUAGES.filter(l=>automatic||hasBuiltInInterfaceLanguage(l.code)||l.code===lang).map((l) => (
						<li key={l.code}>
							<button
								type="button"
								role="option"
								aria-selected={l.code === lang}
								className={`lang-option ${l.code === lang ? 'active' : ''}`}
								disabled={translating}
								onClick={() => {void setLang(l.code);}}
							>
								<span className="lang-native">{l.native}</span>
								<span className="lang-code-small">{l.code.toUpperCase()}</span>
								{l.code === lang && <Check size={13} strokeWidth={2} />}
							</button>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
