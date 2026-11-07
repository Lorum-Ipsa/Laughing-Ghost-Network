import { Link } from 'react-router';
import type { Route } from './+types/not-found';
import { seo } from '@/lib/seo';
export function loader() { throw new Response('Page not found', { status: 404 }); }
export function meta({ matches, location }: Route.MetaArgs) { return seo({ matches, location }, { title: 'Page not found | Laughing Ghost Network', description: 'This page does not exist or is no longer available. Find the research, Ghosts, and projects of Laughing Ghost Network from the home page.', noindex: true }); }
export default function NotFound() { return <main className="rail section-space" style={{ minHeight: '60vh' }}><h1>This Ghost is not here.</h1><p className="muted-note" style={{ marginTop: 20 }}>The requested page could not be found.</p><Link className="button button-outline" to="/" style={{ marginTop: 25 }}>Back to home ↗</Link></main>; }
