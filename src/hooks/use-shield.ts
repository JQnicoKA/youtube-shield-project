import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FlatListProps } from 'react-native';

import { useModeration } from '@/hooks/use-moderation';
import { filterByModeration } from '@/services/moderation';
import {
  BATCH_SIZE,
  nextStep,
  shouldAutoAdvance,
  type ProgressState,
} from '@/services/moderation/progress';
import type { CommentThread } from '@/services/youtube';

type ViewableItemsChanged = NonNullable<FlatListProps<CommentThread>['onViewableItemsChanged']>;

type Pagination = {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => unknown;
};

/**
 * Bouclier : analyse les commentaires par lots, au fil du scroll, et filtre les offensants.
 *
 * - Bouclier ON : on n'affiche que les commentaires analysés et sains. Quand on arrive en bas
 *   (ou que l'écran n'est pas rempli), on analyse le lot suivant, puis on charge une nouvelle
 *   page YouTube seulement quand tous les commentaires chargés ont été analysés.
 * - Bouclier OFF : tout s'affiche, l'analyse suit ce qui est visible à l'écran (pour les badges).
 */
export function useShield(threads: CommentThread[], pagination: Pagination) {
  const queryClient = useQueryClient();
  const [shieldOn, setShieldOn] = useState(true);
  const [analyzeLimit, setAnalyzeLimit] = useState(BATCH_SIZE);

  const analyzed = useMemo(() => threads.slice(0, analyzeLimit), [threads, analyzeLimit]);
  const moderation = useModeration(analyzed);
  const active = moderation.enabled && shieldOn;

  const { visible, stats } = useMemo(
    () =>
      active
        ? filterByModeration(analyzed, moderation.getStatus, true)
        : filterByModeration(threads, moderation.getStatus, false),
    [active, analyzed, threads, moderation.getStatus],
  );

  const progress: ProgressState = {
    analyzeLimit,
    loaded: threads.length,
    settled: moderation.settled,
    blocked: !!moderation.fatalError,
    hasNextPage: pagination.hasNextPage,
    isFetchingNextPage: pagination.isFetchingNextPage,
  };

  const { fetchNextPage } = pagination;
  const advance = useCallback(
    (step: ReturnType<typeof nextStep>) => {
      if (step === 'analyzeMore') setAnalyzeLimit((l) => l + BATCH_SIZE);
      if (step === 'fetchPage') fetchNextPage();
    },
    [fetchNextPage],
  );

  // Écran pas assez rempli (beaucoup de commentaires masqués) : on enchaîne le lot suivant.
  const autoAdvance = active && shouldAutoAdvance({ ...progress, visible: visible.length });
  const autoStep = autoAdvance ? nextStep(progress) : 'wait';
  useEffect(() => {
    // On réagit à la fin d'un lot d'analyse (résultat des requêtes) : setState voulu ici.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (autoStep !== 'wait') advance(autoStep);
  }, [autoStep, advance]);

  const onEndReached = () => {
    if (active) advance(nextStep(progress));
    else if (pagination.hasNextPage && !pagination.isFetchingNextPage) fetchNextPage();
  };

  // Bouclier OFF : on analyse ce qui défile à l'écran, avec un lot d'avance.
  // (FlatList exige un onViewableItemsChanged stable, d'où la ref.)
  const activeRef = useRef(active);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);
  const onViewableItemsChanged = useCallback<ViewableItemsChanged>(({ viewableItems }) => {
    if (activeRef.current) return;
    const maxIndex = Math.max(-1, ...viewableItems.map((v) => v.index ?? -1));
    if (maxIndex < 0) return;
    const needed = Math.ceil((maxIndex + 1) / BATCH_SIZE) * BATCH_SIZE + BATCH_SIZE;
    setAnalyzeLimit((l) => Math.max(l, needed));
  }, []);

  const retryErrors = useCallback(() => {
    queryClient.refetchQueries({ queryKey: ['moderation'], predicate: (q) => q.state.status === 'error' });
  }, [queryClient]);

  /** Il reste des commentaires à analyser et l'utilisateur peut le demander explicitement. */
  const canAnalyzeMore = active && nextStep(progress) !== 'wait';
  const analyzing = moderation.enabled && !moderation.settled;

  return {
    enabled: moderation.enabled,
    shieldOn,
    setShieldOn,
    visible,
    stats,
    statuses: moderation.statuses,
    getStatus: moderation.getStatus,
    fatalError: moderation.fatalError,
    analyzing,
    canAnalyzeMore,
    analyzeMore: () => advance(nextStep(progress)),
    onEndReached,
    onViewableItemsChanged,
    retryErrors,
  };
}
