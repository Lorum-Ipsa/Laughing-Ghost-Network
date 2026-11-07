import type { Route } from './+types/about';
import { seo } from '@/lib/seo';
import { PageHeading } from '@/components/page-heading';
import { NetworkStory } from '@/components/about/network-story';
export function meta({ matches, location }: Route.MetaArgs) { return seo({ matches, location }, { title: 'About — A collective, not a showcase | LGN', description: 'The principles of Laughing Ghost Network: persistent pseudonymous identities, public work, independent collaboration, and ethical cybersecurity.' }); }
export default function About() { return <main><PageHeading title="About" number="06" eyebrow="Independent by choice. Ethical by principle." description="Why this network exists, what connects us, and what we choose not to become."/><NetworkStory/></main>; }
