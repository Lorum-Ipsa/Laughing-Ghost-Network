import type { Route } from './+types/projects';
import { Link } from 'react-router';
import { publicSupabaseProjects } from '@/lib/supabase-public.server';
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
  const [projects, legacy] = await Promise.all([
    publicSupabaseProjects(),
    Promise.all([getPublicWork(),getProjectContributorCounts()]).catch(()=>null),
  ]);
  const [allWork,contributorCounts]=legacy??[[],{}];
  const kinds = new Set(PROJECT_KINDS as readonly string[]);
  const work = allWork.filter((item) => kinds.has(item.kind));
  return { projects, work, contributorCounts, legacyUnavailable:legacy===null };
}

export default function Projects({ loaderData }: Route.ComponentProps) {
  return (
    <main>
      <PageHeading
        number="04"
        eyebrow="BUILD TOGETHER"
        title="Projects"
        description="Open workstreams, concrete deliverables, and community contributions. Find a topic, propose a method, build with other Ghosts."
        action={{ to: '/ghost-space?section=projects', label: 'Start a project' }}
      />
      <section className="rail">
        <h2>Community projects</h2>
        {loaderData.projects.length===0&&<p>No public projects in the new workspace yet.</p>}
        <ul className="gs-card-list">{loaderData.projects.map(project=><li className="dashboard-panel" key={project.id}>
          <h3>{project.title}</h3>
          <p>{project.summary}</p>
          <p>{project.status==='completed'?'Completed':project.recruiting?'Recruiting':'Active'}</p>
          {project.roles.length>0&&<p>Open roles · {project.roles.map(role=>role.title).join(', ')}</p>}
          <Link to={`/ghost-space?section=projects&project=${project.id}`}>
            {project.status==='active'&&project.recruiting?'Open project and request to join':'Open project in Ghost Space'}
          </Link>
        </li>)}</ul>
      </section>
      {loaderData.legacyUnavailable&&<p className="rail" role="status">The historical Projects library is temporarily unavailable.</p>}
      <ProjectsLibrary work={loaderData.work} contributorCounts={loaderData.contributorCounts} />
    </main>
  );
}
