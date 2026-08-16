# Auth GitHub + mot de passe en secours — Design

Date : 2026-08-16
Statut : validé par Alexandre le 2026-08-16 (implémentation différée — à reprendre quand les
crédits seront disponibles à nouveau)

## Problème

Le système d'auth actuel d'Alex Hub (voir `docs/superpowers/specs/2026-08-16-alex-hub-design.md`)
repose sur un mot de passe unique partagé, comparé en clair côté serveur, sans notion
d'identité : n'importe qui connaissant le mot de passe peut se connecter, le système ne sait
pas "qui" s'est connecté. Alexandre veut une méthode d'authentification liée à son identité
réelle (son compte GitHub), tout en gardant le mot de passe comme méthode de secours (accès
rapide depuis un appareil non connecté à GitHub, ou si GitHub est indisponible).

## Objectif

Remplacer le système de session fait-maison par **Auth.js** (next-auth v5), configuré avec deux
providers :
1. **GitHub OAuth** — restreint à un seul compte GitHub identifié par variable d'env.
2. **Credentials** — réutilise la vérification par mot de passe existante.

## Décisions actées avec Alexandre

- **Lib** : Auth.js / next-auth (pas de flow OAuth fait main, pas de lib bas-niveau type Arctic)
  — "on ne réinvente pas la roue, minimum nécessaire des libs existantes".
- **Les deux méthodes cohabitent** : GitHub en principal, mot de passe en secours — pas un
  remplacement pur et simple.
- **Restriction au seul compte d'Alexandre** : via un callback `signIn` qui compare le
  `username` GitHub retourné à une variable d'env (`ALLOWED_GITHUB_USERNAME`) ; refus explicite
  si ça ne correspond pas, même si l'authentification GitHub elle-même a réussi.

## Architecture

Auth.js gère la session (JWT signé, cookie httpOnly géré par la lib) à la place du système
HMAC fait-maison. `middleware.ts` se simplifie : un seul appel à la fonction `auth()` d'Auth.js
au lieu de la logique `isValidSessionToken` custom.

```
Visiteur → /login
   ├─ clique "Se connecter avec GitHub"
   │     → redirection OAuth GitHub → callback /api/auth/callback/github
   │     → Auth.js échange le code, récupère le profil GitHub
   │     → callback signIn() compare profile.login à ALLOWED_GITHUB_USERNAME
   │           ├─ match → session créée, redirection vers /
   │           └─ pas match → accès refusé, retour à /login avec erreur
   └─ ou saisit le mot de passe
         → provider Credentials → authorize() appelle checkPassword() (inchangé)
               ├─ correct → session créée, redirection vers /
               └─ incorrect → erreur affichée
```

## Fichiers impactés

**Créés :**
- `src/app/api/auth/[...nextauth]/route.ts` — handler de routes Auth.js (GET/POST)
- `src/lib/auth-config.ts` (ou équivalent) — configuration Auth.js : les deux providers, le
  callback `signIn` de restriction GitHub, le callback `authorize` du provider Credentials
  (délègue à `checkPassword`)

**Modifiés :**
- `middleware.ts` (déplacé en `src/middleware.ts` depuis le fix du 2026-08-16, voir la page
  Notion "Serveur OVH") — remplace l'appel à `isValidSessionToken` par l'intégration middleware
  d'Auth.js (`auth()` wrapper, ou `auth.protect()` selon l'API stable au moment de
  l'implémentation — **à vérifier dans la doc Auth.js v5 au moment de coder**, l'API a bougé
  plusieurs fois pendant la beta)
- `src/lib/auth.ts` — conserve `checkPassword` (inchangé, déjà testé en constant-time) ; retire
  `createSessionToken`, `isValidSessionToken`, `SESSION_COOKIE_NAME` (remplacés par Auth.js)
- `src/app/login/page.tsx` — ajoute un bouton "Se connecter avec GitHub" (`signIn('github')`
  d'Auth.js) au-dessus du formulaire mot de passe existant (`signIn('credentials', {password})`
  au lieu du `fetch('/api/login')` actuel)
- `tests/lib/auth.test.ts` — retire les tests de `createSessionToken`/`isValidSessionToken`,
  garde ceux de `checkPassword`

**Retirés :**
- `src/app/api/login/route.ts`, `src/app/api/logout/route.ts` — remplacés par les routes
  standard générées par le handler Auth.js (`/api/auth/signin`, `/api/auth/signout`,
  `/api/auth/callback/github`, etc.)

## Variables d'environnement

| Variable | Rôle | Remplace |
|---|---|---|
| `AUTH_GITHUB_ID` | Client ID de l'OAuth App GitHub | — (nouvelle) |
| `AUTH_GITHUB_SECRET` | Client Secret de l'OAuth App GitHub | — (nouvelle) |
| `AUTH_SECRET` | Secret de signature des sessions Auth.js | `ALEX_HUB_SESSION_SECRET` |
| `ALLOWED_GITHUB_USERNAME` | Seul username GitHub autorisé à se connecter | — (nouvelle) |
| `ALEX_HUB_PASSWORD` | Mot de passe de secours | inchangé |
| `DOKPLOY_API_URL` / `DOKPLOY_API_TOKEN` | Accès à l'API Dokploy | inchangés |

## Prérequis manuel (à faire par Alexandre avant l'implémentation)

Créer une OAuth App sur GitHub → [github.com/settings/developers](https://github.com/settings/developers)
→ "New OAuth App" :
- **Homepage URL** : `https://alex-hub.51.178.37.35.nip.io`
- **Authorization callback URL** : `https://alex-hub.51.178.37.35.nip.io/api/auth/callback/github`

Récupérer le **Client ID** et générer un **Client Secret**. Ces deux valeurs seront à fournir au
moment de l'implémentation (jamais committées, injectées en variable d'env Dokploy comme le
reste).

## Points d'attention pour l'implémentation

- **API Auth.js v5** : au moment d'écrire ce design, Auth.js v5 (next-auth@beta) a une API qui a
  bougé plusieurs fois pendant sa période beta (notamment l'intégration middleware). Vérifier la
  doc officielle à jour au moment de coder plutôt que de suivre ce document au mot près sur les
  détails d'API — les décisions d'architecture (providers, callback de restriction, ce qui est
  gardé/retiré) restent valables, la syntaxe exacte peut avoir changé.
- **Callback URL fixe** : le domaine `nip.io` actuel (`alex-hub.51.178.37.35.nip.io`) doit rester
  stable — un changement de domaine cassera le callback OAuth configuré côté GitHub et nécessitera
  de le reconfigurer des deux côtés.
- **`checkPassword` reste inchangé** : sa comparaison timing-safe déjà testée est directement
  réutilisée dans le provider Credentials, pas de nouvelle logique de comparaison à écrire.

## Hors scope (YAGNI)

- Pas de gestion multi-utilisateurs — toujours un seul compte GitHub autorisé, pas de table
  d'utilisateurs.
- Pas d'autres providers OAuth (Google, etc.) — GitHub uniquement, cohérent avec le fait que tout
  l'écosystème dev d'Alexandre (repos, Dokploy déploiements) tourne déjà autour de GitHub.
- Pas de refresh token / gestion de l'expiration GitHub — la session Auth.js a sa propre durée de
  vie indépendante du token GitHub.
