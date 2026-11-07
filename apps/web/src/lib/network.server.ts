import PocketBase from 'pocketbase';
import { KIND_ORDER, kindLabels, locationTokens, tagsOf } from '@/lib/network';
import type { DirectoryGhost, GhostProfile, Translation, Work, WorkEvidence } from '@/lib/network';
import { pocketbaseAdmin } from '@/lib/pocketbase-client.server';
function publicClient() { const pb = new PocketBase(process.env.POCKETBASE_URL || 'http://localhost:8090'); pb.autoCancellation(false); return pb; }
export async function getPublicWork() { return publicClient().collection('ghost_work').getFullList<Work>({ filter: "status = 'published'", expand: 'author', sort: '-created' }); }
export async function getPublicGhosts() { return publicClient().collection('ghost_profiles').getFullList<GhostProfile>({ sort: 'handle' }); }
export async function getWork(id: string) { try { return await publicClient().collection('ghost_work').getOne<Work>(id, { expand: 'author' }); } catch (error) { if ((error as { status?: number }).status === 404) throw new Response('Contribution not found', { status: 404 }); throw error; } }
export async function getGhost(handle: string) { try { return await publicClient().collection('ghost_profiles').getFirstListItem<GhostProfile>(publicClient().filter('handle = {:handle}', { handle })); } catch (error) { if ((error as { status?: number }).status === 404) throw new Response('Ghost not found', { status: 404 }); throw error; } }
/** Reader-facing translations of a published work's prose. Empty until translations are produced. */
export async function getTranslations(workId: string) { try { return await publicClient().collection('ghost_translations').getFullList<Translation>({ filter: publicClient().filter('work = {:work}', { work: workId }), sort: 'created' }); } catch { return []; } }
/** Other published work by the same author, excluding the current piece — the network effect between artifacts. */
export async function getRelatedWork(authorId: string, excludeId: string): Promise<Work[]> { try { const pb = publicClient(); return await pb.collection('ghost_work').getFullList<Work>({ filter: pb.filter('author = {:author} && id != {:id} && status = "published"', { author: authorId, id: excludeId }), sort: '-created' }); } catch { return []; } }

/**
 * Network-wide related work: published contributions that share the project's
 * domain or any tag, excluding the project itself. Surfaces related research,
 * Arsenal artifacts, and Table Talks across the whole network — not just the
 * maintainer's own work.
 */
export async function getRelatedByDomain(work: Work): Promise<Work[]> {
  try {
    const pb = publicClient();
    const all = await pb.collection('ghost_work').getFullList<Work>({
      filter: pb.filter('id != {:id} && status = "published"', { id: work.id }),
      expand: 'author',
      sort: '-created',
    });
    const tags = new Set(tagsOf(work.tags).map((t) => t.toLowerCase()));
    return all.filter((item) => {
      if (work.domain && item.domain && item.domain === work.domain) return true;
      if (tags.size && tagsOf(item.tags).some((t) => tags.has(t.toLowerCase()))) return true;
      return false;
    }).slice(0, 12);
  } catch { return []; }
}

/**
 * Contributor counts per project, derived from `ghost_participations`. That
 * collection is owner/moderator-only, so the public client cannot read it; the
 * superuser client aggregates the counts server-side for the public directory.
 */
export async function getProjectContributorCounts(): Promise<Record<string, number>> {
  try {
    const res = await pocketbaseAdmin.listRecords<{ work: string }>('ghost_participations', { perPage: 500 });
    const counts: Record<string, number> = {};
    for (const p of res.items) counts[p.work] = (counts[p.work] || 0) + 1;
    return counts;
  } catch { return {}; }
}

/** Contributor count for a single work. */
export async function getContributorCount(workId: string): Promise<number> {
  try {
    const res = await pocketbaseAdmin.listRecords('ghost_participations', { perPage: 1, filter: `work = "${workId}"` });
    return res.totalItems;
  } catch { return 0; }
}

/**
 * Public directory entries: every profile enriched with its published-work
 * evidence counts and a search index that spans the profile fields AND the
 * member's contributions (titles, summaries, tags). This lets a search like
 * "Windows Sigma healthcare" find a Ghost through skills, work tags, and
 * industry combined — not just the bio.
 */
export async function getDirectoryGhosts(): Promise<DirectoryGhost[]> {
  const pb = publicClient();
  const [profiles, work] = await Promise.all([
    pb.collection('ghost_profiles').getFullList<GhostProfile>({ sort: 'handle' }),
    pb.collection('ghost_work').getFullList<Work>({ filter: "status = 'published'" }),
  ]);
  const workByAuthor = new Map<string, Work[]>();
  for (const item of work) {
    const list = workByAuthor.get(item.author) || [];
    list.push(item);
    workByAuthor.set(item.author, list);
  }
  const kinds = KIND_ORDER;
  return profiles.map((profile) => {
    const authorWork = workByAuthor.get(profile.id) || [];
    const evidence = kinds.reduce((acc, kind) => {
      acc[kind] = authorWork.filter((item) => item.kind === kind).length;
      return acc;
    }, {} as WorkEvidence);
    const searchIndex = [
      profile.handle, profile.bio, profile.specialties, profile.developing_specialties, profile.skills,
      profile.tools, profile.platform, profile.industry, profile.languages,
      ...locationTokens(profile), profile.collaboration_interests, profile.external_links,
      ...authorWork.flatMap((item) => [item.title, item.summary, item.tags, item.kind, kindLabels[item.kind], item.source, item.body.slice(0, 1500)]),
    ].filter(Boolean).join(' ').toLowerCase();
    return { profile, evidence, searchIndex };
  });
}
