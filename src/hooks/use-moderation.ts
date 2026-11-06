import { useQueries, type UseQueryResult } from '@tanstack/react-query';
import { useCallback } from 'react';

import {
  classifyComment,
  isModerationConfigured,
  ModerationError,
  type ModerationResult,
  type ModerationStatus,
} from '@/services/moderation';
import type { CommentThread } from '@/services/youtube';

export const moderationKey = (commentId: string) => ['moderation', commentId] as const;

/**
 * Analyse le commentaire principal de chaque fil. Le résultat est mis en cache par ID de commentaire
 * pour toute la session : un commentaire n'est jamais envoyé deux fois au modèle.
 */
export function useModeration(threads: CommentThread[]) {
  // combine mémoïsé : la Map (et donc les props des cartes) ne change que si un résultat change.
  const combine = useCallback(
    (results: UseQueryResult<ModerationResult, Error>[]) => {
      const map = new Map<string, ModerationStatus>();
      results.forEach((r, i) => {
        const id = threads[i].comment.id;
        if (r.data) map.set(id, { state: 'done', ...r.data });
        else if (r.error) map.set(id, { state: 'error', message: r.error.message });
        else map.set(id, { state: 'pending' });
      });
      return map;
    },
    [threads],
  );

  const statuses = useQueries({
    queries: threads.map((t) => ({
      queryKey: moderationKey(t.comment.id),
      queryFn: () => classifyComment(t.comment.text),
      enabled: isModerationConfigured,
      staleTime: Infinity,
      gcTime: Infinity,
      retry: (count: number, error: Error) =>
        !(error instanceof ModerationError && (error.status === 401 || error.status === 403)) && count < 1,
    })),
    combine,
  });

  const getStatus = useCallback((t: CommentThread) => statuses.get(t.comment.id), [statuses]);

  return { statuses, getStatus, enabled: isModerationConfigured };
}
