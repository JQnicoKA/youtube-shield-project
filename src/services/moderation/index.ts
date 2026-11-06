import { config } from '@/config';

import { createModerationClient } from './client';
import { createLimiter } from './limit';

const MAX_CONCURRENT_REQUESTS = 4;

export const isModerationConfigured = !!config.moderationUrl;

const classifyRaw = createModerationClient({
  url: config.moderationUrl,
  apiKey: config.moderationApiKey || undefined,
});
const limit = createLimiter(MAX_CONCURRENT_REQUESTS);

export const classifyComment = (text: string) => limit(() => classifyRaw(text));

export { ModerationError, type ModerationLabel, type ModerationResult } from './client';
export { blurReason, type BlurReason, type ModerationStatus } from './status';
