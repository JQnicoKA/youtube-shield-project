import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  instagram,
  isInstagramConfigured,
  saveFeedState,
  syncInstagramFeed,
  type InstagramFeed,
} from '@/services/instagram';

export const instagramFeedKey = ['instagram', 'feed'] as const;

export function useInstagramFeed() {
  return useQuery({
    queryKey: instagramFeedKey,
    queryFn: syncInstagramFeed,
    enabled: isInstagramConfigured,
    staleTime: 60_000,
  });
}

export function useReplyToInstagramComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, text }: { commentId: string; text: string }) => {
      const feed = queryClient.getQueryData<InstagramFeed>(instagramFeedKey);
      if (!feed) throw new Error('Fil Instagram pas encore chargé');
      return instagram.replyToComment(commentId, text, feed.profile);
    },
    // Ajoute la réponse dans le cache (et dans l'état mémorisé), sans tout resynchroniser.
    onSuccess: (reply, { commentId }) => {
      const feed = queryClient.setQueryData<InstagramFeed>(
        instagramFeedKey,
        (data) =>
          data && {
            ...data,
            threads: data.threads.map((t) =>
              t.id === commentId
                ? { ...t, replies: [...t.replies, reply], totalReplyCount: t.totalReplyCount + 1 }
                : t,
            ),
          },
      );
      if (feed) void saveFeedState(feed);
    },
  });
}
