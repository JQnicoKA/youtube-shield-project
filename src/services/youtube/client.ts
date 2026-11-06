export const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

export type YouTubeErrorKind = 'auth' | 'quota' | 'forbidden' | 'notFound' | 'network' | 'unknown';

export class YouTubeApiError extends Error {
  constructor(
    message: string,
    public readonly kind: YouTubeErrorKind,
    public readonly status?: number,
    public readonly reason?: string,
  ) {
    super(message);
    this.name = 'YouTubeApiError';
  }
}

/** Fournit un access token OAuth valide (renouvelé si besoin). */
export type TokenProvider = () => Promise<string>;

type ApiErrorBody = {
  error?: { code?: number; message?: string; errors?: { reason?: string; message?: string }[] };
};

const QUOTA_REASONS = new Set(['quotaExceeded', 'dailyLimitExceeded', 'rateLimitExceeded']);

export function toYouTubeError(status: number, body: ApiErrorBody | undefined): YouTubeApiError {
  const reason = body?.error?.errors?.[0]?.reason;
  const message = body?.error?.message ?? `Erreur YouTube (${status})`;

  if (status === 401) return new YouTubeApiError(message, 'auth', status, reason);
  if (reason && QUOTA_REASONS.has(reason)) return new YouTubeApiError(message, 'quota', status, reason);
  if (status === 403) return new YouTubeApiError(message, 'forbidden', status, reason);
  if (status === 404) return new YouTubeApiError(message, 'notFound', status, reason);
  return new YouTubeApiError(message, 'unknown', status, reason);
}

export type RequestOptions = {
  method?: 'GET' | 'POST';
  params?: Record<string, string | number | undefined>;
  body?: unknown;
};

export function buildUrl(path: string, params: RequestOptions['params'] = {}): string {
  const query = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return `${YOUTUBE_API_BASE}/${path}${query ? `?${query}` : ''}`;
}

export function createYouTubeClient(getToken: TokenProvider, fetchImpl: typeof fetch = fetch) {
  return async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const token = await getToken();
    let res: Response;
    try {
      res = await fetchImpl(buildUrl(path, options.params), {
        method: options.method ?? 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        },
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      });
    } catch (e) {
      throw new YouTubeApiError(
        e instanceof Error ? e.message : 'Erreur réseau',
        'network',
      );
    }

    const body = await res.json().catch(() => undefined);
    if (!res.ok) throw toYouTubeError(res.status, body as ApiErrorBody | undefined);
    return body as T;
  };
}

export type YouTubeRequest = ReturnType<typeof createYouTubeClient>;
