import { Appearance } from 'react-native';

import { restoreColorScheme, setColorScheme } from '../color-scheme';

const mockStorage = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k: string) => mockStorage.get(k) ?? null),
    setItem: jest.fn(async (k: string, v: string) => void mockStorage.set(k, v)),
  },
}));

describe('color-scheme', () => {
  beforeEach(() => {
    mockStorage.clear();
    jest.spyOn(Appearance, 'setColorScheme').mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  it('applique et mémorise le thème choisi', async () => {
    setColorScheme('light');
    expect(Appearance.setColorScheme).toHaveBeenCalledWith('light');
    await Promise.resolve();
    expect(mockStorage.get('preferences.colorScheme')).toBe('light');
  });

  it('restaure le thème mémorisé au lancement', async () => {
    mockStorage.set('preferences.colorScheme', 'dark');
    await restoreColorScheme();
    expect(Appearance.setColorScheme).toHaveBeenCalledWith('dark');
  });

  it("garde le thème du système s'il n'y a rien (ou une valeur invalide)", async () => {
    await restoreColorScheme();
    mockStorage.set('preferences.colorScheme', 'violet');
    await restoreColorScheme();
    expect(Appearance.setColorScheme).not.toHaveBeenCalled();
  });
});
