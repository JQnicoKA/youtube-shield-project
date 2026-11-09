import { isNativeStorageAvailable } from '@/services/theme/native-storage';

import type { FeedState } from './sync';

const STORAGE_KEY = 'instagram.feed.v1';

type Storage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

let storage: Storage | null | undefined;

/** Même garde que pour le thème : sans le module natif, l'état n'est pas mémorisé (pas de crash). */
function getStorage(): Storage | null {
  if (storage === undefined) {
    storage = isNativeStorageAvailable()
      ? // eslint-disable-next-line @typescript-eslint/no-require-imports
        (require('@react-native-async-storage/async-storage').default as Storage)
      : null;
  }
  return storage;
}

export async function loadFeedState(): Promise<FeedState | null> {
  try {
    const raw = await getStorage()?.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FeedState;
    return parsed && typeof parsed.counts === 'object' && Array.isArray(parsed.threads) ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveFeedState(state: FeedState): Promise<void> {
  try {
    await getStorage()?.setItem(STORAGE_KEY, JSON.stringify({ counts: state.counts, threads: state.threads }));
  } catch {
    // non bloquant : au pire, la prochaine synchro recharge plus de posts
  }
}
