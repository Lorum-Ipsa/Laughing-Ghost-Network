import { WorkCard } from '@/components/work-card';
import { FlaskConical, ShieldCheck } from 'lucide-react';
import { showcaseWork } from '@/data/library-showcases';

export function LibraryShowcase({library}:{library:'research'|'arsenal'}){
  const research=library==='research';
  const Icon=research?FlaskConical:ShieldCheck;
  const examples=showcaseWork.filter(item=>research
    ?item.kind==='research'||item.kind==='writeup':item.kind==='detection'||item.kind==='tool');
  return <section className="rail lgn-showcase" aria-labelledby="library-showcase-heading">
    <div className="lgn-showcase-heading">
      <Icon size={25} aria-hidden="true"/>
      <div><span className="eyebrow">EDUCATIONAL EXAMPLES</span>
        <h2 id="library-showcase-heading">{research?'Research showcase':'Arsenal showcase'}</h2>
        <p>{research?'Explore examples of a research method and an investigation writeup.':'Inspect a sample detection and a lab utility before browsing member artifacts.'}</p>
      </div>
    </div>
    <div className="lgn-library-grid">{examples.map(item=><WorkCard key={item.id} work={item} panel />)}</div>
  </section>;
}
