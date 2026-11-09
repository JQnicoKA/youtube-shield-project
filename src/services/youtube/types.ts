// ---- Formes brutes renvoyées par l'API YouTube Data v3 (uniquement les champs utilisés) ----

export type ApiCommentSnippet = {
  videoId?: string;
  parentId?: string;
  textDisplay: string;
  textOriginal?: string;
  authorDisplayName: string;
  authorProfileImageUrl: string;
  authorChannelUrl?: string;
  authorChannelId?: { value: string };
  likeCount: number;
  /** Note donnée par le compte connecté ("like" ou "none"). */
  viewerRating?: string;
  publishedAt: string;
  updatedAt: string;
};

export type ApiComment = {
  id: string;
  snippet: ApiCommentSnippet;
};

export type ApiCommentThread = {
  id: string;
  snippet: {
    channelId: string;
    videoId: string;
    topLevelComment: ApiComment;
    canReply: boolean;
    totalReplyCount: number;
    isPublic: boolean;
  };
  replies?: { comments: ApiComment[] };
};

export type ApiThumbnail = { url: string; width?: number; height?: number };

export type ApiVideo = {
  id: string;
  snippet: {
    title: string;
    thumbnails: Partial<Record<'default' | 'medium' | 'high', ApiThumbnail>>;
  };
};

export type ApiChannel = {
  id: string;
  snippet: {
    title: string;
    thumbnails: Partial<Record<'default' | 'medium' | 'high', ApiThumbnail>>;
  };
};

export type ApiListResponse<T> = {
  items?: T[];
  nextPageToken?: string;
  pageInfo?: { totalResults: number; resultsPerPage: number };
};

// ---- Modèle métier utilisé par l'UI ----

export type Author = {
  name: string;
  avatarUrl: string;
  channelId?: string;
  channelUrl?: string;
};

export type Comment = {
  id: string;
  text: string;
  author: Author;
  likeCount: number;
  /** Le compte connecté (la chaîne) a liké ce commentaire. */
  likedByMe: boolean;
  publishedAt: string;
};

export type VideoInfo = {
  id: string;
  title: string;
  thumbnailUrl?: string;
};

export type Platform = 'youtube' | 'instagram';

export type CommentThread = {
  id: string;
  platform: Platform;
  /** ID de la vidéo YouTube, ou du post Instagram. */
  videoId: string;
  /** Lien vers le post (Instagram uniquement ; pour YouTube il est construit à partir des IDs). */
  permalink?: string;
  video?: VideoInfo;
  comment: Comment;
  canReply: boolean;
  totalReplyCount: number;
  /** Réponses incluses par l'API (au plus 5), triées de la plus ancienne à la plus récente. */
  replies: Comment[];
};

export type Channel = {
  id: string;
  title: string;
  avatarUrl?: string;
};

export type CommentThreadPage = {
  threads: CommentThread[];
  nextPageToken?: string;
};
