import { Appearance, type ColorSchemeName } from 'react-native';

const STORAGE_KEY = 'preferences.colorScheme';

type Storage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

/**
 * AsyncStorage est un module natif : s'il n'est pas encore dans la build installée,
 * son import échoue. On le charge donc à la demande, et sans lui le choix n'est
 * simplement pas mémorisé entre deux lancements.
 */
function getStorage(): Storage | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-async-storage/async-storage').default as Storage;
  } catch {
    return null;
  }
}

/** Applique le thème choisi lors d'une session précédente (sinon : celui de l'iPhone). */
export async function restoreColorScheme(): Promise<void> {
  try {
    const saved = await getStorage()?.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') Appearance.setColorScheme(saved);
  } catch {
    // préférence illisible : on garde le thème du système
  }
}

/** Force le thème de toute l'app (y compris les éléments natifs : en-tête, flou…) et le mémorise. */
export function setColorScheme(scheme: NonNullable<ColorSchemeName>): void {
  Appearance.setColorScheme(scheme);
  getStorage()
    ?.setItem(STORAGE_KEY, scheme)
    .catch(() => {});
}
