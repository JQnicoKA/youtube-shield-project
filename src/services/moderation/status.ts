import type { ModerationResult } from './client';

export type ModerationStatus =
  | { state: 'pending' }
  /** fatal = clé refusée (401/403) : inutile de réessayer automatiquement. */
  | { state: 'error'; message: string; fatal: boolean }
  | ({ state: 'done' } & ModerationResult);

/** Pourquoi un commentaire doit être flouté (null = affiché normalement). */
export type BlurReason = 'offensive' | 'analyzing' | null;

/**
 * - Offensant : flouté, avec « See anyway ».
 * - En cours d'analyse : flouté le temps de la réponse du modèle (évite d'afficher une insulte une seconde).
 * - Sain, erreur d'analyse ou modération désactivée : affiché normalement.
 */
export function blurReason(status: ModerationStatus | undefined, revealed: boolean): BlurReason {
  if (revealed || !status) return null;
  if (status.state === 'pending') return 'analyzing';
  if (status.state === 'done' && status.label === 'OFF') return 'offensive';
  return null;
}
