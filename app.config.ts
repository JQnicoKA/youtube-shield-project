import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Complète app.json avec la config Google Sign-In.
 * Le "iosUrlScheme" est l'ID client iOS inversé :
 *   123-abc.apps.googleusercontent.com -> com.googleusercontent.apps.123-abc
 */
function reverseClientId(clientId: string | undefined): string | undefined {
  if (!clientId) return undefined;
  return clientId.split('.').reverse().join('.');
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const iosUrlScheme = reverseClientId(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID);

  if (!iosUrlScheme) {
    console.warn(
      '[app.config] EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID manquant : la connexion Google ne fonctionnera pas sur iOS.',
    );
  }

  return {
    ...(config as ExpoConfig),
    plugins: [
      ...(config.plugins ?? []),
      [
        '@react-native-google-signin/google-signin',
        { iosUrlScheme: iosUrlScheme ?? 'com.googleusercontent.apps.missing' },
      ],
    ],
  };
};
