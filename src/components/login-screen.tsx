import { GoogleSigninButton } from '@react-native-google-signin/google-signin';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/providers/auth-provider';

export function LoginScreen() {
  const { signIn, error } = useAuth();

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle" style={styles.center}>
        YouTube Shield
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.center}>
        Connecte le compte Google de ta chaîne pour voir et répondre à tes commentaires.
      </ThemedText>
      <GoogleSigninButton
        size={GoogleSigninButton.Size.Wide}
        color={GoogleSigninButton.Color.Dark}
        onPress={signIn}
      />
      {error && (
        <ThemedText type="small" style={[styles.center, styles.error]}>
          {error}
        </ThemedText>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.four,
  },
  center: { textAlign: 'center' },
  error: { color: '#E5484D' },
});
