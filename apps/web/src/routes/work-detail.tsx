import { useState } from 'react';
import type { Route } from './+types/work-detail';
import { seo } from '@/lib/seo';
import { getWork, getTranslations, getRelatedWork, getRelatedByDomain, getContributorCount } from '@/lib/network.server';
import { Article } from '@/components/work/article';
import { WorkHeading } from '@/components/work/work-heading';
import { TranslateBar } from '@/components/work/translate-bar';
import type { Translation, Work } from '@/lib/network';

export async function loader({ params }: Route.LoaderArgs) {
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
  return { work, translations, related, networkRelated, contributorCount };
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
  const { work, translations, related, networkRelated, contributorCount } = loaderData;
  const [activeTranslation, setActiveTranslation] = useState<Translation | null>(null);
  // The original publication is authoritative. A translation only overrides the
  // prose fields (title/summary/body); code and all technical artifacts stay
  // verbatim from the original `work`.
  const displayWork = activeTranslation
    ? { ...work, title: activeTranslation.title, summary: activeTranslation.summary, body: activeTranslation.body }
    : work;
  return (
    <main>
      <WorkHeading work={displayWork} />
      <TranslateBar work={work} translations={translations} active={activeTranslation} onSelect={setActiveTranslation} />
      <Article work={displayWork} translation={activeTranslation} related={related} networkRelated={networkRelated} contributorCount={contributorCount} />
    </main>
  );
}
