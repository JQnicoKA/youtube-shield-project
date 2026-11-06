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

const isFatal = (e: unknown) => e instanceof ModerationError && (e.status === 401 || e.status === 403);

export type ModerationSummary = {
  statuses: Map<string, ModerationStatus>;
  /** Aucune analyse en cours. */
  settled: boolean;
  /** Message de la première erreur bloquante (clé refusée), s'il y en a une. */
  fatalError?: string;
};

/**
 * Analyse le commentaire principal de chaque fil fourni. Le résultat est mis en cache par ID de
 * commentaire pour toute la session : un commentaire n'est jamais envoyé deux fois au modèle.
 */
export function useModeration(threads: CommentThread[]) {
  // combine mémoïsé : la Map (et donc les props des cartes) ne change que si un résultat change.
  const combine = useCallback(
    (results: UseQueryResult<ModerationResult, Error>[]): ModerationSummary => {
      const statuses = new Map<string, ModerationStatus>();
      let settled = true;
      let fatalError: string | undefined;

      results.forEach((r, i) => {
        const id = threads[i].comment.id;
        if (r.data) {
          statuses.set(id, { state: 'done', ...r.data });
        } else if (r.error) {
          const fatal = isFatal(r.error);
          if (fatal) fatalError ??= r.error.message;
          statuses.set(id, { state: 'error', message: r.error.message, fatal });
        } else {
          statuses.set(id, { state: 'pending' });
          if (r.fetchStatus === 'fetching') settled = false;
        }
      });
      return { statuses, settled, fatalError };
    },
    [threads],
  );

  const summary = useQueries({
    queries: threads.map((t) => ({
      queryKey: moderationKey(t.comment.id),
      queryFn: () => classifyComment(t.comment.text),
      enabled: isModerationConfigured,
      staleTime: Infinity,
      gcTime: Infinity,
      retry: (count: number, error: Error) => !isFatal(error) && count < 1,
    })),
    combine,
  });

  const { statuses } = summary;
  const getStatus = useCallback((t: CommentThread) => statuses.get(t.comment.id), [statuses]);

  return { ...summary, getStatus, enabled: isModerationConfigured };
}
