import type { Route } from './+types/ghost-space';
import { seo } from '@/lib/seo';
import { requireAuth } from '@/lib/require-auth';
import { GhostSpaceDashboard } from '@/components/ghost-space/dashboard';

export function meta({ matches, location }: Route.MetaArgs) {
	return seo({ matches, location }, {
		title: 'Ghost Space — Your workspace | LGN',
		description: 'Your private Ghost Space: dashboard, contributions, projects, Table Talks, network search, notifications, and settings. A professional cybersecurity workspace — not a social feed.',
		noindex: true,
	});
}

export function clientLoader() {
	return { user: requireAuth() };
}
clientLoader.hydrate = true as const;

export function HydrateFallback() {
	return <main className="rail loading-state" style={{ minHeight: '60vh' }}>Loading Ghost Space…</main>;
}

export default function GhostSpace() {
	return <GhostSpaceDashboard />;
}
