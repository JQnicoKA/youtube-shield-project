import { Stack } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';

import { AccountModal } from '@/components/account-modal';
import { Avatar } from '@/components/avatar';
import { CommentCard } from '@/components/comment-card';
import { ThemeToggle } from '@/components/theme-toggle';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useCommentThreads, useReplyToComment } from '@/hooks/use-comments';
import { useShield } from '@/hooks/use-shield';
import { useAuth } from '@/providers/auth-provider';
import { YouTubeApiError, type Channel, type CommentThread } from '@/services/youtube';

function errorMessage(error: unknown): string {
  if (error instanceof YouTubeApiError) {
    switch (error.kind) {
      case 'quota':
        return 'Quota YouTube du jour épuisé. Réessaie demain (remise à zéro vers 9h, heure de Paris).';
      case 'auth':
        return 'Session expirée, reconnecte-toi.';
      case 'forbidden':
        return `Accès refusé par YouTube : ${error.message}`;
      case 'network':
        return 'Pas de connexion internet.';
    }
  }
  return error instanceof Error ? error.message : 'Erreur inconnue';
}

function toReplyError(error: unknown): Error {
  return new Error(errorMessage(error));
}

export function CommentsScreen({ channel }: { channel: Channel }) {
  const { signOut, user } = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);
  const query = useCommentThreads(channel.id);
  const { mutateAsync: postReply } = useReplyToComment(channel.id);

  const threads = useMemo(() => query.data?.pages.flatMap((p) => p.threads) ?? [], [query.data]);
  const shield = useShield(threads);
  const { getStatus } = shield;

  // Commentaires dévoilés via « See anyway » (gardé ici : FlatList démonte les cartes hors écran).
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(() => new Set());
  const onRevealChange = useCallback((threadId: string, show: boolean) => {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (show) next.add(threadId);
      else next.delete(threadId);
      return next;
    });
  }, []);

  // Retour depuis YouTube (ex. après avoir liké) : on rafraîchit pour mettre à jour les badges.
  // Uniquement si on y est allé depuis l'app, pour ne pas consommer de quota à chaque réouverture.
  const openedYouTube = useRef(false);
  const onOpenOnYouTube = useCallback(() => {
    openedYouTube.current = true;
  }, []);
  const { refetch } = query;
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && openedYouTube.current) {
        openedYouTube.current = false;
        refetch();
      }
    });
    return () => sub.remove();
  }, [refetch]);

  const onReply = useCallback(
    (threadId: string, text: string) =>
      postReply({ threadId, text }).catch((e) => {
        throw toReplyError(e);
      }),
    [postReply],
  );

  const renderItem = useCallback(
    ({ item }: { item: CommentThread }) => (
      <CommentCard
        thread={item}
        myChannelId={channel.id}
        onReply={onReply}
        moderation={getStatus(item)}
        revealed={revealed.has(item.id)}
        onRevealChange={onRevealChange}
        onOpenOnYouTube={onOpenOnYouTube}
      />
    ),
    [channel.id, onReply, getStatus, revealed, onRevealChange, onOpenOnYouTube],
  );

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Pressable onPress={() => setAccountOpen(true)} hitSlop={8} accessibilityLabel="Compte">
              <Avatar uri={channel.avatarUrl} name={channel.title} size={30} />
            </Pressable>
          ),
          headerRight: () => <ThemeToggle />,
        }}
      />

      <AccountModal
        visible={accountOpen}
        channel={channel}
        email={user?.user.email}
        onClose={() => setAccountOpen(false)}
        onSignOut={async () => {
          setAccountOpen(false);
          await signOut();
        }}
      />

      {query.isPending ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : query.isError && threads.length === 0 ? (
        <View style={styles.center}>
          <ThemedText style={styles.centerText}>{errorMessage(query.error)}</ThemedText>
          <Pressable onPress={() => query.refetch()}>
            <ThemedText type="linkPrimary">Réessayer</ThemedText>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={threads}
          extraData={[shield.statuses, revealed]}
          keyExtractor={(t) => t.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          contentInsetAdjustmentBehavior="automatic"
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching && !query.isFetchingNextPage}
              onRefresh={() => void query.refetch()}
            />
          }
          onEndReached={() => query.hasNextPage && !query.isFetchingNextPage && query.fetchNextPage()}
          onEndReachedThreshold={0.5}
          onViewableItemsChanged={shield.onViewableItemsChanged}
          ListHeaderComponent={
            shield.fatalError ? (
              <Pressable onPress={shield.retryErrors} style={styles.banner}>
                <ThemedText type="small" style={styles.bannerText}>
                  Analyse des commentaires indisponible : {shield.fatalError}. Toucher pour réessayer.
                </ThemedText>
              </Pressable>
            ) : undefined
          }
          ListEmptyComponent={
            <ThemedText themeColor="textSecondary" style={styles.centerText}>
              Aucun commentaire pour l&apos;instant.
            </ThemedText>
          }
          ListFooterComponent={
            query.isFetchingNextPage ? <ActivityIndicator style={styles.footer} /> : undefined
          }
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.four },
  centerText: { textAlign: 'center' },
  list: { padding: Spacing.three, gap: Spacing.three },
  footer: { marginVertical: Spacing.four },
  banner: {
    backgroundColor: 'rgba(229, 72, 77, 0.12)',
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  bannerText: { color: '#E5484D' },
});
