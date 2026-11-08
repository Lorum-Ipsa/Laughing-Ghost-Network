import { useState } from 'react';
import { Link } from 'react-router';
import type { Route } from './+types/work-detail';
import { seo } from '@/lib/seo';
import { getWork, getTranslations, getRelatedWork, getRelatedByDomain, getContributorCount } from '@/lib/network.server';
import { publicSupabaseContribution, publicSupabaseMaterials } from '@/lib/supabase-public.server';
import { Article } from '@/components/work/article';
import { WorkHeading } from '@/components/work/work-heading';
import { TranslateBar } from '@/components/work/translate-bar';
import type { Work } from '@/lib/network';

const isSupabaseId = (id:string) => /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id);

export async function loader({ params }: Route.LoaderArgs) {
  // Supabase IDs must never fall through to PocketBase, including after deletion.
  if (isSupabaseId(params.id)) {
    const work=await publicSupabaseContribution(params.id);
    if(!work)throw new Response('Contribution not found', {status:404});
    const {translations,attachments}=await publicSupabaseMaterials(work.id,Number(work.version));
    return {work,translations,attachments,related:[],networkRelated:[],contributorCount:0};
  }
  const work = await getWork(params.id);
  const isProject = work.kind === 'project';
  const isExercise = work.kind === 'exercise';
  const fetchRelated = isProject || isExercise;
  const [translations, related, networkRelated, contributorCount] = await Promise.all([
    getTranslations(params.id),
    getRelatedWork(work.author, work.id),
    fetchRelated ? getRelatedByDomain(work) : Promise.resolve([]),
    (isProject || isExercise) ? getContributorCount(params.id) : Promise.resolve(0),
  ]);
  return { work, translations, attachments:[], related, networkRelated, contributorCount };
}
export function meta({ matches, location, loaderData }: Route.MetaArgs) {
  return seo({ matches, location }, {
    title: `${loaderData?.work.title || 'Contribution'} | LGN`,
    description: loaderData?.work.summary || 'Browse the public contributions of Laughing Ghost Network.',
    type: 'article',
    jsonLd: { '@context': 'https://schema.org', '@type': 'Article', headline: loaderData?.work.title, author: { '@type': 'Person', name: loaderData?.work.expand?.author?.handle }, inLanguage: loaderData?.work.language || 'en', datePublished: loaderData?.work.created.replace(' ', 'T'), dateModified: loaderData?.work.updated.replace(' ', 'T') },
  });
}

export default function WorkDetail({ loaderData }: Route.ComponentProps) {
  const { work, translations, attachments, related, networkRelated, contributorCount } = loaderData;
  const [translationId, setTranslationId] = useState<string|null>(null);
  const activeTranslation=translations.find(item=>item.id===translationId)??null;
  // The original publication is authoritative. A translation only overrides the
  // prose fields (title/summary/body); code and all technical artifacts stay
  // verbatim from the original `work`.
  const displayWork = activeTranslation
    ? { ...work, title: activeTranslation.title, summary: activeTranslation.summary, body: activeTranslation.body }
    : work;
  return (
    <main>
      <WorkHeading work={displayWork} />
      <TranslateBar work={work} translations={translations} active={activeTranslation} onSelect={item=>setTranslationId(item?.id??null)} />
      <Article work={displayWork} translation={activeTranslation} related={related} networkRelated={networkRelated} contributorCount={contributorCount} />
      {attachments.length>0&&<section className="rail">
        <h2>Text attachments</h2>
        <ul>{attachments.map(file=><li key={file.id}>
          <a href={`/work/${work.id}/attachments/${file.id}`}>{file.filename} · Download as text</a>
        </li>)}</ul>
      </section>}
      {isSupabaseId(work.id)&&<div className="rail"><Link to={`/code?report=${work.id}#report`} className="text-link">Report this contribution</Link></div>}
    </main>
  );
}
