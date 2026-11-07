/**
 * Internationalization for the Laughing Ghost Network interface.
 *
 * The interface language is a client-side preference (stored in localStorage).
 * The server always renders the default language (English) so SSR output stays
 * user-agnostic and edge-cacheable — exactly like auth, personalization never
 * shapes a server response. After hydration the client applies the stored
 * preference and re-renders.
 *
 * Member-created content (research, writeups, projects, profiles) is NOT
 * translated by this layer. Its original language is recorded on the record
 * (`language` field) and preserved verbatim; a separate "Translate" affordance
 * on the work page lets readers opt into a machine-translated view that is
 * always clearly distinguished from the authoritative original.
 */
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
	type ReactNode,
} from 'react';

export type InterfaceLanguage = 'en' | 'fr' | 'es' | 'de';

export const LANGUAGES: {
	code: InterfaceLanguage;
	label: string;
	native: string;
}[] = [
	{ code: 'en', label: 'English', native: 'English' },
	{ code: 'fr', label: 'French', native: 'Français' },
	{ code: 'es', label: 'Spanish', native: 'Español' },
	{ code: 'de', label: 'German', native: 'Deutsch' },
];

const DEFAULT_LANG: InterfaceLanguage = 'en';
const STORAGE_KEY = 'lgn-lang';

type Dict = Record<string, string>;

const en: Dict = {
	'nav.ghosts': 'Ghosts',
	'nav.research': 'Research',
	'nav.arsenal': 'Arsenal',
	'nav.projects': 'Projects',
	'nav.tableTalks': 'Table Talks',
	'nav.about': 'About',
	'header.join': 'Join the network',
	'header.lang': 'Interface language',
	'footer.tagline': 'Open Network. Private Identities. Public Work.',
	'footer.getInTouch': 'Get in touch',
	'footer.copyright': '© 2026 Laughing Ghost Network',
	'footer.motto': 'Independent by choice. Ethical by principle.',
	'footer.about': 'About',
	'footer.code': 'Code of conduct',
	'footer.contact': 'Contact',
	'footer.support': 'Support',
	'footer.security': 'Security',
	'footer.space': 'Ghost space',
	'hero.eyebrow': 'LAUGHING GHOST NETWORK',
	'hero.title1': 'Identity is private.',
	'hero.title2': 'public.',
	'hero.tagline': 'Open Network. Private Identities. Public Work.',
	'hero.desc': 'A cybersecurity network for practitioners who want their work—not their popularity—to define their reputation. Pseudonymous identities. Demonstrated skill. Public contributions.',
	'hero.explore': 'Explore the Network',
	'hero.become': 'Become a Ghost',
	'hero.note1': 'Your pseudonym is your identity.',
	'hero.note2': 'Your work is your signature.',
	'hero.scroll': 'DISCOVER THE NETWORK',
	'hero.bottom1': 'AN OPEN NETWORK, NOT A CLOSED CLUB.',
	'hero.bottom2': 'SKILL IS DEMONSTRATED. IT IS NOT RANKED.',
	'principle.private.title': 'Private identities',
	'principle.private.desc': 'Use a persistent handle. Your civil identity is optional.',
	'principle.public.title': 'Public work',
	'principle.public.desc': 'Publish research, detections, tools, writeups, and projects that others can inspect.',
	'principle.open.title': 'Open network',
	'principle.open.desc': 'Discover practitioners by what they build, investigate, publish, and contribute.',
	'principle.language.title': 'Write in your language',
	'principle.language.desc': 'Share with the network. Your original language is preserved; translation is a reader’s choice.',
	'lang.original': 'Original',
	'lang.translate': 'Translate',
	'lang.showOriginal': 'Show original',
	'lang.translated': 'Machine-translated',
	'lang.noTranslation': 'No translation available yet',
	'lang.translateNotice': 'The original publication remains authoritative. Code, commands, and technical artifacts are never translated.',
	'lang.readIn': 'Read in',
	'lang.interface': 'Interface language',
	'work.example': 'EXAMPLE',
	'work.originalLang': 'ORIGINAL',
	'work.publishedBy': 'PUBLISHED BY',
	'work.domains': 'DOMAINS',
	'work.type': 'CONTRIBUTION TYPE',
	'work.researchDomain': 'RESEARCH DOMAIN',
	'work.reviewStatus': 'REVIEW STATUS',
	'work.originalLanguage': 'ORIGINAL LANGUAGE',
	'work.published': 'PUBLISHED',
	'work.related': 'RELATED',
	'work.sourceRepo': 'Source / external repo',
	'work.useScope': 'Use within an authorized scope only. Document your adaptations and observed limitations.',
	'work.readConduct': 'Read the code of conduct',
	'contribute.language': 'Language of this contribution',
	'contribute.languageHelp': 'The language you wrote in. It is preserved as the original and authoritative version.',
	'profile.language': 'Primary language',
};

