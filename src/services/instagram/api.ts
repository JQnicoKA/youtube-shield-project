import type { Comment } from '@/services/youtube';

import type { InstagramRequest } from './client';
import { mapIgMedia, mapIgProfile } from './mappers';
import type { ApiIgComment, ApiIgMedia, ApiIgProfile, ApiPage, IgMedia, IgProfile } from './types';

const MEDIA_FIELDS = 'id,caption,permalink,media_type,media_url,thumbnail_url,timestamp,comments_count';
const COMMENT_FIELDS = 'id,text,timestamp,username,like_count';
/** Garde-fou : 20 pages × 100 posts. */
const MAX_MEDIA_PAGES = 20;
/** Limite Instagram pour un commentaire. */
export const IG_MAX_COMMENT_LENGTH = 2200;

export type IgCommentsPage = { comments: ApiIgComment[]; hasMore: boolean };

export function createInstagramApi(request: InstagramRequest, userId: string) {
  return {
    async getProfile(): Promise<IgProfile> {
      return mapIgProfile(
        await request<ApiIgProfile>(userId, { params: { fields: 'id,username,profile_picture_url' } }),
      );
    },

    /** Tous les posts (du plus récent au plus ancien) avec leur nombre de commentaires. */
    async listMedia(): Promise<IgMedia[]> {
      const media: IgMedia[] = [];
      let page = await request<ApiPage<ApiIgMedia>>(`${userId}/media`, {
        params: { fields: MEDIA_FIELDS, limit: 100 },
      });
      for (let i = 1; ; i++) {
        media.push(...(page.data ?? []).map(mapIgMedia));
        const next = page.paging?.next;
        if (!next || i >= MAX_MEDIA_PAGES) break;
        page = await request<ApiPage<ApiIgMedia>>(next);
      }
      return media;
    },

    /** Les 50 commentaires les plus récents du post (premier niveau) et leurs réponses. */
    async listComments(mediaId: string): Promise<IgCommentsPage> {
      const page = await request<ApiPage<ApiIgComment>>(`${mediaId}/comments`, {
        params: { fields: `${COMMENT_FIELDS},replies{${COMMENT_FIELDS}}`, limit: 50 },
      });
      return { comments: page.data ?? [], hasMore: !!page.paging?.next };
    },

    /** Publie une réponse et renvoie le commentaire tel qu'il apparaîtra dans le fil. */
    async replyToComment(commentId: string, text: string, me: IgProfile): Promise<Comment> {
      const res = await request<{ id: string }>(`${commentId}/replies`, {
        method: 'POST',
        params: { message: text },
      });
      return {
        id: res.id,
        text,
        author: { name: me.username, avatarUrl: me.avatarUrl ?? '', channelId: me.username },
        likeCount: 0,
        likedByMe: false,
        publishedAt: new Date().toISOString(),
      };
    },
  };
}

export type InstagramApi = ReturnType<typeof createInstagramApi>;
