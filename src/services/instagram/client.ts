export const GRAPH_API_BASE = 'https://graph.facebook.com/v27.0';

export type InstagramErrorKind = 'auth' | 'rateLimit' | 'network' | 'unknown';

export class InstagramApiError extends Error {
  constructor(
    message: string,
    public readonly kind: InstagramErrorKind,
    public readonly status?: number,
    public readonly code?: number,
  ) {
    super(message);
    this.name = 'InstagramApiError';
  }
}

type ApiErrorBody = { error?: { message?: string; code?: number } };

/** Codes Graph API de limitation de débit. */
const RATE_LIMIT_CODES = new Set([4, 17, 32, 613, 80002]);

export function toInstagramError(status: number, body: ApiErrorBody | undefined): InstagramApiError {
  const code = body?.error?.code;
  const message = body?.error?.message ?? `Erreur Instagram (${status})`;
  if (code === 190 || status === 401) {
    return new InstagramApiError('Jeton Instagram invalide ou expiré', 'auth', status, code);
  }
  if (code !== undefined && RATE_LIMIT_CODES.has(code)) {
    return new InstagramApiError('Trop de requêtes Instagram, réessaie dans quelques minutes', 'rateLimit', status, code);
  }
  return new InstagramApiError(message, 'unknown', status, code);
}

export type IgRequestOptions = {
  method?: 'GET' | 'POST';
  params?: Record<string, string | number | undefined>;
};

export function createInstagramClient(accessToken: string, fetchImpl: typeof fetch = fetch) {
  /** `path` relatif à l'API, ou URL de pagination complète (`paging.next`). */
  return async function request<T>(path: string, options: IgRequestOptions = {}): Promise<T> {
    const url = new URL(path.startsWith('https://') ? path : `${GRAPH_API_BASE}/${path}`);
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(options.params ?? {})) {
      if (v !== undefined && v !== '') params.set(k, String(v));
    }
    params.set('access_token', accessToken);

    const isPost = options.method === 'POST';
    if (!isPost) params.forEach((v, k) => url.searchParams.set(k, v));

    let res: Response;
    try {
      res = await fetchImpl(url.toString(), {
        method: options.method ?? 'GET',
        headers: {
          Accept: 'application/json',
          ...(isPost ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
        },
        body: isPost ? params.toString() : undefined,
      });
    } catch (e) {
      throw new InstagramApiError(e instanceof Error ? e.message : 'Erreur réseau', 'network');
    }

    const body = await res.json().catch(() => undefined);
    if (!res.ok || (body as ApiErrorBody | undefined)?.error) {
      throw toInstagramError(res.status, body as ApiErrorBody | undefined);
    }
    return body as T;
  };
}

export type InstagramRequest = ReturnType<typeof createInstagramClient>;
