/**
 * "Choose your Ghost" avatar system.
 *
 * Avatars are composable Laughing Ghost variants built from three dimensions:
 *   - expression: the ghost's face (neutral, mischief, curious, …)
 *   - accent: the eye/detail color (teal, spectral, amber, …)
 *   - background: solid, grid, or glitch
 *
 * A template key is the string `"<expression>:<accent>:<background>"`. It is
 * stored on the Ghost profile as `avatar_template` and rendered client-side as
 * SVG by `<GhostAvatar />`, so template avatars need no file storage. When no
 * template is chosen, a deterministic default is derived from the Ghost's
 * handle — so every new Ghost gets a unique branded avatar automatically.
 *
 * A Ghost may also upload a custom image (logo, artwork, photograph — never
 * required, never required to be a real-person photo). The custom image takes
 * precedence over the template when present.
 */

export type GhostExpression =
	| 'neutral' | 'mischief' | 'curious' | 'serious'
	| 'sleepy' | 'wink' | 'surprised' | 'stoic';

export type GhostAccent =
	| 'teal' | 'spectral' | 'amber' | 'violet' | 'crimson' | 'green';

export type GhostBackground = 'solid' | 'grid' | 'glitch';

export type AvatarVisibility = 'public' | 'members' | 'hidden';

export type AvatarTemplate = {
	expression: GhostExpression;
	accent: GhostAccent;
	background: GhostBackground;
};

export const GHOST_EXPRESSIONS: { value: GhostExpression; label: string }[] = [
	{ value: 'neutral', label: 'Neutral' },
	{ value: 'mischief', label: 'Mischief' },
	{ value: 'curious', label: 'Curious' },
	{ value: 'serious', label: 'Serious' },
	{ value: 'sleepy', label: 'Sleepy' },
	{ value: 'wink', label: 'Wink' },
	{ value: 'surprised', label: 'Surprised' },
	{ value: 'stoic', label: 'Stoic' },
];

export const GHOST_ACCENTS: { value: GhostAccent; label: string; color: string }[] = [
	{ value: 'teal', label: 'Teal', color: 'hsl(154 43% 76%)' },
	{ value: 'spectral', label: 'Spectral', color: 'hsl(246 89% 70%)' },
	{ value: 'amber', label: 'Amber', color: 'hsl(38 85% 62%)' },
	{ value: 'violet', label: 'Violet', color: 'hsl(265 70% 74%)' },
	{ value: 'crimson', label: 'Crimson', color: 'hsl(350 72% 66%)' },
	{ value: 'green', label: 'Green', color: 'hsl(120 42% 66%)' },
];

export const GHOST_BACKGROUNDS: { value: GhostBackground; label: string }[] = [
	{ value: 'solid', label: 'Solid' },
	{ value: 'grid', label: 'Grid' },
	{ value: 'glitch', label: 'Glitch' },
];

export const ACCENT_COLORS: Record<GhostAccent, string> = Object.fromEntries(
	GHOST_ACCENTS.map((a) => [a.value, a.color]),
) as Record<GhostAccent, string>;

export const ACCENT_LABELS: Record<GhostAccent, string> = Object.fromEntries(
	GHOST_ACCENTS.map((a) => [a.value, a.label]),
) as Record<GhostAccent, string>;

export const EXPRESSION_LABELS: Record<GhostExpression, string> = Object.fromEntries(
	GHOST_EXPRESSIONS.map((e) => [e.value, e.label]),
) as Record<GhostExpression, string>;

export const BACKGROUND_LABELS: Record<GhostBackground, string> = Object.fromEntries(
	GHOST_BACKGROUNDS.map((b) => [b.value, b.label]),
) as Record<GhostBackground, string>;

const EXPRESSION_VALUES = GHOST_EXPRESSIONS.map((e) => e.value);
const ACCENT_VALUES = GHOST_ACCENTS.map((a) => a.value);
const BACKGROUND_VALUES = GHOST_BACKGROUNDS.map((b) => b.value);

