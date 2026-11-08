import type { Route } from './+types/ghosts';
import { seo } from '@/lib/seo';
import { publicDirectory } from '@/lib/supabase-public.server';
import { PageHeading } from '@/components/page-heading';
import { Directory } from '@/components/ghosts/directory';
export function meta({ matches, location }: Route.MetaArgs) { return seo({ matches, location }, { title: 'Search the Network — Cybersecurity practitioner & knowledge search | LGN', description: 'A searchable map of cybersecurity capability. Find practitioners, skills, tools, platforms, industries, and proven contributions across the whole field — not popularity.', jsonLd: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Search the Network — Laughing Ghost Network' } }); }
export async function loader() {
  return { ghosts: await publicDirectory() };
}
export default function Ghosts({ loaderData }: Route.ComponentProps) { return <main><PageHeading number="01" title="Search the Network" eyebrow="People. Knowledge. Tools. Work." description="A pseudonym does not hide skills. It lets the work demonstrate them. Search across the whole cybersecurity field — specialties, skills, tools, platforms, industries, contributions, languages, and locations." action={{ to: '/join', label: 'Become a Ghost' }}/><Directory ghosts={loaderData.ghosts}/></main>; }
