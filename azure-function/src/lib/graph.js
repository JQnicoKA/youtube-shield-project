// Client minimal pour l'Instagram API with Unified Login (graph.facebook.com, jeton System User).
// Doc : https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-unified-login

const GRAPH = `https://graph.facebook.com/${process.env.GRAPH_VERSION || 'v27.0'}`;

export class GraphError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function token() {
  const t = process.env.IG_ACCESS_TOKEN;
  if (!t) throw new GraphError('IG_ACCESS_TOKEN manquant dans les paramètres de la Function', 500);
  return t;
}

export function igUserId() {
  const id = process.env.IG_USER_ID;
  if (!id) throw new GraphError('IG_USER_ID manquant dans les paramètres de la Function', 500);
  return id;
}

async function call(url, init) {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(15_000) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) {
    const err = body.error ?? {};
    // 190 = jeton invalide/expiré → 401 pour que l'app l'affiche clairement.
    const status = err.code === 190 ? 401 : res.status >= 400 ? res.status : 502;
    throw new GraphError(err.message || `Erreur Graph ${res.status}`, status, err.code);
  }
  return body;
}

/** GET {path}?params (le jeton est ajouté automatiquement). `path` peut aussi être une URL de pagination complète. */
export function get(path, params = {}) {
  const url = new URL(path.startsWith('https://') ? path : `${GRAPH}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  url.searchParams.set('access_token', token());
  return call(url);
}

/** POST {path} en form-urlencoded. */
export function post(path, params = {}) {
  const body = new URLSearchParams({ ...params, access_token: token() });
  return call(`${GRAPH}/${path}`, { method: 'POST', body });
}
