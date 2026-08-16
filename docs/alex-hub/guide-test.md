# Alex Hub — guide de test manuel

## Prérequis

- Node.js 20+ installé
- Un fichier `.env.local` à la racine du projet, rempli à partir de `.env.example` :
  - `DOKPLOY_API_URL` et `DOKPLOY_API_TOKEN` (valeurs réelles sur la page Notion "🖥️ Serveur OVH")
  - `AUTH_GITHUB_ID` et `AUTH_GITHUB_SECRET` (GitHub OAuth App — voir README.md, doit être créée
    à la main sur https://github.com/settings/developers avant le Scénario 1)
  - `AUTH_SECRET` (chaîne aléatoire longue, ex: `openssl rand -hex 32`)
  - `ALLOWED_GITHUB_USERNAME` (le compte GitHub autorisé à se connecter via OAuth)
  - `ALEX_HUB_PASSWORD` (choisis un mot de passe de test — sert de connexion de secours)
- Dépendances installées : `npm install`
- Serveur de dev lancé : `npm run dev` (accessible sur `http://localhost:3000`)

**Note sur ce qui est vérifiable sans navigateur réel** : les scénarios ci-dessous supposent un
navigateur interactif. Le Scénario 1 (GitHub) et son cas limite compte non-autorisé demandent un
vrai compte GitHub et un consentement OAuth manuel — impossibles à scripter en `curl`/`.http`.
Le Scénario 2 (mot de passe) peut, lui, être vérifié intégralement en ligne de commande avec
`curl` (voir `http/alex-hub.http` pour le détail de la requête) — utile pour une vérification
rapide sans ouvrir de navigateur.

## Scénario 1 — connexion GitHub

1. Ouvre `/login` en navigation privée.
2. Clique sur "Se connecter avec GitHub".
3. **Attendu** : redirection vers GitHub, autorisation de l'OAuth App, puis retour sur `/` déjà
   connecté.
4. Déconnecte-toi (si un bouton de déconnexion existe — sinon vide le cookie de session
   manuellement pour le test), reconnecte-toi une seconde fois : doit fonctionner sans
   re-demander l'autorisation GitHub (déjà accordée).
5. **Cas limite — compte non autorisé** : si tu as un second compte GitHub de test, tente de te
   connecter avec. **Attendu** : refusé, retour à `/login?error=AccessDenied`, message "Ce compte
   GitHub n'est pas autorisé à accéder à Alex Hub." affiché — même si GitHub lui-même a validé
   l'authentification (c'est `isAllowedGithubUser` qui bloque, pas GitHub).

## Scénario 2 — accès protégé par mot de passe

1. Ouvre `http://localhost:3000/` dans un navigateur en navigation privée.
2. **Attendu** : redirection automatique vers `/login`, formulaire de mot de passe affiché.
3. Saisis un mauvais mot de passe, valide.
4. **Attendu** : message "Mot de passe incorrect", tu restes sur `/login`.
5. Saisis le bon mot de passe (`ALEX_HUB_PASSWORD`), valide.
6. **Attendu** : redirection vers `/`, le dashboard se charge.

## Scénario 3 — chargement du dashboard

1. Une fois connecté, observe le chargement de la page d'accueil.
2. **Attendu** : un skeleton animé (shimmer, pas de spinner) s'affiche brièvement, puis les
   groupes de sites apparaissent (un accordéon par projet Dokploy, ouvert par défaut).
3. Ouvre/referme un groupe en cliquant sur son en-tête : **attendu** — le chevron tourne, le
   contenu se déplie/replie avec une animation douce (~240ms), pas de saut brutal.
4. Vérifie que chaque service affiche favicon (ou initiale de repli si pas de favicon/erreur de
   chargement image), titre, description (si dispo), badge de statut (`up · X ms` ou
   `down · <code>`/`timeout`), et le host de l'url en clair avec une icône de lien externe.
5. Clique sur une carte de site : **attendu** — ouverture dans un nouvel onglet vers l'url du
   site.
6. Vérifie le compteur en haut à droite (`X/Y up`) — doit correspondre au nombre réel de services
   en ligne / total.

## Scénario 4 — recherche/filtre

1. Tape le nom d'un projet (ex: "Snoroc") dans la barre de recherche.
2. **Attendu** : seul le groupe correspondant reste affiché, automatiquement déplié.
3. Tape un bout d'url, de titre ou de description d'un service précis.
4. **Attendu** : seul ce service reste affiché (dans son groupe, groupe auto-déplié).
5. Tape un texte qui ne correspond à rien.
6. **Attendu** : message "Aucun service ne correspond à « <texte> »." affiché, pas d'erreur
   console.
