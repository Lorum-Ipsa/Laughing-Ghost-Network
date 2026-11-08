import { WorkCard } from '@/components/work-card';
import { showcaseWork } from '@/data/library-showcases';

export function LibraryShowcase({library}:{library:'research'|'arsenal'}){
  const research=library==='research';
  const examples=showcaseWork.filter(item=>research
    ?item.kind==='research'||item.kind==='writeup':item.kind==='detection'||item.kind==='tool');
  return <section className="rail lgn-showcase" aria-label={research ? "Research posts" : "Arsenal posts"}>
    <div className="lgn-library-grid">{examples.map(item=><WorkCard key={item.id} work={item} panel />)}</div>
  </section>;
}
