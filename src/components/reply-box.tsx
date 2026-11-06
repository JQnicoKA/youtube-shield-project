import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Accent, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const MAX_LENGTH = 10_000; // limite YouTube

type Props = {
  onSubmit: (text: string) => Promise<unknown>;
  onCancel: () => void;
};

export function ReplyBox({ onSubmit, onCancel }: Props) {
  const theme = useTheme();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = text.trim();
  const canSend = trimmed.length > 0 && !sending;

  async function handleSend() {
    if (!canSend) return;
    setSending(true);
    setError(null);
    try {
      await onSubmit(trimmed);
      setText('');
      onCancel();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l'envoi");
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={styles.container}>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Écrire une réponse publique…"
        placeholderTextColor={theme.textSecondary}
        multiline
        autoFocus
        maxLength={MAX_LENGTH}
        editable={!sending}
        style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundSelected }]}
      />
      {error && (
        <ThemedText type="small" style={styles.error}>
          {error}
        </ThemedText>
      )}
      <View style={styles.actions}>
        <Pressable onPress={onCancel} disabled={sending} hitSlop={8}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Annuler
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={handleSend}
          disabled={!canSend}
          style={[styles.send, { opacity: canSend ? 1 : 0.4 }]}>
          {sending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <ThemedText type="smallBold" style={styles.sendText}>
              Répondre
            </ThemedText>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two, marginTop: Spacing.two },
  input: {
    minHeight: 44,
    maxHeight: 160,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
    fontSize: 15,
  },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: Spacing.three },
  send: {
    backgroundColor: Accent,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minWidth: 96,
    alignItems: 'center',
  },
  sendText: { color: '#fff' },
  error: { color: '#E5484D' },
});
