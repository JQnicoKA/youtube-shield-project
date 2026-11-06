import { filterByModeration, type ModerationStatus } from '../filter';
import { createLimiter } from '../limit';

const statuses: Record<string, ModerationStatus> = {
  ok: { state: 'done', label: 'NOT', scoreOff: 0.02, threshold: 0.15 },
  off: { state: 'done', label: 'OFF', scoreOff: 0.8, threshold: 0.15 },
  wait: { state: 'pending' },
  err: { state: 'error', message: 'boom' },
};
const items = ['ok', 'off', 'wait', 'err', 'unknown'];
const get = (id: string) => statuses[id];

describe('filterByModeration', () => {
  it('ne filtre rien quand le bouclier est désactivé', () => {
    expect(filterByModeration(items, get, false)).toEqual({
      visible: items,
      stats: { hidden: 0, pending: 0, errors: 0 },
    });
  });

  it("n'affiche que les commentaires analysés et non offensants", () => {
    expect(filterByModeration(items, get, true)).toEqual({
      visible: ['ok'],
      // "unknown" (pas encore de statut) compte comme en attente
      stats: { hidden: 1, pending: 2, errors: 1 },
    });
  });
});

describe('createLimiter', () => {
  it('ne dépasse jamais la concurrence demandée et exécute toutes les tâches', async () => {
    const limit = createLimiter(2);
    let active = 0;
    let maxActive = 0;

    const task = (v: number) => () =>
      new Promise<number>((resolve) => {
        active++;
        maxActive = Math.max(maxActive, active);
        setTimeout(() => {
          active--;
          resolve(v);
        }, 5);
      });

    const results = await Promise.all([1, 2, 3, 4, 5].map((v) => limit(task(v))));
    expect(results).toEqual([1, 2, 3, 4, 5]);
    expect(maxActive).toBe(2);
  });

  it("continue la file même si une tâche échoue", async () => {
    const limit = createLimiter(1);
    const failing = limit(() => Promise.reject(new Error('x')));
    const next = limit(() => Promise.resolve('ok'));
    await expect(failing).rejects.toThrow('x');
    await expect(next).resolves.toBe('ok');
  });
});
