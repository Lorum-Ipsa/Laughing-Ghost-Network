import { Link } from 'react-router';
import { ArrowUpRight } from 'lucide-react';
const steps = [
  { title: 'Link the work you already have', body: 'GitHub, Hack The Box, CyberDefenders, blogs, research repositories, conference talks, personal websites — bring it under one handle.' },
  { title: 'Publish new work', body: 'Research, detections, tools, writeups, and projects that others can inspect and reuse.' },
  { title: 'Collaborate with other Ghosts', body: 'Join projects and Table Talks. Compare methods, not egos.' },
  { title: 'Build a public record', body: 'A persistent, attributable history of what you actually do.' }
];
export function NetworkStory() { return <section className="network-story rail section-space"><div className="eyebrow">04 / THE NETWORK</div><h2>One identity for your<br/>cybersecurity work.</h2><p className="network-story-lede">Cybersecurity work is often scattered across GitHub, Hack The Box, CyberDefenders, blogs, research repositories, conference talks, and personal websites. Laughing Ghost gives that work one persistent identity.</p><div className="network-steps">{steps.map((step, i) => <div className="network-step" key={step.title}><span className="mono network-step-index">0{i + 1}</span><div><h3>{step.title}</h3><p>{step.body}</p></div></div>)}</div><p className="network-reciprocity">The network gives the individual visibility.<br/>The individual’s work gives the network credibility.</p><Link className="text-link" to="/about" style={{ marginTop: 26 }}>Read the network story <ArrowUpRight size={16}/></Link></section>; }
