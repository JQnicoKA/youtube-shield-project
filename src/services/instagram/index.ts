import { config } from '@/config';

import { createInstagramApi } from './api';
import { createInstagramClient } from './client';
import { loadFeedState, saveFeedState } from './store';
import { syncFeed, type InstagramFeed } from './sync';

export const isInstagramConfigured = !!config.igUserId && !!config.igAccessToken;

export const instagram = createInstagramApi(createInstagramClient(config.igAccessToken), config.igUserId);

/** Charge l'état mémorisé, synchronise avec Instagram, puis mémorise le nouvel état. */
export async function syncInstagramFeed(): Promise<InstagramFeed> {
  const feed = await syncFeed(instagram, await loadFeedState());
  await saveFeedState(feed);
  return feed;
}

export { saveFeedState } from './store';
export { IG_MAX_COMMENT_LENGTH } from './api';
export { InstagramApiError } from './client';
export type { InstagramFeed } from './sync';
export type { IgProfile } from './types';
