import type { Route } from './+types/projects';
import { publicSupabaseProjects, publicWork } from '@/lib/supabase-public.server';
import { seo } from '@/lib/seo';
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
  const [projects, allWork] = await Promise.all([publicSupabaseProjects(), publicWork()]);
  const kinds = new Set(PROJECT_KINDS as readonly string[]);
  return { projects, work: allWork.filter(item => kinds.has(item.kind)) };
}

export default function Projects({ loaderData }: Route.ComponentProps) {
  return (
    <main>
      <PageHeading
        number="04"
        eyebrow="BUILD TOGETHER"
        title="Projects"
        description="Open workstreams, concrete deliverables, and community contributions. Find a topic, propose a method, build with other Ghosts."
      />
      <section className="rail">
        <h2>Community projects</h2>
        {loaderData.projects.length===0&&<p>No member projects have been published yet.</p>}
        <ul className="gs-card-list">{loaderData.projects.map(project=><li className="dashboard-panel" key={project.id}>
          <h3>{project.title}</h3>
          <p>{project.summary}</p>
          <p>{project.status==='completed'?'Completed':project.recruiting?'Recruiting':'Active'}</p>
          {project.roles.length>0&&<p>Open roles · {project.roles.map(role=>role.title).join(', ')}</p>}
        </li>)}</ul>
      </section>
      <ProjectsLibrary work={loaderData.work} contributorCounts={{}} />
    </main>
  );
}
