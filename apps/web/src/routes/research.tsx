import type { Route } from './+types/research';
import { seo } from '@/lib/seo';
import { publicSupabaseWork } from '@/lib/supabase-public.server';
import { librarySections } from '@/data/navigation';
import { RESEARCH_KINDS } from '@/data/research';
import { LibraryShowcase } from '@/components/library-showcase';
import { PageHeading } from '@/components/page-heading';
import { ResearchLibrary } from '@/components/research/research-library';

const section = librarySections.research;

export function meta({ matches, location }: Route.MetaArgs) {
  return seo({ matches, location }, {
    title: 'Research — Research and analysis from across cybersecurity | LGN',
    description: 'Research and analysis from across cybersecurity. Methods documented. Results reproducible. Limitations explicit. Search by topic, technique, tool, CVE, ATT&CK ID, author, or keyword.',
    jsonLd: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Research — Laughing Ghost Network' },
  });
}

export async function loader() {
  const allWork = await publicSupabaseWork();
  const kinds = new Set(RESEARCH_KINDS);
  const work = allWork.filter((item) => kinds.has(item.kind));
  return { work, allWork };
}

export default function Research({ loaderData }: Route.ComponentProps) {
  return (
    <main>
      <PageHeading {...section} />
      <LibraryShowcase library="research"/><ResearchLibrary work={loaderData.work} allWork={loaderData.allWork} />
    </main>
  );
}
