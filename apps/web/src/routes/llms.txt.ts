import type { Route } from './+types/llms.txt';
import { siteOrigin } from '@/lib/site-origin.server';
import { publicGhosts, publicWork } from '@/lib/supabase-public.server';
import { ghostProfilePath } from '@/lib/ghost-handle';
export async function loader({ request }: Route.LoaderArgs) {
  const origin = siteOrigin(request); const [profiles, work] = await Promise.all([publicGhosts(), publicWork()]);
  const lines = ['# Laughing Ghost Network', '', '> An independent cybersecurity collective: persistent pseudonymous identities and skills demonstrated through public work.', '', 'Open Network. Private Identities. Public Work.', '', 'Profiles and artifacts marked Example are fictional or educational demonstrations, not contributions from real members.', '', '## Explore', ...[['Ghosts', '/ghosts'], ['Research', '/research'], ['Arsenal', '/arsenal'], ['Projects', '/projects'], ['Table Talks', '/table-talks'], ['About', '/about'], ['Code of conduct', '/code'], ['Contact', '/contact'], ['Join', '/join']].map(([name, path]) => `- [${name}](${origin}${path})`), '', '## Public profiles', ...profiles.map(profile => `- [${profile.handle}](${origin}${ghostProfilePath(profile.handle, profile.example)}): ${profile.specialties}${profile.example ? ' — Fictional example.' : ''}`), '', '## Public contributions', ...work.map(item => `- [${item.title.replaceAll('\n', ' ')}](${origin}/work/${item.id}): ${item.summary.replaceAll('\n', ' ')}${item.example ? ' — Educational example.' : ''}`)];
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}
