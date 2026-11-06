import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { memo, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { ReplyBox } from '@/components/reply-box';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Accent, Spacing } from '@/constants/theme';
import type { ModerationStatus } from '@/services/moderation';
import { hasChannelReplied, type Comment, type CommentThread } from '@/services/youtube';
import { formatRelativeTime } from '@/utils/relative-time';

const BADGE_COLOR = '#30A46C';
const BADGE_SIZE = 16;

type Props = {
  thread: CommentThread;
  myChannelId: string;
  onReply: (threadId: string, text: string) => Promise<unknown>;
  moderation?: ModerationStatus;
  /** Appelé quand on ouvre le commentaire dans YouTube (pour rafraîchir au retour). */
  onOpenOnYouTube?: () => void;
};

function ModerationBadge({ status }: { status?: ModerationStatus }) {
  if (status?.state !== 'done' || status.label !== 'OFF') return null;
  const pct = Number.isFinite(status.scoreOff) ? ` · ${Math.round(status.scoreOff * 100)} %` : '';
  return (
    <View style={styles.offBadge}>
      <ThemedText type="small" style={styles.offBadgeText}>
        ⚠️ Offensant{pct}
      </ThemedText>
    </View>
  );
}

function CommentBody({ comment, avatarSize }: { comment: Comment; avatarSize: number }) {
  return (
    <View style={styles.row}>
      <Avatar uri={comment.author.avatarUrl} name={comment.author.name} size={avatarSize} />
      <View style={styles.flex}>
        <View style={styles.header}>
          <ThemedText type="smallBold" numberOfLines={1} style={styles.flexShrink}>
            {comment.author.name}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            · {formatRelativeTime(comment.publishedAt)}
          </ThemedText>
        </View>
        <ThemedText style={styles.text}>{comment.text}</ThemedText>
        {comment.likeCount > 0 && (
          <ThemedText type="small" themeColor="textSecondary">
            👍 {comment.likeCount}
          </ThemedText>
        )}
      </View>
    </View>
  );
}

export const CommentCard = memo(function CommentCard({
  thread,
  myChannelId,
  onReply,
  moderation,
  onOpenOnYouTube,
}: Props) {
  const [showReplies, setShowReplies] = useState(false);
  const [replying, setReplying] = useState(false);
  const replied = hasChannelReplied(thread, myChannelId);
  const { video } = thread;

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <Pressable
        style={styles.video}
        onPress={() => {
          onOpenOnYouTube?.();
          Linking.openURL(`https://www.youtube.com/watch?v=${thread.videoId}&lc=${thread.id}`);
        }}>
        {video?.thumbnailUrl && (
          <Image source={{ uri: video.thumbnailUrl }} style={styles.thumbnail} contentFit="cover" />
        )}
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.flex}>
          {video?.title ?? 'Vidéo'}
        </ThemedText>
      </Pressable>

      <ModerationBadge status={moderation} />
      <CommentBody comment={thread.comment} avatarSize={40} />

      <View style={styles.footer}>
        {thread.canReply && !replying && (
          <Pressable onPress={() => setReplying(true)} hitSlop={8}>
            <ThemedText type="smallBold" style={{ color: Accent }}>
              Répondre
            </ThemedText>
          </Pressable>
        )}
        {thread.totalReplyCount > 0 && (
          <Pressable onPress={() => setShowReplies((v) => !v)} hitSlop={8}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              {showReplies ? 'Masquer' : 'Voir'} {thread.totalReplyCount} réponse
              {thread.totalReplyCount > 1 ? 's' : ''}
            </ThemedText>
          </Pressable>
        )}
        <View style={styles.badges}>
          {thread.comment.likedByMe && (
            <SymbolView
              name={{ ios: 'heart.fill', android: 'favorite' }}
              size={BADGE_SIZE}
              tintColor={BADGE_COLOR}
              accessibilityLabel="Liké"
            />
          )}
          {replied && (
            <SymbolView
              name={{ ios: 'arrowshape.turn.up.left.fill', android: 'reply' }}
              size={BADGE_SIZE}
              tintColor={BADGE_COLOR}
              accessibilityLabel="Répondu"
            />
          )}
        </View>
      </View>

      {replying && (
        <ReplyBox onSubmit={(text) => onReply(thread.id, text)} onCancel={() => setReplying(false)} />
      )}

      {showReplies && (
        <View style={styles.replies}>
          {thread.replies.map((r) => (
            <CommentBody key={r.id} comment={r} avatarSize={28} />
          ))}
          {thread.totalReplyCount > thread.replies.length && (
            <ThemedText type="small" themeColor="textSecondary">
              + {thread.totalReplyCount - thread.replies.length} autres réponses sur YouTube
            </ThemedText>
          )}
        </View>
      )}
    </ThemedView>
  );
});

const styles = StyleSheet.create({
  card: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two },
  video: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  thumbnail: { width: 48, height: 27, borderRadius: 4 },
  row: { flexDirection: 'row', gap: Spacing.two + Spacing.one },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  flex: { flex: 1 },
  flexShrink: { flexShrink: 1 },
  text: { fontSize: 15, lineHeight: 21, fontWeight: 400 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four, paddingLeft: 48 },
  badges: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginLeft: 'auto' },
  offBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(229, 72, 77, 0.15)',
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  offBadgeText: { color: '#E5484D' },
  replies: { gap: Spacing.three, paddingLeft: 48, marginTop: Spacing.one },
});
