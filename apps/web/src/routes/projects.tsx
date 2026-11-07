import type { Route } from './+types/projects';
import { seo } from '@/lib/seo';
import { getPublicWork, getProjectContributorCounts } from '@/lib/network.server';
import { PROJECT_KINDS } from '@/data/projects';
import { PageHeading } from '@/components/page-heading';
import { ProjectsLibrary } from '@/components/projects/projects-library';

export function meta({ matches, location }: Route.MetaArgs) {
  return seo({ matches, location }, {
    title: 'Projects — Collaboration hub | LGN',
    description: 'Open workstreams, concrete deliverables, and community contributions. Find a project by status, specialty, skills needed, open roles, technologies, or maintainer — then join the work.',
    jsonLd: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Projects — Laughing Ghost Network' },
  });
}

export async function loader() {
  const [allWork, contributorCounts] = await Promise.all([
    getPublicWork(),
    getProjectContributorCounts(),
  ]);
  const kinds = new Set(PROJECT_KINDS as readonly string[]);
  const work = allWork.filter((item) => kinds.has(item.kind));
  return { work, contributorCounts };
}

export default function Projects({ loaderData }: Route.ComponentProps) {
  return (
    <main>
      <PageHeading
        number="04"
        eyebrow="BUILD TOGETHER"
        title="Projects"
        description="Open workstreams, concrete deliverables, and community contributions. Find a topic, propose a method, build with other Ghosts."
        action={{ to: '/contribute', label: 'Propose a project' }}
      />
      <ProjectsLibrary work={loaderData.work} contributorCounts={loaderData.contributorCounts} />
    </main>
  );
}
