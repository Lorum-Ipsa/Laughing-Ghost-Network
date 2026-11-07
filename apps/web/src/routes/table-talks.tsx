import type { Route } from './+types/table-talks';
import { seo } from '@/lib/seo';
import { getPublicWork } from '@/lib/network.server';
import { librarySections } from '@/data/navigation';
import { PageHeading } from '@/components/page-heading';
import { TableTalksLibrary } from '@/components/table-talks/table-talks-library';

const section = librarySections['table-talks'];

export function meta({ matches, location }: Route.MetaArgs) {
  return seo({ matches, location }, {
    title: 'Table Talks — Practice, compare, learn | LGN',
    description: 'A cybersecurity practice environment for decision-making. Tabletop exercises, incident simulations, and threat-hunting scenarios built around judgment, tradeoffs, and collaborative reasoning. No rankings — only a debrief.',
    jsonLd: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Table Talks — Laughing Ghost Network' },
  });
}

export async function loader() {
  return { work: (await getPublicWork()).filter(work => (section.kinds as readonly string[]).includes(work.kind)) };
}

export default function TableTalks({ loaderData }: Route.ComponentProps) {
  return (
    <main>
      <PageHeading {...section} action={{ to: '/contribute', label: 'Propose an exercise' }} />
      <TableTalksLibrary work={loaderData.work} />
    </main>
  );
}
