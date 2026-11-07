import type { Route } from './+types/ghosts';
import { seo } from '@/lib/seo';
import { getDirectoryGhosts } from '@/lib/network.server';
import { publicSupabaseDirectory } from '@/lib/supabase-public.server';
import { PageHeading } from '@/components/page-heading';
import { Directory } from '@/components/ghosts/directory';
export function meta({ matches, location }: Route.MetaArgs) { return seo({ matches, location }, { title: 'Search the Network — Cybersecurity practitioner & knowledge search | LGN', description: 'A searchable map of cybersecurity capability. Find practitioners, skills, tools, platforms, industries, and proven contributions across the whole field — not popularity.', jsonLd: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Search the Network — Laughing Ghost Network' } }); }
export async function loader() {
  const [legacy, current] = await Promise.all([getDirectoryGhosts(),publicSupabaseDirectory()]);
  const handles = new Set(current.map(g=>g.profile.handle));
  // New member identity wins if a stale PocketBase profile shares the handle.
  return {ghosts:[...current,...legacy.filter(g=>!handles.has(g.profile.handle))]};
}
export default function Ghosts({ loaderData }: Route.ComponentProps) { return <main><PageHeading number="01" title="Search the Network" eyebrow="People. Knowledge. Tools. Work." description="A pseudonym does not hide skills. It lets the work demonstrate them. Search across the whole cybersecurity field — specialties, skills, tools, platforms, industries, contributions, languages, and locations." action={{ to: '/join', label: 'Become a Ghost' }}/><Directory ghosts={loaderData.ghosts}/></main>; }
