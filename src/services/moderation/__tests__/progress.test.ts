import { AUTO_ANALYZE_CAP, BATCH_SIZE, MIN_VISIBLE, nextStep, shouldAutoAdvance, type ProgressState } from '../progress';

const base: ProgressState = {
  analyzeLimit: BATCH_SIZE,
  loaded: 50,
  settled: true,
  blocked: false,
  hasNextPage: true,
  isFetchingNextPage: false,
};

describe('nextStep', () => {
  it("attend la fin du lot en cours avant d'en lancer un autre", () => {
    expect(nextStep({ ...base, settled: false })).toBe('wait');
  });

  it("n'envoie plus rien après une erreur bloquante (clé refusée)", () => {
    expect(nextStep({ ...base, blocked: true })).toBe('wait');
  });

  it('analyse le lot suivant parmi les commentaires déjà chargés', () => {
    expect(nextStep(base)).toBe('analyzeMore');
  });

  it("ne charge une page YouTube qu'une fois tous les commentaires chargés analysés", () => {
    expect(nextStep({ ...base, analyzeLimit: 50 })).toBe('fetchPage');
    expect(nextStep({ ...base, analyzeLimit: 50, isFetchingNextPage: true })).toBe('wait');
    expect(nextStep({ ...base, analyzeLimit: 50, hasNextPage: false })).toBe('wait');
  });
});

describe('shouldAutoAdvance', () => {
  it("avance tout seul quand l'écran n'est pas rempli", () => {
    expect(shouldAutoAdvance({ ...base, visible: MIN_VISIBLE - 1 })).toBe(true);
  });

  it('ne fait rien quand assez de commentaires sont visibles', () => {
    expect(shouldAutoAdvance({ ...base, visible: MIN_VISIBLE })).toBe(false);
  });

  it("s'arrête au plafond d'analyses automatiques (pas d'emballement)", () => {
    expect(shouldAutoAdvance({ ...base, analyzeLimit: AUTO_ANALYZE_CAP, visible: 0 })).toBe(false);
  });

  it("s'arrête en cas d'erreur bloquante, même avec un écran vide", () => {
    expect(shouldAutoAdvance({ ...base, blocked: true, visible: 0 })).toBe(false);
  });
});