7. Vide la barre de recherche.
8. **Attendu** : tous les groupes reviennent, et l'état d'ouverture/fermeture que tu avais
   manuellement choisi avant la recherche est restauré (pas remis à zéro).

## Scénario 5 — filtre de statut

1. Clique sur "En ligne" dans le filtre segmenté.
2. **Attendu** : seuls les services `up` restent affichés, groupes sans service `up` disparaissent.
3. Clique sur "Hors ligne".
4. **Attendu** : seuls les services `down` restent affichés (si tu en as un de test, sinon état
   vide/aucun groupe).
5. Reclique sur "Tous" : tout revient.
6. Combine recherche + filtre de statut : **attendu** — les deux se combinent (ET logique).

## Scénario 6 — tout déplier / tout replier

1. Clique sur "Tout replier" (ou "Tout déplier" selon l'état courant) en haut de la barre
   d'outils.
2. **Attendu** : tous les groupes changent d'état d'un coup, le libellé du bouton s'inverse.

## Scénario 7 — thème clair/sombre

1. Clique sur le bouton de bascule de thème dans le header.
2. **Attendu** : le fond et les textes basculent clair ↔ sombre sans rechargement de page, le
   libellé du bouton affiche le thème *cible* (celui sur lequel tu vas basculer si tu recliques).
3. Recharge la page (F5).
4. **Attendu** : le thème choisi est conservé (persisté en `localStorage`).
5. (Optionnel) Change la préférence système clair/sombre du navigateur, efface le
   `localStorage`, recharge : **attendu** — le thème suit la préférence système au premier
   chargement.

## Cas limites

- **Dokploy injoignable** : renomme temporairement `DOKPLOY_API_TOKEN` en valeur invalide dans
  `.env.local`, relance `npm run dev`, recharge `/`. **Attendu** : bannière d'erreur explicite
  + bouton "Réessayer", pas de page blanche/crash.
- **Un site down** : si un des sites listés est réellement indisponible, vérifie que son badge
  est rouge (`down · <code>` ou `down · timeout`) et que les autres sites du même groupe
  s'affichent normalement (pas de blocage global).
- **Favicon cassé** : si un site n'a pas de favicon ou que l'url de favicon renvoie une erreur,
  vérifie que l'initiale du titre s'affiche à la place (pas d'icône cassée du navigateur).
- **Session expirée/logout** : il n'y a pas de bouton de déconnexion dans l'UI ni de route
  `/api/logout` (supprimée avec l'ancien système). Pour simuler une session expirée/déconnectée :
  ouvre les devtools → Application/Storage → cookies, supprime le cookie de session Auth.js
  (`authjs.session-token`, ou vérifie le nom exact reçu dans `Set-Cookie` lors d'une vraie
  connexion — voir la note dans `http/alex-hub.http`), puis recharge `/`. **Attendu** :
  redirection vers `/login`.
- **Pas de polling auto** : laisse la page ouverte plus de 60 secondes sans interaction.
  **Attendu** : aucune requête réseau vers `/api/sites` ne part toute seule (vérifiable dans
  l'onglet Réseau des devtools) — seul un clic sur "Rafraîchir" ou un F5 en déclenche une
  nouvelle.

## Checklist finale

- [ ] Accès sans session → redirigé vers `/login`
- [ ] Connexion GitHub (compte autorisé) → accès au dashboard
- [ ] Connexion GitHub (compte non autorisé, si testable) → refusé, message d'erreur sur `/login`
- [ ] Mauvais mot de passe → message d'erreur, pas d'accès
- [ ] Bon mot de passe → accès au dashboard
- [ ] Groupes affichés par projet Dokploy, dépliables/repliables avec animation
- [ ] Chaque site affiche favicon (ou initiale de repli)/titre/description/badge avec latence
      ou code d'erreur/url
- [ ] Recherche filtre correctement (groupe entier ou service précis), auto-déplie les résultats
- [ ] Filtre de statut (Tous/En ligne/Hors ligne) fonctionne seul et combiné à la recherche
- [ ] "Tout déplier"/"Tout replier" fonctionne
- [ ] Bascule clair/sombre fonctionne, persiste au reload, suit la préférence système par défaut
- [ ] Dokploy injoignable → bannière d'erreur + retry, pas de crash
- [ ] Site individuel down → badge rouge, reste des groupes intact
- [ ] Pas de polling automatique (vérifié dans devtools)
- [ ] Logout → redirection vers `/login`
- [ ] `npm run test` → tous les tests unitaires passent
- [ ] `npm run build` → build de production sans erreur
