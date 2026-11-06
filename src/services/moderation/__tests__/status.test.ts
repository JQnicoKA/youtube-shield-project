import { blurReason, type ModerationStatus } from '../status';

const off: ModerationStatus = { state: 'done', label: 'OFF', scoreOff: 0.8, threshold: 0.15 };
const ok: ModerationStatus = { state: 'done', label: 'NOT', scoreOff: 0.02, threshold: 0.15 };

describe('blurReason', () => {
  it('floute les commentaires offensants', () => {
    expect(blurReason(off, false)).toBe('offensive');
  });

  it('les affiche une fois « See anyway » touché', () => {
    expect(blurReason(off, true)).toBeNull();
  });

  it("floute pendant l'analyse", () => {
    expect(blurReason({ state: 'pending' }, false)).toBe('analyzing');
  });

  it('affiche normalement les commentaires sains, en erreur ou sans modération', () => {
    expect(blurReason(ok, false)).toBeNull();
    expect(blurReason({ state: 'error', message: 'x', fatal: true }, false)).toBeNull();
    expect(blurReason(undefined, false)).toBeNull();
  });
});
