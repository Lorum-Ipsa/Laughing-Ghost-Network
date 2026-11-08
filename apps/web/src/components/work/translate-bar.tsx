import { useEffect, useRef, useState } from 'react';
import { Languages, Check, ChevronDown } from 'lucide-react';
import { translateProse, withTranslator } from '@/lib/browser-translation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { useI18n } from '@/lib/i18n';
import { CONTENT_LANGUAGES, contentLanguageLabel, readReadingLanguage } from '@/lib/languages';
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
	const { t, lang } = useI18n();
	const [target,setTarget]=useState('');
	const [preferred,setPreferred]=useState('');
	useEffect(()=>{
		let active=true;
		const stored=readReadingLanguage();
		setPreferred(stored);
		if(!stored)void (async()=>{
			try{
				const api=supabaseBrowser();
				const {data:{session}}=await api.auth.getSession();
				if(!session)return;
				const {data}=await api.from('ghost_profile_preferences')
					.select('preferred_translation_language').eq('user_id',session.user.id).maybeSingle();
				if(active&&data)setPreferred(data.preferred_translation_language);
			}catch{/* Public readers can use the site language. */}
		})();
		return()=>{active=false;};
	},[]);
	const [busy,setBusy]=useState(false);
	const [error,setError]=useState('');
	const [sourceOverride,setSourceOverride]=useState('');
	const source=work.language==='other'?sourceOverride:work.language||'en';
	const languages=CONTENT_LANGUAGES.filter(item=>item.code!==source&&item.code!=='other');
	const selected=target||languages.find(item=>item.code===(preferred||lang))?.code||languages[0]?.code||'';

	async function translateArticle(){
		if(busy||!selected)return;
		setBusy(true);setError('');
		try{
			const saved=translations.find(item=>item.language===selected);
			if(saved){onSelect(saved);setOpen(false);return;}
			if(!source)throw new Error('Choose the original language before translating.');
			const result=await withTranslator(source,selected,async translate=>({
				title:await translateProse(work.title,translate),summary:await translateProse(work.summary,translate),
				body:await translateProse(work.body,translate),
			}));
			onSelect({id:`machine:${work.id}:${selected}`,work:work.id,language:selected,source:'machine',
				created:work.created,updated:work.updated,...result});
			setOpen(false);
		}catch(e){setError(e instanceof Error?e.message:'Could not translate this article.');}
		finally{setBusy(false);}
	}
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
						{active.source === 'human' ? 'Human translation' : t('lang.translated')} · {contentLanguageLabel(active.language)}
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
						onClick={() => {setError('');setOpen(v => !v);}}
						aria-haspopup="listbox"
						aria-expanded={open}
					>
						<Languages size={14} strokeWidth={1.5} />
						{t('lang.translate')}
						<ChevronDown size={13} className={`lang-chevron ${open ? 'open' : ''}`} strokeWidth={1.5} />
					</button>
				)}
				{open&&<div className="form-panel">
					{work.language==='other'&&<><label htmlFor="article-source-language">Original language</label>
					<select id="article-source-language" value={sourceOverride} disabled={busy}
						onChange={event=>{setSourceOverride(event.target.value);setTarget('');}}>
						<option value="">Choose the original language</option>
						{CONTENT_LANGUAGES.filter(item=>item.code!=='other').map(item=><option key={item.code} value={item.code}>{item.native}</option>)}
					</select></>}
					<label htmlFor="article-translation-language">Read this article in</label>
					<select id="article-translation-language" value={selected} disabled={busy} onChange={event=>setTarget(event.target.value)}>
						{languages.map(item=><option key={item.code} value={item.code}>{item.native}</option>)}
					</select>
					<button type="button" className="button button-outline" disabled={busy||!selected}
						onClick={()=>void translateArticle()}>{busy?'Translating…':'Translate article'}</button>
					{error&&<p role="alert">{error}</p>}
				</div>}
				{open && translations.length>0 && (
					<ul className="lang-menu translate-menu" role="listbox">
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