const fr: Dict = {
	'nav.ghosts': 'Ghosts',
	'nav.research': 'Recherche',
	'nav.arsenal': 'Arsenal',
	'nav.projects': 'Projets',
	'nav.tableTalks': 'Table Talks',
	'nav.about': 'À propos',
	'header.join': 'Rejoindre le réseau',
	'header.lang': "Langue de l'interface",
	'footer.tagline': 'Réseau ouvert. Identités privées. Travail public.',
	'footer.getInTouch': 'Nous contacter',
	'footer.copyright': '© 2026 Laughing Ghost Network',
	'footer.motto': 'Indépendant par choix. Éthique par principe.',
	'footer.about': 'À propos',
	'footer.code': 'Code de conduite',
	'footer.contact': 'Contact',
	'footer.support': 'Assistance',
	'footer.security': 'Sécurité',
	'footer.space': 'Espace Ghost',
	'hero.eyebrow': 'LAUGHING GHOST NETWORK',
	'hero.title1': "L'identité est privée.",
	'hero.title2': 'public.',
	'hero.tagline': 'Réseau ouvert. Identités privées. Travail public.',
	'hero.desc': "Un réseau de cybersécurité pour les praticiens qui veulent que leur travail—pas leur popularité—définisse leur réputation. Identités pseudonymes. Compétence démontrée. Contributions publiques.",
	'hero.explore': 'Explorer le réseau',
	'hero.become': 'Devenir un Ghost',
	'hero.note1': 'Votre pseudonyme est votre identité.',
	'hero.note2': 'Votre travail est votre signature.',
	'hero.scroll': 'DÉCOUVRIR LE RÉSEAU',
	'hero.bottom1': 'UN RÉSEAU OUVERT, PAS UN CLUB FERMÉ.',
	'hero.bottom2': 'LA COMPÉTENCE SE DÉMONTRE. ELLE NE SE CLASSE PAS.',
	'principle.private.title': 'Identités privées',
	'principle.private.desc': 'Utilisez un pseudo persistant. Votre identité civile est facultative.',
	'principle.public.title': 'Travail public',
	'principle.public.desc': "Publiez recherches, détections, outils, writeups et projets que d'autres peuvent inspecter.",
	'principle.open.title': 'Réseau ouvert',
	'principle.open.desc': 'Découvrez les praticiens par ce qu’ils construisent, investiguent, publient et contribuent.',
	'principle.language.title': 'Écrivez dans votre langue',
	'principle.language.desc': 'Partagez avec le réseau. Votre langue d’origine est préservée ; la traduction est un choix du lecteur.',
	'lang.original': 'Original',
	'lang.translate': 'Traduire',
	'lang.showOriginal': "Voir l'original",
	'lang.translated': 'Traduit automatiquement',
	'lang.noTranslation': 'Aucune traduction disponible pour l’instant',
	'lang.translateNotice': 'La publication originale reste faisant autorité. Le code, les commandes et les artefacts techniques ne sont jamais traduits.',
	'lang.readIn': 'Lire en',
	'lang.interface': "Langue de l'interface",
	'work.example': 'EXEMPLE',
	'work.originalLang': 'ORIGINAL',
	'work.publishedBy': 'PUBLIÉ PAR',
	'work.domains': 'DOMAINES',
	'work.type': 'TYPE DE CONTRIBUTION',
	'work.researchDomain': 'DOMAINE DE RECHERCHE',
	'work.reviewStatus': 'STATUT DE RÉVISION',
	'work.originalLanguage': 'LANGUE D’ORIGINE',
	'work.published': 'PUBLIÉ',
	'work.related': 'LIÉS',
	'work.sourceRepo': 'Source / dépôt externe',
	'work.useScope': 'Utilisez uniquement dans un cadre autorisé. Documentez vos adaptations et les limites observées.',
	'work.readConduct': 'Lire le code de conduite',
	'contribute.language': 'Langue de cette contribution',
	'contribute.languageHelp': "La langue dans laquelle vous avez écrit. Elle est préservée comme version originale et faisant autorité.",
	'profile.language': 'Langue principale',
};

