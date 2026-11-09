import type { CommentThread, Platform } from '@/services/youtube';

import { mergeFeeds } from '../merge-feeds';

const thread = (id: string, platform: Platform, publishedAt: string): CommentThread => ({
  id,
  platform,
  videoId: 'v',
  comment: {
    id,
    text: id,
    author: { name: id, avatarUrl: '' },
    likeCount: 0,
    likedByMe: false,
    publishedAt,
  },
  canReply: true,
  totalReplyCount: 0,
  replies: [],
});

const yt = [thread('y1', 'youtube', '2026-11-05T10:00:00Z'), thread('y2', 'youtube', '2026-11-03T10:00:00Z')];
const ig = [
  thread('i1', 'instagram', '2026-11-04T10:00:00.000Z'),
  thread('i2', 'instagram', '2026-11-01T10:00:00.000Z'),
];

describe('mergeFeeds', () => {
  it('mélange les deux fils du plus récent au plus ancien', () => {
    expect(mergeFeeds(yt, ig, false).map((t) => t.id)).toEqual(['y1', 'i1', 'y2', 'i2']);
  });

  it("tant que YouTube a d'autres pages, cache les commentaires Instagram plus anciens", () => {
    expect(mergeFeeds(yt, ig, true).map((t) => t.id)).toEqual(['y1', 'i1', 'y2']);
  });

  it('affiche tout Instagram si YouTube est vide', () => {
    expect(mergeFeeds([], ig, true).map((t) => t.id)).toEqual(['i1', 'i2']);
  });
});
