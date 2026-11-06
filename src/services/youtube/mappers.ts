import type {
  ApiChannel,
  ApiComment,
  ApiCommentThread,
  ApiVideo,
  Channel,
  Comment,
  CommentThread,
  VideoInfo,
} from './types';

export function mapComment(api: ApiComment): Comment {
  const s = api.snippet;
  return {
    id: api.id,
    text: s.textDisplay,
    author: {
      name: s.authorDisplayName,
      avatarUrl: s.authorProfileImageUrl,
      channelId: s.authorChannelId?.value,
      channelUrl: s.authorChannelUrl,
    },
    likeCount: s.likeCount ?? 0,
    publishedAt: s.publishedAt,
  };
}

export function mapThread(api: ApiCommentThread, videos?: Map<string, VideoInfo>): CommentThread {
  const replies = (api.replies?.comments ?? [])
    .map(mapComment)
    .sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));

  return {
    id: api.id,
    videoId: api.snippet.videoId,
    video: videos?.get(api.snippet.videoId),
    comment: mapComment(api.snippet.topLevelComment),
    canReply: api.snippet.canReply,
    totalReplyCount: api.snippet.totalReplyCount,
    replies,
  };
}

export function mapVideo(api: ApiVideo): VideoInfo {
  const t = api.snippet.thumbnails;
  return {
    id: api.id,
    title: api.snippet.title,
    thumbnailUrl: (t.medium ?? t.default ?? t.high)?.url,
  };
}

export function mapChannel(api: ApiChannel): Channel {
  const t = api.snippet.thumbnails;
  return {
    id: api.id,
    title: api.snippet.title,
    avatarUrl: (t.default ?? t.medium ?? t.high)?.url,
  };
}

/** Vrai si la chaîne `channelId` a déjà répondu dans ce fil (parmi les réponses chargées). */
export function hasChannelReplied(thread: CommentThread, channelId: string | undefined): boolean {
  if (!channelId) return false;
  return thread.replies.some((r) => r.author.channelId === channelId);
}
