/**
 * Content languages — the languages members can publish in.
 *
 * These are NOT the interface languages (see `@/lib/i18n`); they record the
 * original language of a member's work or profile. The author's original
 * language is always preserved and authoritative; translation is a reader's
 * choice that never replaces the original.
 *
 * The list is intentionally broad: LGN is an international network. Add codes
 * here and to the matching PocketBase `select` values when a new language is
 * needed — both the UI labels and the migration values must stay in sync.
 */
export type ContentLanguage = { code: string; label: string; native: string };

export const CONTENT_LANGUAGES: ContentLanguage[] = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'fr', label: 'French', native: 'Français' },
  { code: 'es', label: 'Spanish', native: 'Español' },
  { code: 'de', label: 'German', native: 'Deutsch' },
  { code: 'pt', label: 'Portuguese', native: 'Português' },
  { code: 'it', label: 'Italian', native: 'Italiano' },
  { code: 'nl', label: 'Dutch', native: 'Nederlands' },
  { code: 'pl', label: 'Polish', native: 'Polski' },
  { code: 'ru', label: 'Russian', native: 'Русский' },
  { code: 'uk', label: 'Ukrainian', native: 'Українська' },
  { code: 'sv', label: 'Swedish', native: 'Svenska' },
  { code: 'ja', label: 'Japanese', native: '日本語' },
  { code: 'zh', label: 'Chinese', native: '中文' },
  { code: 'ko', label: 'Korean', native: '한국어' },
  { code: 'ar', label: 'Arabic', native: 'العربية' },
  { code: 'he', label: 'Hebrew', native: 'עברית' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'tr', label: 'Turkish', native: 'Türkçe' },
  { code: 'vi', label: 'Vietnamese', native: 'Tiếng Việt' },
  { code: 'id', label: 'Indonesian', native: 'Bahasa Indonesia' },
  { code: 'fa', label: 'Persian', native: 'فارسی' },
  { code: 'ro', label: 'Romanian', native: 'Română' },
  { code: 'other', label: 'Other', native: 'Other' },
];

export const DEFAULT_CONTENT_LANGUAGE = 'en';

/** Codes allowed on the PocketBase `language` select fields — keep in sync. */
export const CONTENT_LANGUAGE_CODES = CONTENT_LANGUAGES.map((l) => l.code);

/** Native name for a language code, e.g. `contentLanguageLabel('fr') → 'Français'`. */
export function contentLanguageLabel(code?: string | null): string {
  if (!code) return '';
  return CONTENT_LANGUAGES.find((l) => l.code === code)?.native || code;
}

/** English name for a language code, for alt text / metadata. */
export function contentLanguageName(code?: string | null): string {
  if (!code) return '';
  return CONTENT_LANGUAGES.find((l) => l.code === code)?.label || code;
}

const READING_LANGUAGE_KEY='lgn-reading-language';

export function readReadingLanguage(){
  try{
    const value=localStorage.getItem(READING_LANGUAGE_KEY);
    return CONTENT_LANGUAGES.find(item=>item.code===value&&item.code!=='other')?.code??'';
  }catch{return '';}
}

export function saveReadingLanguage(language:string){
  try{localStorage.setItem(READING_LANGUAGE_KEY,language);}
  catch{/* The account preference can still be saved. */}
}
