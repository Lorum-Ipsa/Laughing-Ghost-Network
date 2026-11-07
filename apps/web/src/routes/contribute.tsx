import type { Route } from './+types/contribute';
import { seo } from '@/lib/seo';
import { requireAuth } from '@/lib/require-auth';
import { PageHeading } from '@/components/page-heading';
import { ContributionForm } from '@/components/account/contribution-form';
import { ContributionIntro } from '@/components/account/contribution-intro';
export function meta({ matches, location }: Route.MetaArgs) { return seo({ matches, location }, { title: 'Contribute — Document your work | LGN', description: 'Submit research, a detection rule, a tool, or an exercise. Present your method and its limitations for review before publication.', noindex: true }); }
export function clientLoader() { return { user: requireAuth() }; }
clientLoader.hydrate = true as const;
export function HydrateFallback() { return <main className="rail loading-state" style={{ minHeight: '60vh' }}>Loading your private space…</main>; }
export default function Contribute() { return <main><PageHeading title="Contribute" number="09" eyebrow="Your work is your signature" description="Research, a detection, a tool, a project, or an exercise debrief. Document, submit, then get reviewed."/><div className="form-layout rail"><ContributionIntro/><ContributionForm/></div></main>; }
