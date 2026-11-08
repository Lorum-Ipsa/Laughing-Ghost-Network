import type { Route } from './+types/table-talks';
import { publicSupabaseTableTalks } from '@/lib/supabase-public.server';
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
  const [talks,legacy]=await Promise.all([
    publicSupabaseTableTalks(),getPublicWork().catch(()=>null),
  ]);
  return {
    talks,work:(legacy??[]).filter(work=>(section.kinds as readonly string[]).includes(work.kind)),
    legacyUnavailable:legacy===null,
  };
}

export default function TableTalks({ loaderData }: Route.ComponentProps) {
  return (
    <main>
      <PageHeading {...section} />
      <section className="rail">
        <h2>Community exercises</h2>
        {loaderData.talks.length===0&&<p>No published exercises in the new workspace yet.</p>}
        <ul className="gs-card-list">{loaderData.talks.map(talk=><li className="dashboard-panel" key={talk.id}>
          <h3>{talk.title}</h3><p>{talk.summary}</p><p>{talk.status.replaceAll('_',' ')}</p>
          {talk.scheduled_at&&<p><time dateTime={talk.scheduled_at}>
            {new Date(talk.scheduled_at).toLocaleString('en-US',{timeZone:'UTC',timeZoneName:'short'})}
          </time></p>}
        </li>)}</ul>
      </section>
      {loaderData.legacyUnavailable&&<p className="rail" role="status">The historical exercise library is temporarily unavailable.</p>}
      <TableTalksLibrary work={loaderData.work} />
    </main>
  );
}
