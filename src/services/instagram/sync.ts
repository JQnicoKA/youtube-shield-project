import { createLimiter } from '@/services/moderation/limit';
import type { CommentThread } from '@/services/youtube';

import type { InstagramApi } from './api';
import { InstagramApiError } from './client';
import { mapIgThread, mediaToVideoInfo } from './mappers';
import type { IgMedia, IgProfile } from './types';

/** État mémorisé entre deux lancements. */
export type FeedState = {
  /** Nombre de commentaires de chaque post lors de la dernière synchro réussie. */
  counts: Record<string, number>;
  threads: CommentThread[];
};

export type InstagramFeed = FeedState & { profile: IgProfile };

/** Au tout premier lancement, on ne charge que les commentaires des N posts commentés les plus récents. */
export const BACKFILL_POSTS = 30;
/** Nombre maximal de commentaires gardés en mémoire. */
export const MAX_STORED_THREADS = 1000;
const MAX_CONCURRENT_REQUESTS = 4;

const byNewest = (a: CommentThread, b: CommentThread) =>
  Date.parse(b.comment.publishedAt) - Date.parse(a.comment.publishedAt);

/** Posts dont les commentaires doivent être (re)chargés. */
export function postsToFetch(media: IgMedia[], prev: FeedState | null): IgMedia[] {
  if (!prev) return media.filter((m) => m.commentsCount > 0).slice(0, BACKFILL_POSTS);
  return media.filter((m) => (prev.counts[m.id] ?? 0) !== m.commentsCount);
}

/**
 * Synchronise le fil Instagram en comparant le nombre de commentaires de chaque post avec
 * la dernière synchro : seuls les posts qui ont changé (même anciens) sont rechargés.
 */
export async function syncFeed(api: InstagramApi, prev: FeedState | null): Promise<InstagramFeed> {
  const [profile, media] = await Promise.all([api.getProfile(), api.listMedia()]);
  const mediaById = new Map(media.map((m) => [m.id, m]));
  const toFetch = postsToFetch(media, prev);

  const limit = createLimiter(MAX_CONCURRENT_REQUESTS);
  const results = await Promise.allSettled(toFetch.map((m) => limit(() => api.listComments(m.id))));

  // Jeton refusé : inutile de continuer, on remonte l'erreur à l'écran.
  for (const r of results) {
    if (r.status === 'rejected' && r.reason instanceof InstagramApiError && r.reason.kind === 'auth') {
      throw r.reason;
    }
  }
  if (toFetch.length > 0 && results.every((r) => r.status === 'rejected')) {
    throw (results[0] as PromiseRejectedResult).reason;
  }

  const counts: Record<string, number> = {};
  const fetched = new Map<string, { threads: CommentThread[]; complete: boolean }>();
  toFetch.forEach((m, i) => {
    const r = results[i];
    if (r.status === 'fulfilled') {
      fetched.set(m.id, { threads: r.value.comments.map((c) => mapIgThread(c, m)), complete: !r.value.hasMore });
    }
  });
  for (const m of media) {
    const failed = toFetch.includes(m) && !fetched.has(m.id);
    // Échec : on garde l'ancien compteur pour réessayer à la prochaine synchro.
    if (!failed) counts[m.id] = m.commentsCount;
    else if (prev?.counts[m.id] !== undefined) counts[m.id] = prev.counts[m.id];
  }

  const threads = new Map<string, CommentThread>();
  for (const t of prev?.threads ?? []) {
    const m = mediaById.get(t.videoId);
    // Post supprimé, ou post rechargé en entier (commentaires supprimés inclus) : on oublie l'ancien.
    if (!m || fetched.get(m.id)?.complete) continue;
    // Les URL d'images Instagram expirent : on rafraîchit les infos du post à chaque synchro.
    threads.set(t.id, { ...t, video: mediaToVideoInfo(m), permalink: m.permalink });
  }
  for (const { threads: fresh } of fetched.values()) {
    for (const t of fresh) threads.set(t.id, t);
  }

  return {
    profile,
    counts,
    threads: [...threads.values()].sort(byNewest).slice(0, MAX_STORED_THREADS),
  };
}
