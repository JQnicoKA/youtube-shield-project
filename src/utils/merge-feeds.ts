import type { CommentThread } from '@/services/youtube';

const time = (t: CommentThread) => Date.parse(t.comment.publishedAt);

/**
 * Fil mélangé YouTube + Instagram, du plus récent au plus ancien.
 * YouTube est paginé : tant qu'il reste des pages, on n'affiche que les commentaires Instagram
 * plus récents que le dernier commentaire YouTube chargé (sinon ils seraient intercalés au mauvais
 * endroit, puis repoussés vers le bas au chargement de la page suivante).
 */
export function mergeFeeds(
  youtube: CommentThread[],
  instagram: CommentThread[],
  youtubeHasMore: boolean,
): CommentThread[] {
  let ig = instagram;
  if (youtubeHasMore && youtube.length > 0) {
    const cutoff = Math.min(...youtube.map(time));
    ig = instagram.filter((t) => time(t) >= cutoff);
  }
  return [...youtube, ...ig].sort((a, b) => time(b) - time(a));
}
