import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
  type User,
} from '@react-native-google-signin/google-signin';

import { config, YOUTUBE_SCOPE } from '@/config';

let configured = false;

export function configureGoogleSignIn() {
  if (configured) return;
  GoogleSignin.configure({
    iosClientId: config.googleIosClientId || undefined,
    webClientId: config.googleWebClientId || undefined,
    scopes: [YOUTUBE_SCOPE],
    offlineAccess: false,
  });
  configured = true;
}

function hasYouTubeScope(user: User): boolean {
  return user.scopes?.includes(YOUTUBE_SCOPE) ?? false;
}

/** S'assure que l'utilisateur a accordé l'accès YouTube (il peut le refuser à la connexion). */
async function ensureYouTubeScope(user: User): Promise<User | null> {
  if (hasYouTubeScope(user)) return user;
  const res = await GoogleSignin.addScopes({ scopes: [YOUTUBE_SCOPE] });
  return res && isSuccessResponse(res) && hasYouTubeScope(res.data) ? res.data : null;
}

/** Restaure la session précédente sans afficher d'écran. */
export async function restoreSession(): Promise<User | null> {
  configureGoogleSignIn();
  try {
    const res = await GoogleSignin.signInSilently();
    if (res.type !== 'success') return null;
    return hasYouTubeScope(res.data) ? res.data : null;
  } catch {
    return null;
  }
}

export class SignInError extends Error {}

/** Lance la connexion Google. Renvoie null si l'utilisateur annule. */
export async function signIn(): Promise<User | null> {
  configureGoogleSignIn();
  try {
    await GoogleSignin.hasPlayServices();
    const res = await GoogleSignin.signIn();
    if (!isSuccessResponse(res)) return null;

    const user = await ensureYouTubeScope(res.data);
    if (!user) {
      throw new SignInError("L'accès à YouTube est nécessaire pour lire et répondre aux commentaires.");
    }
    return user;
  } catch (e) {
    if (e instanceof SignInError) throw e;
    if (isErrorWithCode(e)) {
      if (e.code === statusCodes.IN_PROGRESS) return null;
      if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new SignInError('Google Play Services indisponible sur cet appareil.');
      }
    }
    throw new SignInError(e instanceof Error ? e.message : 'Connexion Google impossible.');
  }
}

export async function signOut(): Promise<void> {
  await GoogleSignin.signOut();
}

/** Access token valide ; le SDK le renouvelle automatiquement s'il a expiré. */
export async function getAccessToken(): Promise<string> {
  const { accessToken } = await GoogleSignin.getTokens();
  return accessToken;
}
