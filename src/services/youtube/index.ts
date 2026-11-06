import { getAccessToken } from '@/services/auth/google-auth';

import { createYouTubeApi } from './api';
import { createYouTubeClient } from './client';

export const youtube = createYouTubeApi(createYouTubeClient(getAccessToken));

export { YouTubeApiError } from './client';
export { hasChannelReplied } from './mappers';
export type * from './types';
