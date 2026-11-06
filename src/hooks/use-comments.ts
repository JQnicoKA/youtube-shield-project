import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';

import { youtube, type CommentThreadPage } from '@/services/youtube';

export const commentThreadsKey = (channelId: string) => ['commentThreads', channelId] as const;

export function useCommentThreads(channelId: string | undefined) {
  return useInfiniteQuery({
    queryKey: commentThreadsKey(channelId ?? ''),
    queryFn: ({ pageParam }) => youtube.listChannelCommentThreads(channelId!, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextPageToken,
    enabled: !!channelId,
    staleTime: 60_000,
  });
}

export function useReplyToComment(channelId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ threadId, text }: { threadId: string; text: string }) =>
      youtube.replyToComment(threadId, text),
    // Ajoute la réponse publiée dans le cache, sans recharger toute la liste.
    onSuccess: (reply, { threadId }) => {
      queryClient.setQueryData<InfiniteData<CommentThreadPage>>(
        commentThreadsKey(channelId),
        (data) =>
          data && {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              threads: page.threads.map((t) =>
                t.id === threadId
                  ? { ...t, replies: [...t.replies, reply], totalReplyCount: t.totalReplyCount + 1 }
                  : t,
              ),
            })),
          },
      );
    },
  });
}
