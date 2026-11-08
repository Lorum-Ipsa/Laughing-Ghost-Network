import type { Route } from './+types/arsenal';
import { seo } from '@/lib/seo';
import { publicWork } from '@/lib/supabase-public.server';
import { librarySections } from '@/data/navigation';
import { ARSENAL_KINDS } from '@/data/arsenal';
import { PageHeading } from '@/components/page-heading';
import { ArsenalLibrary } from '@/components/arsenal/arsenal-library';
const section = librarySections.arsenal;
export function meta({ matches, location }: Route.MetaArgs) { return seo({ matches, location }, { title: 'Arsenal — Cybersecurity artifact repository | LGN', description: 'Operational artifacts for cybersecurity work: detection rules, hunting and SIEM queries, YARA/Sigma rules, tools, scripts, datasets, playbooks, hardening guides, and more—with context, limitations, and provenance.', jsonLd: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Arsenal — Laughing Ghost Network' } }); }
export async function loader() {
  const allWork = (await publicWork()).sort((a, b) => b.created.localeCompare(a.created));
  const arsenalKinds = new Set(ARSENAL_KINDS as readonly string[]);
  return { work: allWork.filter((work) => arsenalKinds.has(work.kind)), allWork };
}
export default function Arsenal({ loaderData }: Route.ComponentProps) { return <main><PageHeading {...section}/><ArsenalLibrary work={loaderData.work} allWork={loaderData.allWork}/></main>; }
