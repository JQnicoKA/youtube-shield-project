import { Appearance } from 'react-native';

import { restoreColorScheme, setColorScheme } from '../color-scheme';

// Build installée sans le module natif AsyncStorage
jest.mock('../native-storage', () => ({ isNativeStorageAvailable: () => false }));
jest.mock('@react-native-async-storage/async-storage', () => {
  throw new Error('NativeModule: AsyncStorage is null');
});

describe('color-scheme sans AsyncStorage natif', () => {
  it("change le thème sans jamais charger AsyncStorage (pas d'erreur)", async () => {
    const spy = jest.spyOn(Appearance, 'setColorScheme').mockImplementation(() => {});
    expect(() => setColorScheme('light')).not.toThrow();
    expect(spy).toHaveBeenCalledWith('light');
    await expect(restoreColorScheme()).resolves.toBeUndefined();
  });
});
