import { redirect } from 'react-router';
export function clientLoader() { throw redirect('/ghost-space'); }
clientLoader.hydrate = true as const;
export function HydrateFallback() { return <main className="rail loading-state">Opening Ghost Space…</main>; }
/** Admin workflows remain disabled until their Supabase permissions are migrated. */
export default function Admin() { return <main className="rail loading-state">Admin migration pending.</main>; }
