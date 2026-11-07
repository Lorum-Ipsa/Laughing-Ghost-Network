import { useId } from 'react';
import { useAuth } from '@/hooks/use-auth';
import {
	ACCENT_COLORS,
	normalizeVisibility,
	resolveTemplate,
	type AvatarTemplate,
	type GhostAccent,
	type GhostBackground,
	type GhostExpression,
} from '@/lib/ghost-avatar';
import { profileAvatarUrl, type GhostProfile } from '@/lib/network';

/**
 * The Laughing Ghost avatar. Renders, in priority order:
 *   1. A custom uploaded image (when `profile.avatar` is set and visible)
 *   2. A chosen template ghost (SVG), or the handle-derived default
 *
 * Visibility (`avatar_visibility`: public | members | hidden) is honored here
 * so every surface that shows a Ghost — directory, public profile, projects,
 * Table Talks, collaboration views — respects the owner's choice without each
 * call site re-implementing it. `forceShow` bypasses visibility for the owner's
 * own preview in My Profile.
 *
 * Template avatars are pure SVG: composable expression + accent + background
 * variants that all share the Laughing Ghost silhouette. No file storage, no
 * network request, no face required — logos, symbols, art, and handles fit
 * the pseudonymous identity model.
 */

const BODY_FILL = 'hsl(var(--foreground))';
const BODY_DIM = 'hsl(var(--foreground) / 0.82)';
const BG_FILL = 'hsl(var(--card))';
const BG_DEEP = 'hsl(var(--background))';

/** The shared ghost silhouette path — the Laughing Ghost body. */
const GHOST_BODY =
	'M10,40 A22,22 0 0 1 54,40 L54,52 Q48.5,58 43,52 Q37.5,58 32,52 Q26.5,58 21,52 Q15.5,58 10,52 Z';

function eyePair(expression: GhostExpression, accent: string) {
	const cx1 = 25;
	const cx2 = 39;
	const cy = 33;
	const fill = accent;

	switch (expression) {
		case 'neutral':
			return (
				<>
					<ellipse cx={cx1} cy={cy} rx={3.4} ry={4.6} fill={fill} />
					<ellipse cx={cx2} cy={cy} rx={3.4} ry={4.6} fill={fill} />
				</>
			);
		case 'mischief':
			return (
				<>
					<path d={`M${cx1 - 4},${cy - 6} L${cx1 + 4},${cy - 4}`} stroke={fill} strokeWidth={1.6} strokeLinecap="round" />
					<path d={`M${cx2 - 4},${cy - 4} L${cx2 + 4},${cy - 6}`} stroke={fill} strokeWidth={1.6} strokeLinecap="round" />
					<ellipse cx={cx1} cy={cy + 1} rx={2.6} ry={3.4} fill={fill} />
					<ellipse cx={cx2} cy={cy + 1} rx={2.6} ry={3.4} fill={fill} />
					<path d={`M29,42 Q32,44 35,42`} stroke={fill} strokeWidth={1.4} strokeLinecap="round" fill="none" />
				</>
			);
		case 'curious':
			return (
				<>
					<ellipse cx={cx1} cy={cy} rx={4.6} ry={5.4} fill={fill} />
					<ellipse cx={cx2} cy={cy + 1} rx={2.4} ry={3.2} fill={fill} />
				</>
			);
		case 'serious':
			return (
				<>
					<rect x={cx1 - 4} y={cy - 1.4} width={8} height={2.8} rx={1.4} fill={fill} />
					<rect x={cx2 - 4} y={cy - 1.4} width={8} height={2.8} rx={1.4} fill={fill} />
				</>
			);
		case 'sleepy':
			return (
				<>
					<path d={`M${cx1 - 4},${cy} Q${cx1},${cy + 4} ${cx1 + 4},${cy}`} stroke={fill} strokeWidth={1.8} strokeLinecap="round" fill="none" />
					<path d={`M${cx2 - 4},${cy} Q${cx2},${cy + 4} ${cx2 + 4},${cy}`} stroke={fill} strokeWidth={1.8} strokeLinecap="round" fill="none" />
				</>
			);
		case 'wink':
			return (
				<>
					<ellipse cx={cx1} cy={cy} rx={3.4} ry={4.6} fill={fill} />
					<path d={`M${cx2 - 4},${cy} Q${cx2},${cy + 4} ${cx2 + 4},${cy}`} stroke={fill} strokeWidth={1.8} strokeLinecap="round" fill="none" />
					<path d={`M29,42 Q32,44.5 35,42`} stroke={fill} strokeWidth={1.4} strokeLinecap="round" fill="none" />
				</>
			);
		case 'surprised':
			return (
				<>
					<circle cx={cx1} cy={cy} r={4.2} fill={fill} />
					<circle cx={cx2} cy={cy} r={4.2} fill={fill} />
					<circle cx={32} cy={43} r={2.4} fill={fill} />
				</>
			);
		case 'stoic':
			return (
				<>
					<rect x={cx1 - 3.4} y={cy - 1.2} width={6.8} height={2.4} rx={1.2} fill={fill} />
					<rect x={cx2 - 3.4} y={cy - 1.2} width={6.8} height={2.4} rx={1.2} fill={fill} />
					<path d={`M29,43 L35,43`} stroke={fill} strokeWidth={1.4} strokeLinecap="round" />
				</>
			);
		default:
			return null;
	}
}

