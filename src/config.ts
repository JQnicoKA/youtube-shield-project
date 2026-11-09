export const config = {
  googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
  googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
  /**
   * Endpoint de classification des commentaires (Azure ML).
   * ⚠️ Les variables EXPO_PUBLIC_ sont intégrées au bundle de l'app : la clé est extractible.
   * Acceptable pour un usage perso ; avant toute diffusion, passer par un proxy qui détient la clé
   * (il suffira alors de changer l'URL et de vider la clé).
   */
  moderationUrl: process.env.EXPO_PUBLIC_MODERATION_URL ?? '',
  moderationApiKey: process.env.EXPO_PUBLIC_MODERATION_API_KEY ?? '',
  /**
   * Instagram API with Unified Login : ID du compte pro + jeton d'utilisateur système.
   * ⚠️ Même remarque que pour la clé Azure : intégrés au bundle, acceptable pour un usage perso.
   */
  igUserId: process.env.EXPO_PUBLIC_IG_USER_ID ?? '',
  igAccessToken: process.env.EXPO_PUBLIC_IG_ACCESS_TOKEN ?? '',
};

/** Scope requis pour lire les commentaires de la chaîne ET y répondre. */
export const YOUTUBE_SCOPE = 'https://www.googleapis.com/auth/youtube.force-ssl';
