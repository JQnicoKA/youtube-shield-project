import { createYouTubeApi } from '../api';
import { createYouTubeClient, YouTubeApiError } from '../client';
import { apiComment, apiThread, apiVideo } from '../__fixtures__/threads';

type Call = { url: URL; init: RequestInit };

/** Faux fetch : route chaque appel vers un handler selon le chemin de l'API. */
function setup(handlers: Record<string, (url: URL, init: RequestInit) => [number, unknown]>) {
  const calls: Call[] = [];
  const fetchMock = jest.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input));
    calls.push({ url, init });
    const path = url.pathname.replace('/youtube/v3/', '');
    const handler = handlers[path];
    if (!handler) throw new Error(`Appel inattendu : ${path}`);
    const [status, body] = handler(url, init);
    return new Response(JSON.stringify(body), { status });
  }) as unknown as typeof fetch;

  const api = createYouTubeApi(createYouTubeClient(async () => 'TOKEN', fetchMock));
  return { api, calls };
}

describe('listChannelCommentThreads', () => {
  it('demande les commentaires de la chaîne par ordre chronologique et joint les vidéos', async () => {
    const { api, calls } = setup({
      commentThreads: () => [
        200,
        { items: [apiThread('t1', 'v1'), apiThread('t2', 'v2'), apiThread('t3', 'v1')], nextPageToken: 'NEXT' },
      ],
      videos: () => [200, { items: [apiVideo('v1'), apiVideo('v2')] }],
    });

    const page = await api.listChannelCommentThreads('UC-me');

    const threadsCall = calls[0].url;
    expect(threadsCall.searchParams.get('allThreadsRelatedToChannelId')).toBe('UC-me');
    expect(threadsCall.searchParams.get('order')).toBe('time');
    expect(threadsCall.searchParams.get('part')).toBe('snippet,replies');
    expect(threadsCall.searchParams.has('pageToken')).toBe(false);
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe('Bearer TOKEN');

    // Une seule requête videos.list, sans doublon
    expect(calls[1].url.searchParams.get('id')).toBe('v1,v2');

    expect(page.nextPageToken).toBe('NEXT');
    expect(page.threads.map((t) => [t.id, t.video?.title])).toEqual([
      ['t1', 'Vidéo v1'],
      ['t2', 'Vidéo v2'],
      ['t3', 'Vidéo v1'],
    ]);
  });

  it('ne redemande pas les vidéos déjà en cache', async () => {
    const { api, calls } = setup({
      commentThreads: () => [200, { items: [apiThread('t1', 'v1')] }],
      videos: () => [200, { items: [apiVideo('v1')] }],
    });

    await api.listChannelCommentThreads('UC-me');
    await api.listChannelCommentThreads('UC-me', 'PAGE2');

    expect(calls.filter((c) => c.url.pathname.endsWith('/videos'))).toHaveLength(1);
    expect(calls[2].url.searchParams.get('pageToken')).toBe('PAGE2');
  });

  it('transforme une erreur de quota en YouTubeApiError "quota"', async () => {
    const { api } = setup({
      commentThreads: () => [
        403,
        { error: { code: 403, message: 'quota', errors: [{ reason: 'quotaExceeded' }] } },
      ],
    });

    const err = await api.listChannelCommentThreads('UC-me').catch((e) => e);
    expect(err).toBeInstanceOf(YouTubeApiError);
    expect(err.kind).toBe('quota');
  });

  it('transforme un 401 en erreur "auth"', async () => {
    const { api } = setup({ commentThreads: () => [401, { error: { code: 401, message: 'Invalid' } }] });
    await expect(api.listChannelCommentThreads('UC-me')).rejects.toMatchObject({ kind: 'auth' });
  });
});

describe('replyToComment', () => {
  it('poste la réponse avec parentId et renvoie le commentaire créé', async () => {
    const { api, calls } = setup({
      comments: () => [200, apiComment('reply-1', { textDisplay: 'Merci !', authorChannelId: { value: 'UC-me' } })],
    });

    const reply = await api.replyToComment('t1', 'Merci !');

    expect(calls[0].init.method).toBe('POST');
    expect(calls[0].url.searchParams.get('part')).toBe('snippet');
    expect(JSON.parse(calls[0].init.body as string)).toEqual({
      snippet: { parentId: 't1', textOriginal: 'Merci !' },
    });
    expect(reply).toMatchObject({ id: 'reply-1', text: 'Merci !', author: { channelId: 'UC-me' } });
  });
});

describe('getMyChannel', () => {
  it('renvoie null si le compte n’a pas de chaîne', async () => {
    const { api } = setup({ channels: () => [200, { items: [] }] });
    await expect(api.getMyChannel()).resolves.toBeNull();
  });
});
