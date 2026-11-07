import type { Route } from './+types/home';
import { seo } from '@/lib/seo';
import { getPublicGhosts, getPublicWork } from '@/lib/network.server';
import { Hero } from '@/components/home/hero';
import { Principles } from '@/components/home/principles';
import { RecentWork } from '@/components/home/recent-work';
import { GhostsPreview } from '@/components/home/ghosts-preview';
import { TableTalks } from '@/components/home/table-talks';
import { NetworkStory } from '@/components/home/network-story';
import { FinalCta } from '@/components/home/final-cta';
export function meta({ matches, location }: Route.MetaArgs) { return seo({ matches, location }, { title: 'Laughing Ghost Network — The work is public', description: 'A cybersecurity network for practitioners who want their work—not their popularity—to define their reputation. Pseudonymous identities, demonstrated skill, and public contributions.', jsonLd: { '@context': 'https://schema.org', '@type': 'Organization', name: 'Laughing Ghost Network', slogan: 'Open Network. Private Identities. Public Work.' } }); }
export async function loader() { const [profiles, work] = await Promise.all([getPublicGhosts(), getPublicWork()]); return { profiles, work }; }
export default function HomePage({ loaderData }: Route.ComponentProps) { return <main><Hero/><Principles/><RecentWork work={loaderData.work}/><GhostsPreview profiles={loaderData.profiles}/><TableTalks/><NetworkStory/><FinalCta/></main>; }