const es: Dict = {
	'nav.ghosts': 'Ghosts',
	'nav.research': 'Investigación',
	'nav.arsenal': 'Arsenal',
	'nav.projects': 'Proyectos',
	'nav.tableTalks': 'Table Talks',
	'nav.about': 'Acerca de',
	'header.join': 'Unirse a la red',
	'header.lang': 'Idioma de la interfaz',
	'footer.tagline': 'Red abierta. Identidades privadas. Trabajo público.',
	'footer.getInTouch': 'Contacto',
	'footer.copyright': '© 2026 Laughing Ghost Network',
	'footer.motto': 'Independiente por elección. Ético por principio.',
	'footer.about': 'Acerca de',
	'footer.code': 'Código de conducta',
	'footer.contact': 'Contacto',
	'footer.support': 'Soporte',
	'footer.security': 'Seguridad',
	'footer.space': 'Espacio Ghost',
	'hero.eyebrow': 'LAUGHING GHOST NETWORK',
	'hero.title1': 'La identidad es privada.',
	'hero.title2': 'público.',
	'hero.tagline': 'Red abierta. Identidades privadas. Trabajo público.',
	'hero.desc': 'Una red de ciberseguridad para profesionales que quieren que su trabajo—no su popularidad—defina su reputación. Identidades seudónimas. Habilidad demostrada. Contribuciones públicas.',
	'hero.explore': 'Explorar la red',
	'hero.become': 'Convertirse en Ghost',
	'hero.note1': 'Tu seudónimo es tu identidad.',
	'hero.note2': 'Tu trabajo es tu firma.',
	'hero.scroll': 'DESCUBRIR LA RED',
	'hero.bottom1': 'UNA RED ABIERTA, NO UN CLUB CERRADO.',
	'hero.bottom2': 'LA HABILIDAD SE DEMUESTRA. NO SE CLASIFICA.',
	'principle.private.title': 'Identidades privadas',
	'principle.private.desc': 'Usa un alias persistente. Tu identidad civil es opcional.',
	'principle.public.title': 'Trabajo público',
	'principle.public.desc': 'Publica investigación, detecciones, herramientas, writeups y proyectos que otros puedan inspeccionar.',
	'principle.open.title': 'Red abierta',
	'principle.open.desc': 'Descubre a los profesionales por lo que construyen, investigan, publican y contribuyen.',
	'principle.language.title': 'Escribe en tu idioma',
	'principle.language.desc': 'Comparte con la red. Tu idioma original se preserva; la traducción es una elección del lector.',
	'lang.original': 'Original',
	'lang.translate': 'Traducir',
	'lang.showOriginal': 'Ver original',
	'lang.translated': 'Traducido automáticamente',
	'lang.noTranslation': 'Aún no hay traducción disponible',
	'lang.translateNotice': 'La publicación original sigue siendo autorizada. El código, los comandos y los artefactos técnicos nunca se traducen.',
	'lang.readIn': 'Leer en',
	'lang.interface': 'Idioma de la interfaz',
	'work.example': 'EJEMPLO',
	'work.originalLang': 'ORIGINAL',
	'work.publishedBy': 'PUBLICADO POR',
	'work.domains': 'DOMINIOS',
	'work.type': 'TIPO DE CONTRIBUCIÓN',
	'work.researchDomain': 'DOMINIO DE INVESTIGACIÓN',
	'work.reviewStatus': 'ESTADO DE REVISIÓN',
	'work.originalLanguage': 'IDIOMA ORIGINAL',
	'work.published': 'PUBLICADO',
	'work.related': 'RELACIONADOS',
	'work.sourceRepo': 'Fuente / repositorio externo',
	'work.useScope': 'Usa solo en un ámbito autorizado. Documenta tus adaptaciones y las limitaciones observadas.',
	'work.readConduct': 'Leer el código de conducta',
	'contribute.language': 'Idioma de esta contribución',
	'contribute.languageHelp': 'El idioma en el que escribiste. Se preserva como la versión original y autorizada.',
	'profile.language': 'Idioma principal',
};

