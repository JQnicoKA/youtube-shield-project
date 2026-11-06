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
import { ShieldBar } from '@/components/shield-bar';
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
  const shield = useShield(threads, query);
  const { getStatus } = shield;

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
        onOpenOnYouTube={onOpenOnYouTube}
      />
    ),
    [channel.id, onReply, getStatus, onOpenOnYouTube],
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
          data={shield.visible}
          extraData={shield.statuses}
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
          onEndReached={shield.onEndReached}
          onEndReachedThreshold={0.5}
          onViewableItemsChanged={shield.onViewableItemsChanged}
          ListHeaderComponent={
            shield.enabled ? (
              <ShieldBar
                enabled={shield.shieldOn}
                onToggle={shield.setShieldOn}
                stats={shield.stats}
                fatalError={shield.fatalError}
                onRetryErrors={shield.retryErrors}
              />
            ) : undefined
          }
          ListEmptyComponent={
            shield.analyzing ? undefined : (
              <ThemedText themeColor="textSecondary" style={styles.centerText}>
                {threads.length > 0 ? 'Aucun commentaire à afficher.' : 'Aucun commentaire pour l\u2019instant.'}
              </ThemedText>
            )
          }
          ListFooterComponent={
            query.isFetchingNextPage || (shield.shieldOn && shield.analyzing) ? (
              <View style={styles.footer}>
                <ActivityIndicator />
                {shield.shieldOn && shield.analyzing && (
                  <ThemedText type="small" themeColor="textSecondary">
                    Analyse des commentaires…
                  </ThemedText>
                )}
              </View>
            ) : shield.canAnalyzeMore ? (
              <Pressable onPress={shield.analyzeMore} style={styles.footer}>
                <ThemedText type="linkPrimary">Analyser la suite</ThemedText>
              </Pressable>
            ) : undefined
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
  footer: { marginVertical: Spacing.four, alignItems: 'center', gap: Spacing.two },
});
