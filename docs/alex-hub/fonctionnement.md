# Alex Hub — comment ça marche

## En une phrase

Alex Hub est une page web privée qui te montre tous tes sites en ligne, comme une table des
matières de tout ce que tu as construit — sans que tu aies besoin de tenir cette liste à jour
toi-même.

## L'idée, façon dessin

Imagine que Dokploy est un grand classeur avec un onglet par projet (Snoroc, Cloudbreak,
Portfolio...), et dans chaque onglet, une fiche par service (front, back...) avec son adresse
web collée dessus.

Alex Hub, à chaque fois que tu l'ouvres :

```
   Toi ouvres Alex Hub
          |
          v
   "Dokploy, montre-moi ton classeur"
          |
          v
   Dokploy renvoie : Snoroc [Front Prod, Front Dev, ...], Cloudbreak [...], ...
          |
          v
   Pour chaque adresse trouvée, Alex Hub sonne à la porte du site
   ("t'es en ligne ? t'as un titre ? une image ? c'est rapide ?")
          |
          v
   Il range tout ça par onglet (= projet) et te l'affiche
   sous forme d'accordéons dépliables, avec une barre de recherche
   et un filtre En ligne / Hors ligne
```

Si un site ne répond pas quand on sonne à sa porte (down, trop lent...), Alex Hub ne bloque pas
pour autant — il met juste un badge rouge sur sa carte et continue avec les autres. Le
rafraîchissement est manuel (bouton "Rafraîchir") : pas de vérification automatique en tâche de
fond tant que tu n'as pas la page ouverte.

## Les briques du système

| Brique | Rôle | Fichier |
|---|---|---|
| Portier | Vérifie qui a le droit d'entrer (GitHub ou mot de passe) et gère la session | `src/lib/auth.ts`, `src/auth.ts`, `src/middleware.ts` |
| Interprète Dokploy | Va chercher la liste des projets/services chez Dokploy | `src/lib/dokploy.ts` |
| Enquêteur de site | Sonne à la porte de chaque site, note titre/description/favicon/statut/latence | `src/lib/metadata.ts` |
| Chef d'orchestre | Assemble tout, regroupe par projet, garde un cache 60s | `src/lib/aggregate.ts` |
| Filtre | Recherche texte + filtre de statut (Tous/En ligne/Hors ligne) | `src/lib/filter.ts` |
| Guichet | Répond aux appels du navigateur (`/api/sites`, `/api/auth/*`) | `src/app/api/*/route.ts` |
| Vitrine | Affiche tout ça à l'écran, design "Personal Brand · Cloudbreak" | `src/app/page.tsx`, `src/components/*` |

## Le portier, en détail : deux façons d'entrer

Le portier (Auth.js) accepte deux façons de prouver que c'est bien toi, façon "tu peux entrer
soit avec ta carte magnétique, soit avec le digicode de secours" :

```
   Toi ouvres /login
          |
          +--> "Se connecter avec GitHub"
          |         |
          |         v
          |    Redirection vers GitHub : "tu confirmes que c'est toi ?"
          |         |
          |         v
          |    GitHub te renvoie vers Alex Hub avec ton pseudo GitHub
          |         |
          |         v
          |    Le portier compare ce pseudo à ALLOWED_GITHUB_USERNAME
          |         |
          |         +--> pseudo autorisé  --> session créée, accès au dashboard
          |         +--> pseudo différent --> refusé, retour à /login avec un message d'erreur
          |              (même si GitHub, lui, t'a bien authentifié : c'est une règle
          |              propre à Alex Hub, "un seul compte a le droit d'entrer")
          |
          +--> Formulaire mot de passe (solution de secours)
                    |
                    v
               Comparaison avec ALEX_HUB_PASSWORD
                    |
                    +--> bon mot de passe --> session créée, accès au dashboard
                    +--> mauvais mot de passe --> message d'erreur, tu restes sur /login
```

Dans les deux cas, une fois la session créée, c'est Auth.js qui la gère (cookie signé), et
`src/middleware.ts` vérifie cette session à chaque requête pour bloquer tout ce qui n'est pas
`/login` ou `/api/auth/*` (les routes qui servent justement à se connecter).

Le mot de passe reste volontairement disponible en secours (si GitHub est indisponible, ou pour
tester rapidement sans passer par l'OAuth).

## Fichiers impactés

- `src/lib/types.ts` — les formes de données partagées
- `src/lib/dokploy.ts` — client API Dokploy
- `src/lib/metadata.ts` — scraping title/description/favicon/statut/latence d'un site
- `src/lib/filter.ts` — filtrage texte + filtrage par statut
- `src/lib/format.ts` — formatage (badge de statut, host d'une url, initiale d'un titre)
- `src/lib/aggregate.ts` — assemblage + cache 60s
- `src/lib/auth.ts` — vérification du mot de passe (`checkPassword`) et du pseudo GitHub
  autorisé (`isAllowedGithubUser`), les deux seules fonctions pures et testées de l'auth
- `src/auth.ts` — configuration Auth.js (providers GitHub + Credentials, règle de restriction
  GitHub, page de connexion)
- `src/lib/useTheme.ts` — thème clair/sombre (persistance + préférence système)
- `src/middleware.ts` — protège toutes les routes sauf `/login` et `/api/auth/*`, via la session
  Auth.js (`auth()`)
- `src/app/api/auth/[...nextauth]/route.ts` — handler Auth.js (connexion GitHub, callback OAuth,
  connexion par mot de passe, déconnexion)
- `src/app/api/sites/route.ts`
- `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/login/page.tsx`
- `src/app/globals.css` — tokens du design system (couleurs, polices, rayons, ombres, motion)
- `src/components/Header.tsx`, `Toolbar.tsx`, `ErrorBanner.tsx`, `LoadingSkeleton.tsx`,
  `StatusBadge.tsx`, `EmptyState.tsx`, `Footnote.tsx`, `SiteGroupAccordion.tsx`,
  `ServiceRow.tsx` (+ leurs `.module.css`)

## Ce qu'il ne fait pas (volontairement)

- Pas d'historique de monitoring (juste l'état au moment où tu ouvres/rafraîchis la page), pas de
  polling automatique en tâche de fond.
- Pas de liste manuelle à maintenir en parallèle de Dokploy.
- Pas de compte utilisateur multiple — un seul compte GitHub autorisé, plus un mot de passe
  partagé en secours.
- Pas de badge "hébergeur/environnement" par groupe (pas de donnée fiable disponible : tout tourne
  sur le même VPS Dokploy).
