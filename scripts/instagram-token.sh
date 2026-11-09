#!/usr/bin/env bash
# Vérifie un jeton Instagram « Unified Login » (System-user access token) sans jamais l'afficher,
# puis l'enregistre pour l'Azure Function. Aucune Page Facebook requise.
#
#   1. GET /me/assigned_instagram_accounts  → ID du compte Instagram pro
#   2. GET /{ig-id}                         → vérifie l'accès
#   3. GET /debug_token                     → expiration + autorisations
#   4. Enregistre IG_USER_ID + IG_ACCESS_TOKEN dans la Function App
#      (si AZ_RESOURCE_GROUP et AZ_FUNCTION_APP sont définis), sinon copie le jeton dans le presse-papiers.
#
# Doc : https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-unified-login/get-started
#
# À lancer dans un Terminal séparé (pas via « ! » dans Claude Code) :
#   ./scripts/instagram-token.sh
#   AZ_RESOURCE_GROUP=mon-rg AZ_FUNCTION_APP=ma-func ./scripts/instagram-token.sh
set -euo pipefail

GRAPH="https://graph.facebook.com/${GRAPH_VERSION:-v27.0}"

command -v jq >/dev/null || { echo "jq est requis (brew install jq)"; exit 1; }

fail_on_error() {
  local msg
  msg=$(jq -r '.error.message // empty' <<<"$1")
  if [[ -n "$msg" ]]; then echo "❌ $2 : $msg" >&2; exit 1; fi
}

read -rsp "Jeton Instagram (Unified Login, masqué) : " TOKEN; echo

# 1. Compte Instagram assigné au jeton (/me = l'utilisateur système, pas le compte Instagram)
res=$(curl -sS -G "$GRAPH/me/assigned_instagram_accounts" \
  --data-urlencode 'fields=id,username' \
  --data-urlencode "access_token=$TOKEN")
fail_on_error "$res" "Lecture des comptes Instagram"
count=$(jq '.data | length' <<<"$res")
if [[ "$count" -eq 0 ]]; then
  echo "❌ Aucun compte Instagram n'est assigné à ce jeton." >&2
  echo "   Vérifie que la configuration Unified Login inclut ton compte Instagram comme élément (asset)." >&2
  exit 1
fi
jq -r '.data | to_entries[] | "  [\(.key)] @\(.value.username)"' <<<"$res"
idx=0
if [[ "$count" -gt 1 ]]; then read -rp "Numéro du compte à utiliser : " idx; fi
IG_USER_ID=$(jq -r ".data[$idx].id" <<<"$res")

# 2. Accès au compte
res=$(curl -sS -G "$GRAPH/$IG_USER_ID" \
  --data-urlencode 'fields=username,media_count' \
  --data-urlencode "access_token=$TOKEN")
fail_on_error "$res" "Accès au compte Instagram"
echo "✅ Accès Instagram OK : @$(jq -r '.username' <<<"$res") ($(jq -r '.media_count' <<<"$res") posts)"

# 3. Expiration + autorisations (un jeton peut s'inspecter lui-même)
res=$(curl -sS -G "$GRAPH/debug_token" \
  --data-urlencode "input_token=$TOKEN" \
  --data-urlencode "access_token=$TOKEN")
if [[ -z "$(jq -r '.error.message // empty' <<<"$res")" ]]; then
  expires=$(jq -r '.data.expires_at // 0' <<<"$res")
  if [[ "$expires" == "0" ]]; then echo "✅ Jeton : n'expire pas"
  else echo "⚠️  Jeton : expire le $(date -r "$expires")"; fi
  scopes=$(jq -r '.data.scopes // [] | join(", ")' <<<"$res")
  echo "   Autorisations : $scopes"
  for s in instagram_basic instagram_manage_comments; do
    jq -e --arg s "$s" '.data.scopes // [] | index($s)' <<<"$res" >/dev/null || echo "⚠️  Autorisation manquante : $s"
  done
else
  echo "ℹ️  Impossible d'inspecter le jeton (sans gravité) : $(jq -r '.error.message' <<<"$res")"
fi

# 4. Stockage
if [[ -n "${AZ_RESOURCE_GROUP:-}" && -n "${AZ_FUNCTION_APP:-}" ]]; then
  az functionapp config appsettings set \
    --resource-group "$AZ_RESOURCE_GROUP" --name "$AZ_FUNCTION_APP" \
    --settings "IG_USER_ID=$IG_USER_ID" "IG_ACCESS_TOKEN=$TOKEN" \
    --output none
  echo "✅ IG_USER_ID et IG_ACCESS_TOKEN enregistrés dans $AZ_FUNCTION_APP"
else
  echo "   IG_USER_ID = $IG_USER_ID"
  echo "   (IG_ACCESS_TOKEN = le jeton que tu viens de coller)"
fi
