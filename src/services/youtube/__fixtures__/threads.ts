import type { ApiComment, ApiCommentThread, ApiVideo } from '../types';

export function apiComment(id: string, overrides: Partial<ApiComment['snippet']> = {}): ApiComment {
  return {
    id,
    snippet: {
      textDisplay: `Texte ${id}`,
      authorDisplayName: `@auteur-${id}`,
      authorProfileImageUrl: `https://yt3.ggpht.com/${id}.jpg`,
      authorChannelUrl: `http://www.youtube.com/@auteur-${id}`,
      authorChannelId: { value: `UC-${id}` },
      likeCount: 0,
      publishedAt: '2026-11-01T10:00:00Z',
      updatedAt: '2026-11-01T10:00:00Z',
      ...overrides,
    },
  };
}

export function apiThread(
  id: string,
  videoId: string,
  replies: ApiComment[] = [],
  totalReplyCount = replies.length,
): ApiCommentThread {
  return {
    id,
    snippet: {
      channelId: 'UC-me',
      videoId,
      topLevelComment: apiComment(id, { videoId }),
      canReply: true,
      totalReplyCount,
      isPublic: true,
    },
    ...(replies.length ? { replies: { comments: replies } } : {}),
  };
}

export function apiVideo(id: string): ApiVideo {
  return {
    id,
    snippet: {
      title: `Vidéo ${id}`,
      thumbnails: {
        default: { url: `https://i.ytimg.com/vi/${id}/default.jpg` },
        medium: { url: `https://i.ytimg.com/vi/${id}/mqdefault.jpg` },
      },
    },
  };
}
