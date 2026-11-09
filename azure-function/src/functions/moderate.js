import { app } from '@azure/functions';

import { GraphError } from '../lib/graph.js';
import { badRequest, handle } from '../lib/http.js';

const MAX_TEXT_LENGTH = 2000;

/**
 * POST /api/moderate   body : { "text": "..." }  →  { label, score_off, threshold }
 * Relais vers l'endpoint Azure ML : la clé reste côté serveur.
 */
app.http('moderate', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'moderate',
  handler: handle(async (request) => {
    const { AZURE_ML_URL, AZURE_ML_KEY } = process.env;
    if (!AZURE_ML_URL || !AZURE_ML_KEY) {
      throw new GraphError('AZURE_ML_URL / AZURE_ML_KEY manquants dans les paramètres de la Function', 500);
    }
    const body = await request.json().catch(() => ({}));
    if (typeof body.text !== 'string') throw badRequest('text manquant');

    const res = await fetch(AZURE_ML_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${AZURE_ML_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: body.text.slice(0, MAX_TEXT_LENGTH) }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new GraphError(`Azure ML a répondu ${res.status}`, res.status === 429 ? 429 : 502);
    const { label, score_off, threshold } = await res.json();
    return { label, score_off, threshold };
  }),
});
