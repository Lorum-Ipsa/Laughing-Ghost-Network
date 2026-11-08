import type { Route } from './+types/code';
import { seo } from '@/lib/seo';
import { PageHeading } from '@/components/page-heading';
import { Conduct } from '@/components/code/conduct';
export function meta({ matches, location }: Route.MetaArgs) { return seo({ matches, location }, { title: 'Code — Our ethical framework | LGN', description: 'The code of conduct of Laughing Ghost Network: authorized scopes, respect for pseudonyms, responsible disclosure, honest representation, AI disclosure, transparent translation, reviewer conflicts, and proportional moderation.' }); }
export default function Code() { return <main><PageHeading title="Code" number="08" eyebrow="Our shared framework / version 1.0" description="A technical practice requires an ethical framework. These commitments protect people, work, and the trust of the network."/><Conduct/></main>; }
