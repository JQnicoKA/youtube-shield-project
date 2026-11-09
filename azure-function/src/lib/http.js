import { GraphError } from './graph.js';

/** Enveloppe un handler : erreurs → JSON { error } avec le bon code HTTP. */
export function handle(fn) {
  return async (request, context) => {
    try {
      return { jsonBody: await fn(request, context) };
    } catch (e) {
      const status = e instanceof GraphError ? e.status : 500;
      context.error(e);
      return { status, jsonBody: { error: e instanceof Error ? e.message : 'Erreur inconnue' } };
    }
  };
}

export function badRequest(message) {
  return new GraphError(message, 400);
}
