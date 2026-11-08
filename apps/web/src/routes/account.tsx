import { redirect } from 'react-router';
export function clientLoader() { throw redirect('/ghost-space?section=profile'); }
clientLoader.hydrate = true as const;
export function HydrateFallback() { return <main className="rail loading-state">Opening Ghost Space…</main>; }
export default function Account() { return <main className="rail loading-state">Opening Ghost Space…</main>; }