/**
 * A curated gallery of preset combinations. Each is a named, hand-picked
 * variant that still feels part of the same Laughing Ghost universe —
 * different ghost expressions, accent colors, and glitch/grid detail.
 */
export const AVATAR_PRESETS: { name: string; template: AvatarTemplate }[] = [
	{ name: 'Default', template: { expression: 'neutral', accent: 'teal', background: 'grid' } },
	{ name: 'Trickster', template: { expression: 'mischief', accent: 'amber', background: 'glitch' } },
	{ name: 'Spectre', template: { expression: 'serious', accent: 'spectral', background: 'solid' } },
	{ name: 'Spark', template: { expression: 'curious', accent: 'crimson', background: 'grid' } },
	{ name: 'Hush', template: { expression: 'sleepy', accent: 'violet', background: 'solid' } },
	{ name: 'Signal', template: { expression: 'wink', accent: 'green', background: 'glitch' } },
	{ name: 'Reveal', template: { expression: 'surprised', accent: 'teal', background: 'grid' } },
	{ name: 'Monolith', template: { expression: 'stoic', accent: 'spectral', background: 'glitch' } },
	{ name: 'Ember', template: { expression: 'mischief', accent: 'crimson', background: 'solid' } },
	{ name: 'Glade', template: { expression: 'neutral', accent: 'green', background: 'grid' } },
	{ name: 'Halcyon', template: { expression: 'sleepy', accent: 'teal', background: 'glitch' } },
	{ name: 'Oracle', template: { expression: 'curious', accent: 'violet', background: 'grid' } },
];

/** Serialize a template into its storage key. */
export function encodeTemplate(t: AvatarTemplate): string {
	return `${t.expression}:${t.accent}:${t.background}`;
}

/** Parse a stored template key. Returns null when unset or malformed. */
export function parseTemplate(value?: string | null): AvatarTemplate | null {
	if (!value) return null;
	const parts = value.split(':');
	if (parts.length !== 3) return null;
	const [expression, accent, background] = parts;
	if (
		!EXPRESSION_VALUES.includes(expression as GhostExpression) ||
		!ACCENT_VALUES.includes(accent as GhostAccent) ||
		!BACKGROUND_VALUES.includes(background as GhostBackground)
	) {
		return null;
	}
	return {
		expression: expression as GhostExpression,
		accent: accent as GhostAccent,
		background: background as GhostBackground,
	};
}

/** Normalize a visibility value, defaulting to public. */
export function normalizeVisibility(value?: string | null): AvatarVisibility {
	if (value === 'members' || value === 'hidden') return value;
	return 'public';
}

/**
 * Deterministic 32-bit hash of a string (FNV-1a). Used to derive a stable
 * default avatar from a Ghost's handle so the same handle always yields the
 * same ghost variant — no storage needed.
 */
function hashHandle(handle: string): number {
	let h = 0x811c9dc5;
	for (let i = 0; i < handle.length; i++) {
		h ^= handle.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	return h >>> 0;
}

/**
 * Derive a default avatar template from a handle. Every new Ghost gets a
 * unique, stable branded avatar automatically — even before they choose one.
 */
export function defaultTemplateFor(handle: string): AvatarTemplate {
	const h = hashHandle(handle || 'ghost');
	return {
		expression: EXPRESSION_VALUES[h % EXPRESSION_VALUES.length],
		accent: ACCENT_VALUES[(h >> 3) % ACCENT_VALUES.length],
		background: BACKGROUND_VALUES[(h >> 6) % BACKGROUND_VALUES.length],
	};
}

/**
 * Resolve the effective template for a profile: the chosen one, or the
 * handle-derived default when none is set.
 */
export function resolveTemplate(profile: { handle: string; avatar_template?: string | null }): AvatarTemplate {
	return parseTemplate(profile.avatar_template) ?? defaultTemplateFor(profile.handle);
}
