import { Link } from 'react-router';
import { ArrowUpRight, FlaskConical, ShieldCheck } from 'lucide-react';
import { showcaseWork } from '@/data/library-showcases';
import { kindLabels, tagsOf } from '@/lib/network';

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
    <ul className="lgn-showcase-grid">{examples.map(item=><li key={item.id}>
      <Link className="lgn-showcase-card" to={`/work/${item.id}`}>
        <span className="eyebrow">{kindLabels[item.kind]}</span>
        <h3>{item.title} <ArrowUpRight size={17} aria-hidden="true"/></h3>
        <p>{item.summary}</p>
        <div className="tags">{tagsOf(item.tags).map(tag=><span key={tag}>{tag}</span>)}</div>
      </Link>
    </li>)}</ul>
  </section>;
}
