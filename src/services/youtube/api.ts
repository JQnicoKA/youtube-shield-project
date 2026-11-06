import type { YouTubeRequest } from './client';
import { mapChannel, mapComment, mapThread, mapVideo } from './mappers';
import type {
  ApiChannel,
  ApiComment,
  ApiCommentThread,
  ApiListResponse,
  ApiVideo,
  Channel,
  Comment,
  CommentThreadPage,
  VideoInfo,
} from './types';

const VIDEOS_PER_REQUEST = 50; // limite de videos.list
export const THREADS_PER_PAGE = 50; // max 100

/**
 * Coûts en quota (10 000 unités/jour par défaut) :
 *  - channels.list, commentThreads.list, videos.list : 1 unité
 *  - comments.insert : 50 unités
 */
export function createYouTubeApi(request: YouTubeRequest) {
  // Cache mémoire des infos vidéo : une vidéo n'est demandée qu'une fois par session.
  const videoCache = new Map<string, VideoInfo>();

  async function getMyChannel(): Promise<Channel | null> {
    const res = await request<ApiListResponse<ApiChannel>>('channels', {
      params: { part: 'snippet', mine: 'true' },
    });
    const first = res.items?.[0];
    return first ? mapChannel(first) : null;
  }

  async function getVideos(ids: string[]): Promise<Map<string, VideoInfo>> {
    const missing = [...new Set(ids)].filter((id) => id && !videoCache.has(id));

    for (let i = 0; i < missing.length; i += VIDEOS_PER_REQUEST) {
      const chunk = missing.slice(i, i + VIDEOS_PER_REQUEST);
      const res = await request<ApiListResponse<ApiVideo>>('videos', {
        params: { part: 'snippet', id: chunk.join(','), maxResults: VIDEOS_PER_REQUEST },
      });
      for (const v of res.items ?? []) videoCache.set(v.id, mapVideo(v));
    }
    return videoCache;
  }

  /** Commentaires de toutes les vidéos de la chaîne, du plus récent au plus ancien. */
  async function listChannelCommentThreads(
    channelId: string,
    pageToken?: string,
  ): Promise<CommentThreadPage> {
    const res = await request<ApiListResponse<ApiCommentThread>>('commentThreads', {
      params: {
        part: 'snippet,replies',
        allThreadsRelatedToChannelId: channelId,
        order: 'time',
        textFormat: 'plainText',
        maxResults: THREADS_PER_PAGE,
        pageToken,
      },
    });
    const items = res.items ?? [];
    const videos = await getVideos(items.map((t) => t.snippet.videoId));

    return {
      threads: items.map((t) => mapThread(t, videos)),
      nextPageToken: res.nextPageToken,
    };
  }

  /** Publie une réponse sur YouTube, au nom de la chaîne connectée. */
  async function replyToComment(parentId: string, text: string): Promise<Comment> {
    const res = await request<ApiComment>('comments', {
      method: 'POST',
      params: { part: 'snippet' },
      body: { snippet: { parentId, textOriginal: text } },
    });
    return mapComment(res);
  }

  return { getMyChannel, getVideos, listChannelCommentThreads, replyToComment };
}

export type YouTubeApi = ReturnType<typeof createYouTubeApi>;
