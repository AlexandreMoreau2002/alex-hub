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
| Portier | Demande le mot de passe avant de laisser entrer | `src/lib/auth.ts`, `middleware.ts` |
| Interprète Dokploy | Va chercher la liste des projets/services chez Dokploy | `src/lib/dokploy.ts` |
| Enquêteur de site | Sonne à la porte de chaque site, note titre/description/favicon/statut/latence | `src/lib/metadata.ts` |
| Chef d'orchestre | Assemble tout, regroupe par projet, garde un cache 60s | `src/lib/aggregate.ts` |
| Filtre | Recherche texte + filtre de statut (Tous/En ligne/Hors ligne) | `src/lib/filter.ts` |
| Guichet | Répond aux appels du navigateur (`/api/sites`, `/api/login`, `/api/logout`) | `src/app/api/*/route.ts` |
| Vitrine | Affiche tout ça à l'écran, design "Personal Brand · Cloudbreak" | `src/app/page.tsx`, `src/components/*` |

## Fichiers impactés

- `src/lib/types.ts` — les formes de données partagées
- `src/lib/dokploy.ts` — client API Dokploy
- `src/lib/metadata.ts` — scraping title/description/favicon/statut/latence d'un site
- `src/lib/filter.ts` — filtrage texte + filtrage par statut
- `src/lib/format.ts` — formatage (badge de statut, host d'une url, initiale d'un titre)
- `src/lib/aggregate.ts` — assemblage + cache 60s
- `src/lib/auth.ts` — mot de passe + jeton de session signé
- `src/lib/useTheme.ts` — thème clair/sombre (persistance + préférence système)
- `middleware.ts` — protège toutes les routes sauf `/login` et `/api/login`
- `src/app/api/login/route.ts`, `src/app/api/logout/route.ts`, `src/app/api/sites/route.ts`
- `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/login/page.tsx`
- `src/app/globals.css` — tokens du design system (couleurs, polices, rayons, ombres, motion)
- `src/components/Header.tsx`, `Toolbar.tsx`, `ErrorBanner.tsx`, `LoadingSkeleton.tsx`,
  `StatusBadge.tsx`, `EmptyState.tsx`, `Footnote.tsx`, `SiteGroupAccordion.tsx`,
  `ServiceRow.tsx` (+ leurs `.module.css`)

## Ce qu'il ne fait pas (volontairement)

- Pas d'historique de monitoring (juste l'état au moment où tu ouvres/rafraîchis la page), pas de
  polling automatique en tâche de fond.
- Pas de liste manuelle à maintenir en parallèle de Dokploy.
- Pas de compte utilisateur multiple — un seul mot de passe partagé.
- Pas de badge "hébergeur/environnement" par groupe (pas de donnée fiable disponible : tout tourne
  sur le même VPS Dokploy).