function Background({ background, accent }: { background: GhostBackground; accent: string }) {
	const gid = 'g' + useId().replace(/[^a-zA-Z0-9]/g, '');
	const line = `hsl(${hexFromHsl(accent)} / 0.16)`;
	if (background === 'solid') {
		return <rect x={0} y={0} width={64} height={64} rx={6} fill={BG_FILL} />;
	}
	if (background === 'grid') {
		return (
			<>
				<rect x={0} y={0} width={64} height={64} rx={6} fill={BG_FILL} />
				<g stroke={line} strokeWidth={0.6}>
					{[16, 32, 48].map((p) => (
						<line key={`v${p}`} x1={p} y1={4} x2={p} y2={60} />
					))}
					{[16, 32, 48].map((p) => (
						<line key={`h${p}`} x1={4} y1={p} x2={60} y2={p} />
					))}
				</g>
			</>
		);
	}
	// glitch: grid + offset accent scan stripes
	return (
		<>
			<rect x={0} y={0} width={64} height={64} rx={6} fill={BG_DEEP} />
			<defs>
				<linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
					<stop offset="0" stopColor={accent} stopOpacity={0.10} />
					<stop offset="1" stopColor={accent} stopOpacity={0} />
				</linearGradient>
			</defs>
			<rect x={0} y={0} width={64} height={64} rx={6} fill={`url(#${gid})`} />
			<g stroke={line} strokeWidth={0.6}>
				{[12, 24, 36, 48].map((p) => (
					<line key={`v${p}`} x1={p} y1={4} x2={p} y2={60} />
				))}
				{[20, 44].map((p) => (
					<line key={`h${p}`} x1={4} y1={p} x2={60} y2={p} />
				))}
			</g>
			<rect x={4} y={18} width={26} height={2.4} rx={1.2} fill={accent} opacity={0.32} />
			<rect x={30} y={40} width={30} height={2.4} rx={1.2} fill={accent} opacity={0.22} />
		</>
	);
}

/**
 * Extract the raw `hsl(...)` triple from an `hsl(h s% l%)` string so it can be
 * composed with alpha. Falls back to the accent string itself.
 */
function hexFromHsl(hsl: string): string {
	const m = hsl.match(/^hsl\(([^)]+)\)$/);
	return m ? m[1] : hsl;
}

function TemplateGhost({ template, className, size }: { template: AvatarTemplate; className?: string; size?: number }) {
	const accent = ACCENT_COLORS[template.accent];
	const sizing = size ? { width: size, height: size } : undefined;
	return (
		<svg
			className={`ghost-avatar-svg ${className || ''}`}
			viewBox="0 0 64 64"
			role="img"
			aria-label="Laughing Ghost avatar"
			focusable="false"
			style={sizing}
		>
			<Background background={template.background} accent={accent} />
			{/* soft accent halo behind the body */}
			<ellipse cx={32} cy={40} rx={20} ry={22} fill={accent} opacity={0.06} />
			<path d={GHOST_BODY} fill={BODY_FILL} />
			{/* inner shade along the right edge for depth */}
			<path d={GHOST_BODY} fill={BODY_DIM} opacity={0.18} transform="translate(1.4,0)" />
			{eyePair(template.expression, accent)}
		</svg>
	);
}

export type GhostAvatarProps = {
	profile?: GhostProfile | null;
	handle?: string;
	size?: number;
	className?: string;
	thumb?: string;
	/** Bypass visibility (the owner previewing their own profile). */
	forceShow?: boolean;
	/** Render only the template/default, ignoring a custom upload. */
	templateOnly?: boolean;
};

export function GhostAvatar({
	profile,
	handle,
	size = 48,
	className = '',
	thumb = '400x400',
	forceShow = false,
	templateOnly = false,
}: GhostAvatarProps) {
	const { isAuthed, isLoading } = useAuth();
	const visibility = normalizeVisibility(profile?.avatar_visibility);
	const customUrl = !templateOnly && profile?.avatar ? profileAvatarUrl(profile, thumb) : '';

	// Visibility gate. Public avatars render immediately (SSR-safe). Members-
	// only avatars render for authenticated viewers; during the initial
	// isLoading window we render the placeholder so SSR and first client render
	// match (no hydration mismatch). Hidden avatars always render the
	// handle-derived placeholder.
	const visible = forceShow || visibility === 'public' || (visibility === 'members' && isAuthed && !isLoading);

	const effectiveHandle = profile?.handle || handle || 'ghost';
	const template = resolveTemplate({ handle: effectiveHandle, avatar_template: profile?.avatar_template });

	if (customUrl && visible) {
		return (
			<img
				src={customUrl}
				alt={`${effectiveHandle} avatar`}
				width={size}
				height={size}
				className={`ghost-avatar-img ${className}`}
				loading="lazy"
				decoding="async"
				style={{ width: size, height: size }}
			/>
		);
	}

	if (!visible) {
		// Hidden from this viewer — show the neutral handle-derived silhouette
		// without the chosen expression/accent, so the placeholder never leaks
		// the owner's selected variant.
		return <TemplateGhost template={{ expression: 'neutral', accent: 'teal', background: 'grid' }} className={className} size={size} />;
	}

	return <TemplateGhost template={template} className={className} size={size} />;
}

export { TemplateGhost };
