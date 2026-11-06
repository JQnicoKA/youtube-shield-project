import { createLimiter } from '../limit';

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

  it('continue la file même si une tâche échoue', async () => {
    const limit = createLimiter(1);
    const failing = limit(() => Promise.reject(new Error('x')));
    const next = limit(() => Promise.resolve('ok'));
    await expect(failing).rejects.toThrow('x');
    await expect(next).resolves.toBe('ok');
  });
});
