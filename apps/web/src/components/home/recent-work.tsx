import { Link } from 'react-router';
import { ArrowUpRight } from 'lucide-react';
import { WorkCard } from '@/components/work-card';
import type { Work } from '@/lib/network';
export function RecentWork({ work }: { work: Work[] }) {
  const chosen = [work.find(item => item.kind === 'detection'), work.find(item => item.kind === 'research'), work.find(item => item.kind === 'writeup')].filter((item): item is Work => Boolean(item));
  return <section id="contributions" className="recent-work rail section-space"><div className="eyebrow">01 / PROOF OF WORK</div><div className="section-heading"><div><h2>The work speaks.</h2><p>Research, detections, tools, investigations, and technical writeups. Concrete work, publicly accessible, attributable to the Ghost who created it.</p></div><Link className="text-link" to="/research">Explore contributions <ArrowUpRight size={16}/></Link></div><div className="work-grid">{chosen.map(item => <WorkCard key={item.id} work={item}/>)}</div>{!chosen.length && <p className="empty-state">The first contributions are coming. <Link to="/join">Propose yours.</Link></p>}<p className="sample-note">Demo artifacts and profiles are marked “Example.” They illustrate the network’s format.</p></section>;
}
