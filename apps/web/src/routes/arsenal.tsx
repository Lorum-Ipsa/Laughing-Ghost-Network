import type { Route } from './+types/arsenal';
import { seo } from '@/lib/seo';
import { publicSupabaseWork } from '@/lib/supabase-public.server';
import { librarySections } from '@/data/navigation';
import { ARSENAL_KINDS } from '@/data/arsenal';
import { LibraryShowcase } from '@/components/library-showcase';
import { PageHeading } from '@/components/page-heading';
import { ArsenalLibrary } from '@/components/arsenal/arsenal-library';
const section = librarySections.arsenal;
export function meta({ matches, location }: Route.MetaArgs) { return seo({ matches, location }, { title: 'Arsenal — Cybersecurity artifact repository | LGN', description: 'Operational artifacts for cybersecurity work: detection rules, hunting and SIEM queries, YARA/Sigma rules, tools, scripts, datasets, playbooks, hardening guides, and more—with context, limitations, and provenance.', jsonLd: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Arsenal — Laughing Ghost Network' } }); }
export async function loader() {
  const allWork = await publicSupabaseWork();
  const arsenalKinds = new Set(ARSENAL_KINDS as readonly string[]);
  return { work: allWork.filter((work) => arsenalKinds.has(work.kind)), allWork };
}
export default function Arsenal({ loaderData }: Route.ComponentProps) { return <main><PageHeading {...section} action={{ to: '/contribute', label: 'Propose an artifact' }}/><LibraryShowcase library="arsenal"/><ArsenalLibrary work={loaderData.work} allWork={loaderData.allWork}/></main>; }
