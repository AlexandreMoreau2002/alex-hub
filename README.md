# Alex Hub

Dashboard perso qui liste automatiquement tous les sites déployés sur Dokploy (VPS OVH),
groupés par projet, avec titre/favicon/description scrapés, latence et badge de statut live.
Design : système "Personal Brand · Cloudbreak" (voir `docs/superpowers/specs/`).

## Développement local

1. `npm install`
2. Copier `.env.example` en `.env.local` et remplir :
   - `DOKPLOY_API_URL` / `DOKPLOY_API_TOKEN` — voir la page Notion "🖥️ Serveur OVH"
   - `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` — identifiants de la GitHub OAuth App (voir
     ci-dessous, doit être créée manuellement avant de pouvoir tester la connexion GitHub)
   - `AUTH_SECRET` — chaîne aléatoire longue (ex: `openssl rand -hex 32`), utilisée par Auth.js
     pour signer les sessions
   - `ALLOWED_GITHUB_USERNAME` — seul ce compte GitHub peut se connecter via OAuth
   - `ALEX_HUB_PASSWORD` — mot de passe d'accès au hub (connexion de secours si GitHub n'est pas
     utilisable)

   La GitHub OAuth App doit être créée à la main sur https://github.com/settings/developers
   avant de pouvoir tester la connexion GitHub, avec comme callback URL
   `<domaine>/api/auth/callback/github` (ex: `http://localhost:3000/api/auth/callback/github` en
   local).
3. `npm run dev` → http://localhost:3000
4. `npm run test` pour les tests unitaires

## Déploiement

Comme les autres projets du VPS OVH : nouvelle app Dokploy, build Nixpacks, variables d'env
injectées côté Dokploy (jamais commitées). Pas de domaine personnel réservé pour ce projet —
sous-domaine `nip.io` généré par Dokploy.

Voir `docs/superpowers/specs/2026-08-16-alex-hub-design.md` (+ son addendum maquette) pour le
design complet et `docs/alex-hub/fonctionnement.md` pour une explication du fonctionnement.