const de: Dict = {
	'nav.ghosts': 'Ghosts',
	'nav.research': 'Forschung',
	'nav.arsenal': 'Arsenal',
	'nav.projects': 'Projekte',
	'nav.tableTalks': 'Table Talks',
	'nav.about': 'Über uns',
	'header.join': 'Netzwerk beitreten',
	'header.lang': 'Sprache der Oberfläche',
	'footer.tagline': 'Offenes Netzwerk. Private Identitäten. Öffentliche Arbeit.',
	'footer.getInTouch': 'Kontakt',
	'footer.copyright': '© 2026 Laughing Ghost Network',
	'footer.motto': 'Aus Überzeugung unabhängig. Aus Prinzip ethisch.',
	'footer.about': 'Über uns',
	'footer.code': 'Verhaltenskodex',
	'footer.contact': 'Kontakt',
	'footer.support': 'Support',
	'footer.security': 'Sicherheit',
	'footer.space': 'Ghost-Bereich',
	'hero.eyebrow': 'LAUGHING GHOST NETWORK',
	'hero.title1': 'Identität ist privat.',
	'hero.title2': 'öffentlich.',
	'hero.tagline': 'Offenes Netzwerk. Private Identitäten. Öffentliche Arbeit.',
	'hero.desc': 'Ein Cybersicherheitsnetzwerk für Praktiker, die wollen, dass ihre Arbeit—nicht ihre Beliebtheit—ihren Ruf bestimmt. Pseudonyme Identitäten. Demonstrierte Fähigkeit. Öffentliche Beiträge.',
	'hero.explore': 'Netzwerk erkunden',
	'hero.become': 'Ein Ghost werden',
	'hero.note1': 'Dein Pseudonym ist deine Identität.',
	'hero.note2': 'Deine Arbeit ist deine Signatur.',
	'hero.scroll': 'DAS NETZWERK ENTDECKEN',
	'hero.bottom1': 'EIN OFFENES NETZWERK, KEIN GESCHLOSSENER CLUB.',
	'hero.bottom2': 'FÄHIGKEIT WIRD GEZEIGT. SIE WIRD NICHT GERANKT.',
	'principle.private.title': 'Private Identitäten',
	'principle.private.desc': 'Nutze einen beständigen Handle. Deine bürgerliche Identität ist optional.',
	'principle.public.title': 'Öffentliche Arbeit',
	'principle.public.desc': 'Veröffentliche Forschung, Detektionen, Tools, Writeups und Projekte, die andere prüfen können.',
	'principle.open.title': 'Offenes Netzwerk',
	'principle.open.desc': 'Entdecke Praktiker danach, was sie bauen, untersuchen, veröffentlichen und beitragen.',
	'principle.language.title': 'Schreibe in deiner Sprache',
	'principle.language.desc': 'Teile mit dem Netzwerk. Deine Originalsprache bleibt erhalten; Übersetzung ist die Wahl der Lesenden.',
	'lang.original': 'Original',
	'lang.translate': 'Übersetzen',
	'lang.showOriginal': 'Original anzeigen',
	'lang.translated': 'Maschinell übersetzt',
	'lang.noTranslation': 'Noch keine Übersetzung verfügbar',
	'lang.translateNotice': 'Die Originalveröffentlichung bleibt maßgeblich. Code, Befehle und technische Artefakte werden nie übersetzt.',
	'lang.readIn': 'Lesen in',
	'lang.interface': 'Sprache der Oberfläche',
	'work.example': 'BEISPIEL',
	'work.originalLang': 'ORIGINAL',
	'work.publishedBy': 'VERÖFFENTLICHT VON',
	'work.domains': 'BEREICHE',
	'work.type': 'BEITRAGSTYP',
	'work.researchDomain': 'FORSCHUNGSBEREICH',
	'work.reviewStatus': 'PRÜFSTATUS',
	'work.originalLanguage': 'ORIGINALSPRACHE',
	'work.published': 'VERÖFFENTLICHT',
	'work.related': 'VERWANDT',
	'work.sourceRepo': 'Quelle / externes Repo',
	'work.useScope': 'Nur in einem autorisierten Rahmen verwenden. Dokumentiere deine Anpassungen und beobachteten Einschränkungen.',
	'work.readConduct': 'Verhaltenskodex lesen',
	'contribute.language': 'Sprache dieses Beitrags',
	'contribute.languageHelp': 'Die Sprache, in der du geschrieben hast. Sie bleibt als originale und maßgebliche Version erhalten.',
	'profile.language': 'Hauptsprache',
};

const translations: Record<InterfaceLanguage, Dict> = { en, fr, es, de };

type I18nContextValue = {
	lang: InterfaceLanguage;
	setLang: (lang: InterfaceLanguage) => void;
	t: (key: string, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
	const [lang, setLangState] = useState<InterfaceLanguage>(DEFAULT_LANG);

	// Apply the stored preference after hydration — never during the first
	// render, so the server output (English) and the first client render match.
	useEffect(() => {
		try {
			const stored = localStorage.getItem(STORAGE_KEY) as InterfaceLanguage | null;
			if (stored && translations[stored]) setLangState(stored);
		} catch {
			/* localStorage unavailable — keep default. */
		}
	}, []);

	// Keep <html lang> in sync with the active interface language.
	useEffect(() => {
		if (typeof document !== 'undefined') document.documentElement.lang = lang;
	}, [lang]);

	const setLang = useCallback((next: InterfaceLanguage) => {
		setLangState(next);
		try {
			localStorage.setItem(STORAGE_KEY, next);
		} catch {
			/* ignore */
		}
	}, []);

	const t = useCallback(
		(key: string, vars?: Record<string, string | number>) => {
			let str = translations[lang]?.[key] ?? translations[DEFAULT_LANG][key] ?? key;
			if (vars) {
				for (const [k, v] of Object.entries(vars)) {
					str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
				}
			}
			return str;
		},
		[lang],
	);

	return (
		<I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>
	);
}

export function useI18n(): I18nContextValue {
	const ctx = useContext(I18nContext);
	if (!ctx) throw new Error('useI18n must be used within an I18nProvider');
	return ctx;
}
