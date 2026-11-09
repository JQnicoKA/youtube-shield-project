import { createInstagramApi } from '../api';
import { createInstagramClient, toInstagramError } from '../client';
import { normalizeTimestamp } from '../mappers';

const json = (body: unknown, status = 200) =>
  ({ ok: status < 400, status, json: async () => body }) as Response;

describe('toInstagramError', () => {
  it('reconnaît un jeton invalide (code 190)', () => {
    expect(toInstagramError(400, { error: { code: 190, message: 'x' } }).kind).toBe('auth');
  });
  it('reconnaît une limitation de débit', () => {
    expect(toInstagramError(400, { error: { code: 4 } }).kind).toBe('rateLimit');
  });
  it('garde le message de Meta sinon', () => {
    const e = toInstagramError(400, { error: { code: 100, message: 'Invalid parameter' } });
    expect(e).toMatchObject({ kind: 'unknown', message: 'Invalid parameter' });
  });
});

describe('client Instagram', () => {
  it('GET : paramètres + jeton dans la query string', async () => {
    const fetchImpl = jest.fn(async () => json({ id: '1', username: 'moi' }));
    const api = createInstagramApi(createInstagramClient('TOKEN', fetchImpl as typeof fetch), '1784');
    await expect(api.getProfile()).resolves.toEqual({ id: '1', username: 'moi', avatarUrl: undefined });

    const url = new URL((fetchImpl.mock.calls[0] as unknown as [string])[0]);
    expect(url.origin + url.pathname).toBe('https://graph.facebook.com/v27.0/1784');
    expect(url.searchParams.get('fields')).toBe('id,username,profile_picture_url');
    expect(url.searchParams.get('access_token')).toBe('TOKEN');
  });

  it('suit la pagination des posts', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(
        json({
          data: [{ id: 'm1', permalink: 'p1', timestamp: 't', comments_count: 2 }],
          paging: { next: 'https://graph.facebook.com/v27.0/1784/media?after=X' },
        }),
      )
      .mockResolvedValueOnce(json({ data: [{ id: 'm2', permalink: 'p2', timestamp: 't' }] }));
    const api = createInstagramApi(createInstagramClient('TOKEN', fetchImpl), '1784');
    const media = await api.listMedia();
    expect(media.map((m) => [m.id, m.commentsCount])).toEqual([
      ['m1', 2],
      ['m2', 0],
    ]);
    expect(fetchImpl.mock.calls[1][0]).toContain('after=X');
  });

  it('POST : réponse envoyée en form-urlencoded (jeton dans le corps, pas dans l’URL)', async () => {
    const fetchImpl = jest.fn(async () => json({ id: 'r1' }));
    const api = createInstagramApi(createInstagramClient('TOKEN', fetchImpl as typeof fetch), '1784');
    const reply = await api.replyToComment('c1', 'Merci !', { id: '1784', username: 'moi' });

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://graph.facebook.com/v27.0/c1/replies');
    expect(init.method).toBe('POST');
    expect(new URLSearchParams(init.body as string).get('message')).toBe('Merci !');
    expect(reply).toMatchObject({ id: 'r1', text: 'Merci !', author: { name: 'moi', channelId: 'moi' } });
  });

  it("transforme une réponse d'erreur en InstagramApiError", async () => {
    const fetchImpl = jest.fn(async () => json({ error: { code: 190, message: 'expired' } }, 400));
    const api = createInstagramApi(createInstagramClient('TOKEN', fetchImpl as typeof fetch), '1784');
    await expect(api.getProfile()).rejects.toMatchObject({ kind: 'auth' });
  });
});

describe('normalizeTimestamp', () => {
  it('convertit le format Meta en ISO', () => {
    expect(normalizeTimestamp('2026-11-01T10:00:00+0000')).toBe('2026-11-01T10:00:00.000Z');
    expect(normalizeTimestamp('2026-11-01T12:00:00+0200')).toBe('2026-11-01T10:00:00.000Z');
  });
});
