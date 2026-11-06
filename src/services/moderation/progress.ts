/** Nombre de commentaires envoyés au modèle par lot. */
export const BATCH_SIZE = 10;
/** En mode bouclier, on enchaîne les lots automatiquement tant qu'on n'a pas de quoi remplir l'écran… */
export const MIN_VISIBLE = 6;
/** …mais sans dépasser ce nombre d'analyses : au-delà, l'utilisateur doit scroller ou appuyer sur « Analyser la suite ». */
export const AUTO_ANALYZE_CAP = 50;

export type ProgressState = {
  /** Nombre de commentaires (dans l'ordre chronologique) soumis au modèle. */
  analyzeLimit: number;
  /** Nombre de commentaires chargés depuis YouTube. */
  loaded: number;
  /** Plus aucune analyse en cours dans le lot courant. */
  settled: boolean;
  /** Erreur bloquante (clé refusée) : on n'envoie plus rien. */
  blocked: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
};

export type ProgressStep = 'analyzeMore' | 'fetchPage' | 'wait';

/** Que faire quand on a besoin de plus de commentaires (scroll, écran pas rempli…) ? */
export function nextStep(s: ProgressState): ProgressStep {
  if (s.blocked || !s.settled) return 'wait';
  if (s.analyzeLimit < s.loaded) return 'analyzeMore';
  if (s.hasNextPage && !s.isFetchingNextPage) return 'fetchPage';
  return 'wait';
}

/** Faut-il avancer tout seul (sans action de l'utilisateur) ? */
export function shouldAutoAdvance(s: ProgressState & { visible: number }): boolean {
  return s.visible < MIN_VISIBLE && s.analyzeLimit < AUTO_ANALYZE_CAP && nextStep(s) !== 'wait';
}
