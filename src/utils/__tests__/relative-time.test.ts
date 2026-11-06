import { formatRelativeTime } from '../relative-time';

const now = new Date('2026-11-06T12:00:00Z');
const ago = (seconds: number) => new Date(now.getTime() - seconds * 1000).toISOString();

describe('formatRelativeTime', () => {
  it.each([
    [10, "à l'instant"],
    [5 * 60, 'il y a 5 min'],
    [3 * 3600, 'il y a 3 h'],
    [86400, 'il y a 1 jour'],
    [2 * 86400, 'il y a 2 jours'],
    [14 * 86400, 'il y a 2 semaines'],
    [60 * 86400, 'il y a 2 mois'],
    [400 * 86400, 'il y a 1 an'],
    [800 * 86400, 'il y a 2 ans'],
  ])('%i s -> %s', (seconds, expected) => {
    expect(formatRelativeTime(ago(seconds), now)).toBe(expected);
  });

  it('renvoie une chaîne vide pour une date invalide', () => {
    expect(formatRelativeTime('pas une date', now)).toBe('');
  });
});
