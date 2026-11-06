import { BlurView } from 'expo-blur';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Accent, Spacing } from '@/constants/theme';
import type { Channel } from '@/services/youtube';

type Props = {
  visible: boolean;
  channel: Channel;
  email?: string;
  onClose: () => void;
  onSignOut: () => Promise<void>;
};

export function AccountModal({ visible, channel, email, onClose, onSignOut }: Props) {
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await onSignOut();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* Fond flouté (iOS). Sur Android, le flou ne traverse pas la fenêtre du Modal : fond assombri. */}
      {Platform.OS === 'ios' ? (
        <BlurView intensity={90} tint="systemThinMaterialDark" style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.androidDim]} />
      )}
      {/* Toucher le fond ferme la fenêtre */}
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Fermer">
        {/* Le Pressable intérieur empêche qu'un toucher sur la carte ne la ferme */}
        <Pressable onPress={() => {}}>
          <ThemedView style={styles.card}>
            <Pressable style={styles.close} onPress={onClose} hitSlop={12} accessibilityLabel="Fermer">
              <SymbolView
                name={{ ios: 'xmark.circle.fill', android: 'cancel' }}
                size={26}
                tintColor="#8E8E93"
              />
            </Pressable>

            <Avatar uri={channel.avatarUrl} name={channel.title} size={88} />

            <View style={styles.identity}>
              <ThemedText type="smallBold" style={styles.title} numberOfLines={2}>
                {channel.title}
              </ThemedText>
              {email && (
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                  {email}
                </ThemedText>
              )}
            </View>

            <Pressable
              onPress={handleSignOut}
              disabled={signingOut}
              style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}>
              {signingOut ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <SymbolView
                    name={{ ios: 'rectangle.portrait.and.arrow.right', android: 'logout' }}
                    size={18}
                    tintColor="#fff"
                  />
                  <ThemedText type="smallBold" style={styles.signOutText}>
                    Se déconnecter
                  </ThemedText>
                </>
              )}
            </Pressable>
          </ThemedView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  androidDim: { backgroundColor: 'rgba(0, 0, 0, 0.7)' },
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  card: {
    width: 300,
    borderRadius: 24,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.four,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    gap: Spacing.three,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  close: { position: 'absolute', top: Spacing.three, right: Spacing.three },
  identity: { alignItems: 'center', gap: Spacing.half },
  title: { fontSize: 18, lineHeight: 24, textAlign: 'center' },
  signOut: {
    marginTop: Spacing.two,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    backgroundColor: Accent,
    borderRadius: 999,
    paddingVertical: Spacing.three,
    minHeight: 50,
  },
  pressed: { opacity: 0.8 },
  signOutText: { color: '#fff', fontSize: 16 },
});
