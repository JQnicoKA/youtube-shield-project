import { hasChannelReplied, mapThread, mapVideo } from '../mappers';
import type { VideoInfo } from '../types';
import { apiComment, apiThread, apiVideo } from '../__fixtures__/threads';

describe('mapThread', () => {
  it('extrait auteur, photo, date, texte et vidéo associée', () => {
    const videos = new Map<string, VideoInfo>([['v1', mapVideo(apiVideo('v1'))]]);
    const thread = mapThread(apiThread('t1', 'v1'), videos);

    expect(thread).toMatchObject({
      id: 't1',
      videoId: 'v1',
      video: { id: 'v1', title: 'Vidéo v1', thumbnailUrl: 'https://i.ytimg.com/vi/v1/mqdefault.jpg' },
      comment: {
        id: 't1',
        text: 'Texte t1',
        author: {
          name: '@auteur-t1',
          avatarUrl: 'https://yt3.ggpht.com/t1.jpg',
          channelId: 'UC-t1',
        },
        publishedAt: '2026-11-01T10:00:00Z',
      },
      canReply: true,
      replies: [],
    });
  });

  it('trie les réponses de la plus ancienne à la plus récente', () => {
    const thread = mapThread(
      apiThread('t1', 'v1', [
        apiComment('r2', { publishedAt: '2026-11-03T00:00:00Z' }),
        apiComment('r1', { publishedAt: '2026-11-02T00:00:00Z' }),
      ]),
    );
    expect(thread.replies.map((r) => r.id)).toEqual(['r1', 'r2']);
  });

  it('laisse video undefined si la vidéo est inconnue', () => {
    expect(mapThread(apiThread('t1', 'inconnue'), new Map()).video).toBeUndefined();
  });
});

describe('hasChannelReplied', () => {
  const thread = mapThread(
    apiThread('t1', 'v1', [apiComment('r1', { authorChannelId: { value: 'UC-me' } })]),
  );

  it('détecte une réponse de la chaîne', () => {
    expect(hasChannelReplied(thread, 'UC-me')).toBe(true);
  });

  it('ignore les réponses des autres', () => {
    expect(hasChannelReplied(thread, 'UC-autre')).toBe(false);
    expect(hasChannelReplied(thread, undefined)).toBe(false);
  });
});
