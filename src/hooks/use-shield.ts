import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FlatListProps } from 'react-native';

import { useModeration } from '@/hooks/use-moderation';
import type { ModerationStatus } from '@/services/moderation';
import type { CommentThread } from '@/services/youtube';

type ViewableItemsChanged = NonNullable<FlatListProps<CommentThread>['onViewableItemsChanged']>;

/** Nombre de commentaires envoyés au modèle par lot. */
const BATCH_SIZE = 10;
const PENDING: ModerationStatus = { state: 'pending' };

/**
 * Analyse les commentaires au fil du scroll : ceux visibles à l'écran + un lot d'avance.
 * Rien n'est filtré : c'est la carte qui floute les commentaires offensants.
 */
export function useShield(threads: CommentThread[]) {
  const queryClient = useQueryClient();
  const [analyzeLimit, setAnalyzeLimit] = useState(BATCH_SIZE);

  const analyzed = useMemo(() => threads.slice(0, analyzeLimit), [threads, analyzeLimit]);
  const { statuses, enabled, fatalError } = useModeration(analyzed);

  /**
   * Statut d'un fil. Un fil pas encore envoyé au modèle est « en attente » (donc flouté),
   * sauf si la modération est bloquée (clé refusée) : on affiche alors tout normalement.
   */
  const getStatus = useCallback(
    (t: CommentThread): ModerationStatus | undefined => {
      if (!enabled) return undefined;
      return statuses.get(t.comment.id) ?? (fatalError ? undefined : PENDING);
    },
    [enabled, statuses, fatalError],
  );

  // Après une erreur bloquante, on n'envoie plus de nouveaux lots.
  const blockedRef = useRef(false);
  useEffect(() => {
    blockedRef.current = !!fatalError;
  }, [fatalError]);

  // FlatList exige un onViewableItemsChanged stable (d'où useCallback sans dépendances + ref).
  const onViewableItemsChanged = useCallback<ViewableItemsChanged>(({ viewableItems }) => {
    if (blockedRef.current) return;
    const maxIndex = Math.max(-1, ...viewableItems.map((v) => v.index ?? -1));
    if (maxIndex < 0) return;
    const needed = Math.ceil((maxIndex + 1) / BATCH_SIZE) * BATCH_SIZE + BATCH_SIZE;
    setAnalyzeLimit((l) => Math.max(l, needed));
  }, []);

  const retryErrors = useCallback(() => {
    queryClient.refetchQueries({ queryKey: ['moderation'], predicate: (q) => q.state.status === 'error' });
  }, [queryClient]);

  return { statuses, getStatus, fatalError, onViewableItemsChanged, retryErrors };
}
