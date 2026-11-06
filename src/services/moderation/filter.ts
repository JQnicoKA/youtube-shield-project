import type { ModerationResult } from './client';

export type ModerationStatus =
  | { state: 'pending' }
  | { state: 'error'; message: string }
  | ({ state: 'done' } & ModerationResult);

export type FilterStats = {
  hidden: number;
  pending: number;
  errors: number;
};

/**
 * Filtre « bouclier » : quand il est actif, seuls les commentaires analysés ET non offensants
 * sont affichés. Ceux en cours d'analyse ou en erreur sont masqués par précaution.
 */
export function filterByModeration<T>(
  items: T[],
  getStatus: (item: T) => ModerationStatus | undefined,
  enabled: boolean,
): { visible: T[]; stats: FilterStats } {
  const stats: FilterStats = { hidden: 0, pending: 0, errors: 0 };
  if (!enabled) return { visible: items, stats };

  const visible = items.filter((item) => {
    const s = getStatus(item) ?? { state: 'pending' };
    if (s.state === 'done' && s.label === 'NOT') return true;
    if (s.state === 'done') stats.hidden++;
    else if (s.state === 'pending') stats.pending++;
    else stats.errors++;
    return false;
  });

  return { visible, stats };
}
