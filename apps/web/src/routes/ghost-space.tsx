import type { Route } from './+types/ghost-space';
import { redirect } from 'react-router';
import { seo } from '@/lib/seo';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { SupabaseGhostSpaceDashboard } from '@/components/ghost-space/supabase-dashboard';

export function meta({ matches, location }: Route.MetaArgs) {
  return seo({ matches, location }, {
    title: 'Ghost Space — Your private workspace | LGN',
    description: 'Manage your verified Ghost identity and account.',
    noindex: true,
  });
}

// No member-specific HTML is rendered on the server. Auth is checked through
// Supabase in the browser and enforced by Row-Level Security in PostgreSQL.
export async function clientLoader() {
  try {
    const { data, error } = await supabaseBrowser().auth.getUser();
    if (error || !data.user) throw redirect('/login');
    if (!data.user.email_confirmed_at) throw redirect('/verify-email');
    return { userId: data.user.id };
  } catch (e) {
    if (e instanceof Response) throw e;
    throw redirect('/login');
  }
}
clientLoader.hydrate = true as const;
export function HydrateFallback() {
  return <main className="rail loading-state" style={{ minHeight: '60vh' }}>Checking your Ghost account…</main>;
}
export default function GhostSpace() {
  return <SupabaseGhostSpaceDashboard />;
}
