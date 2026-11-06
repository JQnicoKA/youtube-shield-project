import { NativeModules, TurboModuleRegistry } from 'react-native';

/**
 * Le module natif d'AsyncStorage est-il dans la build installée ?
 * (Mêmes noms que ceux cherchés par la librairie.) On le vérifie AVANT de l'importer :
 * en développement, Metro signale comme fatale l'erreur levée par un module à son chargement,
 * même si elle est interceptée par un try/catch.
 */
export function isNativeStorageAvailable(): boolean {
  const names = ['RNCAsyncStorage', 'RNC_AsyncSQLiteDBStorage', 'PlatformLocalStorage'];
  return names.some((n) => !!(TurboModuleRegistry?.get(n) ?? NativeModules[n]));
}
