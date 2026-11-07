import type { Route } from './+types/join';
import { seo } from '@/lib/seo';
import { PageHeading } from '@/components/page-heading';
import { JoinIntro } from '@/components/join/join-intro';
import { IdentityForm } from '@/components/join/identity-form';
export function meta({ matches, location }: Route.MetaArgs) { return seo({ matches, location }, { title: 'Join — Become a Ghost | LGN', description: 'Join Laughing Ghost Network under a persistent pseudonym. Anyone who accepts the Code can create a Ghost identity — no prior work required. Build your first public contribution here.' }); }
export default function Join() { return <main><PageHeading title="Join" number="07" eyebrow="No name required. Curiosity is." description="Build a persistent cybersecurity identity around the work you do and the work you want to do."/><div className="form-layout rail"><JoinIntro/><IdentityForm/></div></main>; }
