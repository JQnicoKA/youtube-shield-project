export type ModerationLabel = 'OFF' | 'NOT';

export type ModerationResult = {
  label: ModerationLabel;
  /** Probabilité que le texte soit offensant (0..1). */
  scoreOff: number;
  /** Seuil utilisé par le modèle pour décider du label. */
  threshold: number;
};

export class ModerationError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'ModerationError';
  }
}

type ApiResponse = { label?: string; score_off?: number; threshold?: number };

export type ModerationClientOptions = {
  url: string;
  apiKey?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

/** Le modèle n'a pas besoin de romans : on borne la taille envoyée. */
export const MAX_TEXT_LENGTH = 2000;

export function parseModerationResponse(body: unknown): ModerationResult {
  const b = body as ApiResponse | undefined;
  if (!b || (b.label !== 'OFF' && b.label !== 'NOT')) {
    throw new ModerationError('Réponse du modèle invalide');
  }
  return {
    label: b.label,
    scoreOff: typeof b.score_off === 'number' ? b.score_off : NaN,
    threshold: typeof b.threshold === 'number' ? b.threshold : NaN,
  };
}

export function createModerationClient({
  url,
  apiKey,
  timeoutMs = 15_000,
  fetchImpl = fetch,
}: ModerationClientOptions) {
  return async function classify(text: string): Promise<ModerationResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let res: Response;
    try {
      res = await fetchImpl(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({ text: text.slice(0, MAX_TEXT_LENGTH) }),
        signal: controller.signal,
      });
    } catch (e) {
      const aborted = e instanceof Error && e.name === 'AbortError';
      throw new ModerationError(aborted ? 'Le modèle ne répond pas (timeout)' : 'Erreur réseau');
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      const msg =
        res.status === 401 || res.status === 403
          ? 'Clé Azure invalide'
          : res.status === 429
            ? 'Trop de requêtes vers le modèle'
            : `Erreur du modèle (${res.status})`;
      throw new ModerationError(msg, res.status);
    }

    return parseModerationResponse(await res.json().catch(() => undefined));
  };
}

export type ClassifyFn = ReturnType<typeof createModerationClient>;
