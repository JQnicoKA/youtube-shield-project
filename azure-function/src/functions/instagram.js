import { app } from '@azure/functions';

import { get, igUserId, post } from '../lib/graph.js';
import { badRequest, handle } from '../lib/http.js';

const MEDIA_FIELDS = 'id,caption,permalink,media_type,media_url,thumbnail_url,timestamp,comments_count';
const COMMENT_FIELDS = 'id,text,timestamp,username,like_count';
/** Garde-fou : 20 pages × 100 posts. */
const MAX_MEDIA_PAGES = 20;

const mapMedia = (m) => ({
  id: m.id,
  caption: m.caption ?? '',
  permalink: m.permalink,
  // Pour une vidéo, media_url pointe vers le fichier vidéo : on prend la miniature.
  thumbnailUrl: m.media_type === 'VIDEO' ? m.thumbnail_url : (m.media_url ?? m.thumbnail_url),
  timestamp: m.timestamp,
  commentsCount: m.comments_count ?? 0,
});

const mapComment = (c) => ({
  id: c.id,
  text: c.text ?? '',
  timestamp: c.timestamp,
  username: c.username ?? '',
  likeCount: c.like_count ?? 0,
});

/**
 * GET /api/instagram/media
 * Tous les posts avec leur nombre de commentaires : l'app compare avec les compteurs
 * mémorisés pour savoir quels posts ont de nouveaux commentaires.
 */
app.http('instagramMedia', {
  methods: ['GET'],
  authLevel: 'function',
  route: 'instagram/media',
  handler: handle(async () => {
    const media = [];
    let page = await get(`${igUserId()}/media`, { fields: MEDIA_FIELDS, limit: 100 });
    for (let i = 0; ; i++) {
      media.push(...(page.data ?? []).map(mapMedia));
      const next = page.paging?.next;
      if (!next || i + 1 >= MAX_MEDIA_PAGES) break;
      page = await get(next);
    }
    return { media };
  }),
});

/**
 * GET /api/instagram/media/{mediaId}/comments?after=<curseur>
 * Commentaires de premier niveau (50 max par page, du plus récent au plus ancien) + leurs réponses.
 */
app.http('instagramComments', {
  methods: ['GET'],
  authLevel: 'function',
  route: 'instagram/media/{mediaId}/comments',
  handler: handle(async (request) => {
    const mediaId = request.params.mediaId;
    if (!/^\d+$/.test(mediaId)) throw badRequest('mediaId invalide');
    const params = { fields: `${COMMENT_FIELDS},replies{${COMMENT_FIELDS}}`, limit: 50 };
    const after = request.query.get('after');
    if (after) params.after = after;

    const page = await get(`${mediaId}/comments`, params);
    return {
      comments: (page.data ?? []).map((c) => ({
        ...mapComment(c),
        replies: (c.replies?.data ?? []).map(mapComment),
      })),
      nextCursor: page.paging?.next ? page.paging.cursors?.after : null,
    };
  }),
});

/**
 * POST /api/instagram/comments/{commentId}/replies   body : { "message": "..." }
 */
app.http('instagramReply', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'instagram/comments/{commentId}/replies',
  handler: handle(async (request) => {
    const commentId = request.params.commentId;
    if (!/^\d+$/.test(commentId)) throw badRequest('commentId invalide');
    const body = await request.json().catch(() => ({}));
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!message) throw badRequest('message vide');
    if (message.length > 2200) throw badRequest('message trop long (2200 caractères max)');

    const res = await post(`${commentId}/replies`, { message });
    return { id: res.id };
  }),
});
