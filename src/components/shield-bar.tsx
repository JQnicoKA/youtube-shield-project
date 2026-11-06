import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Accent, Spacing } from '@/constants/theme';
import type { FilterStats } from '@/services/moderation';

type Props = {
  enabled: boolean;
  onToggle: (value: boolean) => void;
  stats: FilterStats;
  onRetryErrors: () => void;
};

export function ShieldBar({ enabled, onToggle, stats, onRetryErrors }: Props) {
  const parts = [
    stats.hidden > 0 && `${stats.hidden} masqué${stats.hidden > 1 ? 's' : ''}`,
    stats.pending > 0 && `${stats.pending} en analyse`,
  ].filter(Boolean);

  return (
    <ThemedView type="backgroundElement" style={styles.container}>
      <View style={styles.row}>
        <View style={styles.flex}>
          <ThemedText type="smallBold">🛡️ Masquer les commentaires offensants</ThemedText>
          {enabled && parts.length > 0 && (
            <ThemedText type="small" themeColor="textSecondary">
              {parts.join(' · ')}
            </ThemedText>
          )}
        </View>
        <Switch value={enabled} onValueChange={onToggle} trackColor={{ true: Accent }} />
      </View>
      {enabled && stats.errors > 0 && (
        <Pressable onPress={onRetryErrors} hitSlop={8}>
          <ThemedText type="small" style={styles.error}>
            {stats.errors} non analysé{stats.errors > 1 ? 's' : ''} (erreur) · Réessayer
          </ThemedText>
        </Pressable>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  flex: { flex: 1 },
  error: { color: '#E5484D' },
});
