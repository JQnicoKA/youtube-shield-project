# YouTube Shield

App mobile (Expo / React Native) pour un YouTubeur : liste chronologique des commentaires de la chaîne,
avec photo, nom, date et vidéo associée, et réponse directe publiée sur YouTube.
Bouclier : chaque commentaire est analysé par un modèle Azure ML (OFF = offensant, NOT = non offensant)
et les commentaires offensants peuvent être masqués.

## Architecture

```
src/
  app/                      routes expo-router (index = login ou liste)
  components/               UI (comment-card, reply-box, comments-screen, login-screen…)
  hooks/use-comments.ts     TanStack Query : liste paginée + mutation de réponse
  providers/auth-provider   état de connexion + chaîne YouTube connectée
  services/auth/            Google Sign-In (scope youtube.force-ssl)
  services/youtube/         client HTTP, appels API, mapping vers le modèle métier
  services/moderation/      appel du modèle Azure ML, limiteur de concurrence, filtre « bouclier »
  hooks/use-moderation.ts   analyse de chaque commentaire (cache par ID, 4 requêtes max en parallèle)
  hooks/use-shield.ts       analyse par lots au fil du scroll + filtrage
  utils/                    formatage des dates relatives
```

Aucun backend pour la partie YouTube : l'app appelle l'API YouTube Data v3 avec le token OAuth de l'utilisateur.

### API YouTube utilisées (quota : 10 000 unités/jour)

| Appel | Usage | Coût |
|---|---|---|
| `channels.list?mine=true` | chaîne connectée | 1 |
| `commentThreads.list?allThreadsRelatedToChannelId` | commentaires (50/page, ordre chronologique) | 1 |
| `videos.list` | titre et miniature des vidéos (mis en cache) | 1 |
| `comments.insert` | publier une réponse | 50 |

## Mise en place

### 1. Google Cloud Console

1. **APIs & Services > Library** : activer **YouTube Data API v3**.
2. **Google Auth Platform > Audience** : type *External*, statut *Testing*, ajouter le compte Google de la chaîne comme **utilisateur test**.
3. **Data Access** : ajouter le scope `https://www.googleapis.com/auth/youtube.force-ssl`.
4. **Clients > Create client > iOS** : bundle ID `com.jqnicoka.youtubeshield`.
5. (Plus tard, pour Android) un client **Android** (package `com.jqnicoka.youtubeshield` + SHA-1) et un client **Web**.

> En mode *Testing*, Google demande de se reconnecter tous les 7 jours. C'est normal.

### 2. Variables d'environnement

```bash
cp .env.example .env
# puis renseigner EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID (et WEB pour Android)
```

### 3. Lancer sur iPhone (EAS Build, sans Xcode)

Prérequis : Node 22 (`nvm use`), compte Apple Developer, `npx eas-cli@latest login`.
Les ID clients Google sont aussi stockés dans les variables d'environnement EAS (`npx eas-cli@latest env:list`),
car `.env` n'est pas envoyé aux serveurs de build.

```bash
npx eas-cli@latest device:create                                     # 1 fois : enregistrer l'iPhone (QR code)
npx eas-cli@latest build --profile development --platform ios        # build cloud du "dev client"
```

Installer l'app via le lien/QR code donné à la fin du build (iOS 16+ : activer le Mode développeur
dans Réglages > Confidentialité et sécurité). Ensuite, au quotidien :

```bash
npx expo start      # puis ouvrir YouTube Shield sur l'iPhone (même Wi-Fi que le Mac)
```

Il faut refaire un build uniquement si on ajoute une librairie native ou qu'on modifie `app.json` / `app.config.ts`.

## Bouclier anti-commentaires offensants

- Variables : `EXPO_PUBLIC_MODERATION_URL` et `EXPO_PUBLIC_MODERATION_API_KEY` dans `.env`.
- Interrupteur en haut de la liste (activé par défaut) : seuls les commentaires **analysés et non offensants**
  sont affichés ; ceux en cours d'analyse ou en erreur sont masqués par précaution.
- Bouclier désactivé : tout est affiché, avec un badge « ⚠️ Offensant » sur les commentaires concernés.
- Analyse **par lots de 10**, au fil du scroll : le lot suivant part quand on arrive en bas de la liste.
  Si trop de commentaires sont masqués pour remplir l'écran, les lots s'enchaînent seuls (50 analyses max,
  ensuite bouton « Analyser la suite »). Une nouvelle page YouTube n'est chargée qu'une fois tout analysé.
- Clé refusée (401/403) : plus aucun envoi, message explicite dans la barre du bouclier.
- Seul le commentaire principal de chaque fil est analysé (pas les réponses).

> ⚠️ **Sécurité** : les variables `EXPO_PUBLIC_*` sont intégrées à l'app, la clé Azure est donc extractible.
> OK pour un usage perso. Avant toute diffusion, mettre un proxy (ex. Azure Function) qui détient la clé :
> il suffira de pointer `EXPO_PUBLIC_MODERATION_URL` dessus et de vider la clé.

## Scripts

```bash
npm test            # tests unitaires (Jest)
npm run typecheck   # TypeScript
npm run lint        # ESLint
```
