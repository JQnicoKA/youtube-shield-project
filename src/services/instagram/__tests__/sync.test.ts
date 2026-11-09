import type { InstagramApi } from '../api';
import { InstagramApiError } from '../client';
import { BACKFILL_POSTS, postsToFetch, syncFeed, type FeedState } from '../sync';
import type { ApiIgComment, IgMedia } from '../types';

const media = (id: string, commentsCount: number): IgMedia => ({
  id,
  caption: `Légende ${id}\nsuite`,
  permalink: `https://www.instagram.com/p/${id}/`,
  thumbnailUrl: `https://cdn/${id}.jpg`,
  commentsCount,
});

const comment = (id: string, timestamp: string, replies: ApiIgComment[] = []): ApiIgComment => ({
  id,
  text: `Texte ${id}`,
  timestamp,
  username: `user_${id}`,
  like_count: 1,
  replies: { data: replies },
});

function fakeApi(
  posts: IgMedia[],
  comments: Record<string, ApiIgComment[] | Error>,
  hasMore: Record<string, boolean> = {},
) {
  const listComments = jest.fn(async (mediaId: string) => {
    const c = comments[mediaId];
    if (c instanceof Error) throw c;
    return { comments: c ?? [], hasMore: !!hasMore[mediaId] };
  });
  const api = {
    getProfile: async () => ({ id: 'me', username: 'esendincerr' }),
    listMedia: async () => posts,
    listComments,
    replyToComment: jest.fn(),
  } as unknown as InstagramApi;
  return { api, listComments };
}

describe('postsToFetch', () => {
  it('premier lancement : seulement les posts commentés les plus récents', () => {
    const posts = Array.from({ length: BACKFILL_POSTS + 10 }, (_, i) => media(`m${i}`, i % 2));
    const result = postsToFetch(posts, null);
    expect(result.every((m) => m.commentsCount > 0)).toBe(true);
    expect(result).toHaveLength(Math.min(BACKFILL_POSTS, 20));
  });

  it('ensuite : uniquement les posts dont le compteur a changé, même anciens', () => {
    const prev: FeedState = { counts: { recent: 3, old: 5, nouveau0: 0 }, threads: [] };
    const posts = [media('recent', 3), media('nouveau', 2), media('nouveau0', 0), media('old', 6)];
    expect(postsToFetch(posts, prev).map((m) => m.id)).toEqual(['nouveau', 'old']);
  });
});

describe('syncFeed', () => {
  it('premier lancement : charge les commentaires, normalise les dates et mémorise les compteurs', async () => {
    const { api } = fakeApi([media('a', 2), media('b', 0)], {
      a: [
        comment('c1', '2026-11-01T10:00:00+0000', [comment('r1', '2026-11-01T12:00:00+0000')]),
        comment('c2', '2026-11-02T10:00:00+0000'),
      ],
    });
    const feed = await syncFeed(api, null);

    expect(feed.counts).toEqual({ a: 2, b: 0 });
    expect(feed.profile.username).toBe('esendincerr');
    expect(feed.threads.map((t) => t.id)).toEqual(['c2', 'c1']);
    const c1 = feed.threads[1];
    expect(c1).toMatchObject({
      platform: 'instagram',
      videoId: 'a',
      permalink: 'https://www.instagram.com/p/a/',
      video: { title: 'Légende a', thumbnailUrl: 'https://cdn/a.jpg' },
      totalReplyCount: 1,
      comment: { publishedAt: '2026-11-01T10:00:00.000Z', author: { name: 'user_c1', avatarUrl: '' } },
    });
  });

  it("ne recharge que les posts modifiés et garde les commentaires des autres", async () => {
    const first = await syncFeed(
      fakeApi([media('a', 1), media('b', 1)], {
        a: [comment('a1', '2026-11-01T10:00:00+0000')],
        b: [comment('b1', '2026-11-01T11:00:00+0000')],
      }).api,
      null,
    );

    const { api, listComments } = fakeApi([media('a', 1), media('b', 2)], {
      b: [comment('b2', '2026-11-03T10:00:00+0000'), comment('b1', '2026-11-01T11:00:00+0000')],
    });
    const second = await syncFeed(api, first);

    expect(listComments).toHaveBeenCalledTimes(1);
    expect(listComments).toHaveBeenCalledWith('b');
    expect(second.threads.map((t) => t.id)).toEqual(['b2', 'b1', 'a1']);
    expect(second.counts).toEqual({ a: 1, b: 2 });
  });

  it("oublie les commentaires supprimés quand le post est rechargé en entier, pas s'il est partiel", async () => {
    const prev: FeedState = {
      counts: { a: 2, b: 60 },
      threads: (await syncFeed(
        fakeApi([media('a', 2), media('b', 60)], {
          a: [comment('a1', '2026-11-01T10:00:00+0000'), comment('a2', '2026-11-01T11:00:00+0000')],
          b: [comment('old-b', '2026-10-01T10:00:00+0000')],
        }).api,
        null,
      )).threads,
    };
    const { api } = fakeApi(
      [media('a', 1), media('b', 61)],
      { a: [comment('a2', '2026-11-01T11:00:00+0000')], b: [comment('new-b', '2026-11-05T10:00:00+0000')] },
      { b: true },
    );
    const feed = await syncFeed(api, prev);
    const ids = feed.threads.map((t) => t.id);
    expect(ids).not.toContain('a1');
    expect(ids).toEqual(expect.arrayContaining(['a2', 'new-b', 'old-b']));
  });

  it('retire les commentaires des posts supprimés', async () => {
    const prev = await syncFeed(
      fakeApi([media('a', 1)], { a: [comment('a1', '2026-11-01T10:00:00+0000')] }).api,
      null,
    );
    const feed = await syncFeed(fakeApi([], {}).api, prev);
    expect(feed.threads).toEqual([]);
  });

  it("en cas d'échec sur un post, garde l'ancien compteur pour réessayer plus tard", async () => {
    const prev: FeedState = { counts: { a: 1, b: 1 }, threads: [] };
    const { api } = fakeApi([media('a', 2), media('b', 2)], {
      a: new InstagramApiError('boom', 'unknown'),
      b: [comment('b1', '2026-11-01T10:00:00+0000')],
    });
    const feed = await syncFeed(api, prev);
    expect(feed.counts).toEqual({ a: 1, b: 2 });
    expect(feed.threads.map((t) => t.id)).toEqual(['b1']);
  });

  it('remonte une erreur de jeton', async () => {
    const { api } = fakeApi([media('a', 1)], { a: new InstagramApiError('Jeton', 'auth', 400, 190) });
    await expect(syncFeed(api, null)).rejects.toMatchObject({ kind: 'auth' });
  });
});
