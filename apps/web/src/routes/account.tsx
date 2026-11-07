import type { Route } from './+types/account';
import { seo } from '@/lib/seo';
import { requireAuth } from '@/lib/require-auth';
import { PageHeading } from '@/components/page-heading';
import { Dashboard } from '@/components/account/dashboard';
export function meta({ matches, location }: Route.MetaArgs) { return seo({ matches, location }, { title: 'My space — Identity and work | LGN', description: 'Your private Ghost space: manage your public profile, your contributions, your application, and your participation proposals to the network.', noindex: true }); }
export function clientLoader() { return { user: requireAuth() }; }
clientLoader.hydrate = true as const;
export function HydrateFallback() { return <main className="rail loading-state" style={{ minHeight: '60vh' }}>Loading your private space…</main>; }
export default function Account() { return <main><PageHeading title="My space" number="00" eyebrow="Private identity / persistent responsibility" description="Your profile is public. Your applications, proposals, and pending contributions remain private." action={{ to: '/contribute', label: 'Share work' }}/><Dashboard/></main>; }
