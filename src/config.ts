export const config = {
  googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
  googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
};

/** Scope requis pour lire les commentaires de la chaîne ET y répondre. */
export const YOUTUBE_SCOPE = 'https://www.googleapis.com/auth/youtube.force-ssl';
