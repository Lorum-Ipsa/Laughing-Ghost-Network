import type { Route } from './+types/ghost-profile';
import { seo } from '@/lib/seo';
import { getGhost, getPublicWork } from '@/lib/network.server';
import { PageHeading } from '@/components/page-heading';
import { Profile } from '@/components/ghosts/profile';
import { BackToGhostSpace } from '@/components/ghosts/back-to-ghost-space';
export async function loader({ params }: Route.LoaderArgs) { const profile = await getGhost(params.handle); return { profile, work: (await getPublicWork()).filter(work => work.author === profile.id) }; }
export function meta({ matches, location, loaderData }: Route.MetaArgs) { return seo({ matches, location }, { title: `${loaderData?.profile.handle || 'Ghost'} — Profile and contributions | LGN`, description: `Discover the pseudonymous profile of ${loaderData?.profile.handle || 'this Ghost'}, their specialties and proofs of work: research, detections, writeups, and public projects.`, jsonLd: { '@context': 'https://schema.org', '@type': 'ProfilePage', mainEntity: { '@type': 'Person', name: loaderData?.profile.handle || 'Ghost' } } }); }
export default function GhostProfile({ loaderData }: Route.ComponentProps) { return <main><PageHeading title={loaderData.profile.handle} eyebrow="Ghost / persistent pseudonymous identity" number="01" description={loaderData.profile.specialties}/><BackToGhostSpace /><Profile profile={loaderData.profile} work={loaderData.work}/></main>; }
