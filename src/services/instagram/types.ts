// ---- Formes brutes renvoyées par graph.facebook.com (Instagram API with Unified Login) ----

export type ApiPaging = {
  cursors?: { before?: string; after?: string };
  next?: string;
};

export type ApiPage<T> = { data?: T[]; paging?: ApiPaging };

export type ApiIgMedia = {
  id: string;
  caption?: string;
  permalink: string;
  media_type?: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url?: string;
  thumbnail_url?: string;
  /** Format Meta : « 2026-11-01T10:00:00+0000 ». */
  timestamp: string;
  comments_count?: number;
};

export type ApiIgComment = {
  id: string;
  text?: string;
  timestamp: string;
  username?: string;
  like_count?: number;
  replies?: { data?: ApiIgComment[] };
};

export type ApiIgProfile = {
  id: string;
  username: string;
  profile_picture_url?: string;
};

// ---- Modèle ----

export type IgMedia = {
  id: string;
  caption: string;
  permalink: string;
  thumbnailUrl?: string;
  commentsCount: number;
};

export type IgProfile = {
  id: string;
  username: string;
  avatarUrl?: string;
};
