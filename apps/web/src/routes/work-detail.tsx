import { useState } from 'react';
import { Link } from 'react-router';
import type { Route } from './+types/work-detail';
import { showcaseWork } from '@/data/library-showcases';
import { seo } from '@/lib/seo';
import { publicSupabaseContribution, publicSupabaseMaterials, publicWorkByProfile } from '@/lib/supabase-public.server';
import { Article } from '@/components/work/article';
import { WorkHeading } from '@/components/work/work-heading';
import { TranslateBar } from '@/components/work/translate-bar';
import type { Translation } from '@/lib/network';

const isSupabaseId = (id:string) => /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id);

export async function loader({ params }: Route.LoaderArgs) {
  const example=showcaseWork.find(item=>item.id===params.id);
  if (example) return { work: example, translations: [], attachments: [], related: showcaseWork.filter(item => item.author === example.author && item.id !== example.id), networkRelated: [], contributorCount: 0 };
  if (!isSupabaseId(params.id)) throw new Response('Contribution not found', { status: 404 });
  const work = await publicSupabaseContribution(params.id);
  if (!work) throw new Response('Contribution not found', { status: 404 });
  const [{ translations, attachments }, related] = await Promise.all([
    publicSupabaseMaterials(work.id, Number(work.version)),
    work.expand?.author ? publicWorkByProfile(work.expand.author) : Promise.resolve([]),
  ]);
  return { work, translations, attachments, related: related.filter(item => item.id !== work.id), networkRelated: [], contributorCount: 0 };
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
  const [selection,setSelection]=useState<{translation:Translation;version:typeof work.version}|null>(null);
  const activeTranslation=selection?.translation.work===work.id&&selection.version===work.version?selection.translation:null;
  // The original publication is authoritative. A translation only overrides the
  // prose fields (title/summary/body); code and all technical artifacts stay
  // verbatim from the original `work`.
  const displayWork = activeTranslation
    ? { ...work, title: activeTranslation.title, summary: activeTranslation.summary, body: activeTranslation.body }
    : work;
  return (
    <main>
      <WorkHeading work={displayWork} />
      <TranslateBar key={work.id+':'+work.version} work={work} translations={translations} active={activeTranslation}
        onSelect={item=>setSelection(item?{translation:item,version:work.version}:null)} />
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
