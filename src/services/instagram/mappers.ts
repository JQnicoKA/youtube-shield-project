import type { Comment, CommentThread, VideoInfo } from '@/services/youtube';

import type { ApiIgComment, ApiIgMedia, ApiIgProfile, IgMedia, IgProfile } from './types';

/** « 2026-11-01T10:00:00+0000 » → ISO 8601 standard (« 2026-11-01T10:00:00.000Z »). */
export function normalizeTimestamp(ts: string): string {
  const d = new Date(ts.replace(/([+-]\d{2})(\d{2})$/, '$1:$2'));
  return Number.isNaN(d.getTime()) ? ts : d.toISOString();
}

export function mapIgComment(api: ApiIgComment): Comment {
  const username = api.username ?? '';
  return {
    id: api.id,
    text: api.text ?? '',
    // L'API ne fournit pas la photo des commentateurs : l'avatar affiche l'initiale.
    author: { name: username, avatarUrl: '', channelId: username },
    likeCount: api.like_count ?? 0,
    likedByMe: false,
    publishedAt: normalizeTimestamp(api.timestamp),
  };
}

export function mapIgMedia(api: ApiIgMedia): IgMedia {
  return {
    id: api.id,
    caption: api.caption ?? '',
    permalink: api.permalink,
    // Pour une vidéo, media_url pointe vers le fichier vidéo : on prend la miniature.
    thumbnailUrl: api.media_type === 'VIDEO' ? api.thumbnail_url : (api.media_url ?? api.thumbnail_url),
    commentsCount: api.comments_count ?? 0,
  };
}

export function mapIgProfile(api: ApiIgProfile): IgProfile {
  return { id: api.id, username: api.username, avatarUrl: api.profile_picture_url };
}

export function mediaToVideoInfo(media: IgMedia): VideoInfo {
  const firstLine = media.caption.split('\n')[0].trim();
  return { id: media.id, title: firstLine || 'Publication Instagram', thumbnailUrl: media.thumbnailUrl };
}

export function mapIgThread(api: ApiIgComment, media: IgMedia): CommentThread {
  const replies = (api.replies?.data ?? [])
    .map(mapIgComment)
    .sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));
  return {
    id: api.id,
    platform: 'instagram',
    videoId: media.id,
    permalink: media.permalink,
    video: mediaToVideoInfo(media),
    comment: mapIgComment(api),
    canReply: true,
    totalReplyCount: replies.length,
    replies,
  };
}
