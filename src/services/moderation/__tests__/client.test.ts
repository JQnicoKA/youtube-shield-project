import { createModerationClient, MAX_TEXT_LENGTH, ModerationError } from '../client';

const URL_ = 'https://example.inference.ml.azure.com/score';

function mockFetch(status: number, body: unknown) {
  return jest.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as jest.Mock &
    typeof fetch;
}

describe('createModerationClient', () => {
  it('envoie le texte avec la clé et parse la réponse', async () => {
    const fetchImpl = mockFetch(200, { label: 'OFF', score_off: 0.5167, threshold: 0.15 });
    const classify = createModerationClient({ url: URL_, apiKey: 'KEY', fetchImpl });

    await expect(classify('Sen aptal mısın?')).resolves.toEqual({
      label: 'OFF',
      scoreOff: 0.5167,
      threshold: 0.15,
    });

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(URL_);
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer KEY', 'Content-Type': 'application/json' });
    expect(JSON.parse(init.body)).toEqual({ text: 'Sen aptal mısın?' });
  });

  it("n'envoie pas d'en-tête Authorization sans clé (cas d'un proxy)", async () => {
    const fetchImpl = mockFetch(200, { label: 'NOT', score_off: 0.01, threshold: 0.15 });
    await createModerationClient({ url: URL_, fetchImpl })('Super vidéo');
    expect(fetchImpl.mock.calls[0][1].headers).not.toHaveProperty('Authorization');
  });

  it('tronque les textes trop longs', async () => {
    const fetchImpl = mockFetch(200, { label: 'NOT', score_off: 0, threshold: 0.15 });
    await createModerationClient({ url: URL_, fetchImpl })('a'.repeat(MAX_TEXT_LENGTH + 500));
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body).text).toHaveLength(MAX_TEXT_LENGTH);
  });

  it.each([
    [401, 'Clé Azure invalide'],
    [429, 'Trop de requêtes vers le modèle'],
    [500, 'Erreur du modèle (500)'],
  ])('HTTP %i -> ModerationError "%s"', async (status, message) => {
    const classify = createModerationClient({ url: URL_, fetchImpl: mockFetch(status, {}) });
    const err = await classify('x').catch((e) => e);
    expect(err).toBeInstanceOf(ModerationError);
    expect(err).toMatchObject({ message, status });
  });

  it('rejette une réponse sans label valide', async () => {
    const classify = createModerationClient({ url: URL_, fetchImpl: mockFetch(200, { label: 'MAYBE' }) });
    await expect(classify('x')).rejects.toThrow('Réponse du modèle invalide');
  });

  it('transforme une erreur réseau en ModerationError', async () => {
    const fetchImpl = jest.fn(async () => {
      throw new TypeError('Network request failed');
    }) as unknown as typeof fetch;
    await expect(createModerationClient({ url: URL_, fetchImpl })('x')).rejects.toThrow('Erreur réseau');
  });
});
