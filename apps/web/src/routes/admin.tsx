import type { Route } from './+types/admin';
import { redirect } from 'react-router';
import { seo } from '@/lib/seo';
import { requireAuth } from '@/lib/require-auth';
import pb from '@/lib/pocketbase-client';
import { AdminDashboard } from '@/components/admin/admin-dashboard';

export function meta({ matches, location }: Route.MetaArgs) {
	return seo({ matches, location }, {
		title: 'Admin — Laughing Ghost Network',
		description: 'Network administration dashboard for accounts, roles, contributions, reports, and the audit log.',
		noindex: true,
	});
}

// Admin-only. The session lives in localStorage, so the guard runs in
// clientLoader. The collection access rules are the real security boundary;
// this gate keeps the UI away from non-admins. The stored record's role may be
// stale after a promotion, so re-fetch the account before deciding.
export async function clientLoader() {
	const user = requireAuth();
	let fresh;
	try {
		fresh = await pb.collection('users').getOne(user.id);
	} catch {
		throw redirect('/ghost-space');
	}
	if (fresh.role !== 'admin') throw redirect('/ghost-space');
	return { user: fresh };
}
clientLoader.hydrate = true as const;

export function HydrateFallback() {
	return <main className="rail loading-state" style={{ minHeight: '60vh' }}>Loading admin…</main>;
}

export default function Admin() {
	return <AdminDashboard />;
}
