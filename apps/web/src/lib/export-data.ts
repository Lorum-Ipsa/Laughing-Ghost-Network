import { pocketbaseClient as pb } from '@/lib/pocketbase-client';

/**
 * Member data export. Gathers every record the signed-in member owns across
 * the network — profile, contributions, participations, applications, reports,
 * notifications, external identities, and content revisions — and downloads it
 * as a single JSON file. This keeps members from being trapped in the platform:
 * their data is portable at any time.
 *
 * Runs entirely client-side because the auth token lives in localStorage,
 * which the server cannot read. Each collection is read under its owner-scoped
 * access rule, so only the member's own records are returned.
 */
export async function exportMyData(): Promise<void> {
  const record = pb.authStore.record;
  const userId = record?.id;
  if (!userId) {
    throw new Error('Sign in to export your data.');
  }

  const filter = pb.filter('owner = {:id}', { id: userId });
  const [
    profiles,
    work,
    participations,
    applications,
    reports,
    notifications,
    identities,
    revisions,
  ] = await Promise.all([
    pb.collection('ghost_profiles').getFullList({ filter, requestKey: 'exp-profiles' }),
    pb.collection('ghost_work').getFullList({ filter, sort: '-created', requestKey: 'exp-work' }),
    pb.collection('ghost_participations').getFullList({ filter, requestKey: 'exp-part' }),
    pb.collection('ghost_applications').getFullList({ filter, requestKey: 'exp-app' }),
    pb.collection('ghost_reports').getFullList({ filter, requestKey: 'exp-rep' }),
    pb.collection('ghost_notifications').getFullList({ filter, sort: '-created', requestKey: 'exp-notif' }),
    pb.collection('ghost_external_identities').getFullList({ filter, requestKey: 'exp-id' }),
    pb.collection('ghost_revisions').getFullList({ filter, sort: '-created', requestKey: 'exp-rev' }),
  ]);

  const email = (record as { email?: string } | null)?.email ?? '';

  const data = {
    exportedAt: new Date().toISOString(),
    network: 'Laughing Ghost Network',
    account: { id: userId, email },
    profiles,
    work,
    participations,
    applications,
    reports,
    notifications,
    externalIdentities: identities,
    revisions,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `laughing-ghost-export-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
