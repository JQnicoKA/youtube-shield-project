import { Stack } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { CommentCard } from '@/components/comment-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useCommentThreads, useReplyToComment } from '@/hooks/use-comments';
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
  const { signOut } = useAuth();
  const query = useCommentThreads(channel.id);
  const reply = useReplyToComment(channel.id);

  const threads = useMemo(() => query.data?.pages.flatMap((p) => p.threads) ?? [], [query.data]);

  const onReply = useCallback(
    (threadId: string, text: string) =>
      reply.mutateAsync({ threadId, text }).catch((e) => {
        throw toReplyError(e);
      }),
    [reply],
  );

  const renderItem = useCallback(
    ({ item }: { item: CommentThread }) => (
      <CommentCard thread={item} myChannelId={channel.id} onReply={onReply} />
    ),
    [channel.id, onReply],
  );

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen
        options={{
          headerLeft: () => <Avatar uri={channel.avatarUrl} name={channel.title} size={28} />,
          headerRight: () => (
            <Pressable onPress={signOut} hitSlop={8}>
              <ThemedText type="small">Déconnexion</ThemedText>
            </Pressable>
          ),
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
});
