# Alex Hub — Design

Date : 2026-08-16
Statut : validé par Alexandre le 2026-08-16

## Problème

Alexandre déploie plusieurs projets (Snoroc, Cloudbreak, Quest, Portfolio...) sur un VPS OVH
géré via Dokploy. Il n'a aucune vue d'ensemble visuelle de tout ce qui est en ligne : pas de
liste centralisée des urls, des environnements (prod/dev) et des services associés.

## Objectif

Un dashboard perso, **Alex Hub**, qui liste automatiquement tous les sites/services déployés,
sans maintenance manuelle : tout est déduit de l'API Dokploy et du contenu live de chaque site.

## Architecture

Une seule app Next.js (App Router), déployée sur Dokploy comme les autres projets du VPS.
Pas de base de données — tout est recalculé à la volée à chaque chargement de page, avec un
cache mémoire serveur de 60s pour éviter de marteler l'API Dokploy et les sites cibles en cas
de rechargements rapprochés.

```
Navigateur
   → GET /api/sites
        → API Dokploy (projects → services → domains)   [token serveur, jamais exposé au client]
        → fetch parallèle de chaque site (title/description/favicon/status HTTP, timeout 3s)
        → regroupement par projet Dokploy
   ← JSON groupé
   → rendu client (dropdowns par groupe)
```

## Composants

### 1. Gate mot de passe
Middleware Next.js : formulaire de mot de passe → comparaison à `ALEX_HUB_PASSWORD` (env var,
injectée côté Dokploy comme toutes les autres apps du VPS — jamais en dur dans le code) → cookie
de session signé. Pas de compte utilisateur, pas de DB. Mauvais mot de passe → message
générique, pas de lockout (outil perso, faible surface d'attaque).

### 2. `/api/sites` (route serveur)
- Auth requise (session valide) pour appeler cette route.
- Appelle l'API Dokploy (`DOKPLOY_API_URL` + `DOKPLOY_API_TOKEN`, env vars — valeurs réelles
  sur la page Notion "🖥️ Serveur OVH", jamais commitées) pour lister projets → environnements →
  services → domaines configurés.
- Groupe le résultat par projet Dokploy (ex: "Snoroc" contient Prod + Dev, chacun avec ses
  services front/back).
- Pour chaque domaine avec une URL, fetch parallèle (timeout 3s par site) de la page racine :
  - extrait `<title>`, `<meta name="description">`, favicon (`<link rel="icon">` ou fallback
    `/favicon.ico`)
  - capture le code HTTP retourné pour le badge de statut
- Un site qui timeout/erreur reste dans la liste : badge rouge, titre replié sur le nom du
  service Dokploy, pas de favicon/description, pas de blocage des autres sites (fetch en
  `Promise.allSettled`, pas `Promise.all`).
- Cache mémoire process 60s (clé unique, pas de cache par utilisateur — un seul utilisateur).
- Réponse JSON :
  ```json
  {
    "groups": [
      {
        "name": "Snoroc",
        "services": [
          {
            "name": "Front Prod",
            "url": "https://snoroc.fr",
            "status": "up",
            "title": "Snoroc",
            "description": "...",
            "favicon": "https://snoroc.fr/favicon.ico"
          }
        ]
      }
    ]
  }
  ```

### 3. Page front (client)
- Au montage : fetch `/api/sites`, affiche un skeleton pendant le chargement.
- Rendu : un dropdown/accordéon par groupe (nom du projet Dokploy), chaque service listé
  dessous avec favicon, titre (fallback nom du service Dokploy si pas de titre récupéré),
  description tronquée, badge vert/rouge, url cliquable (ouvre un nouvel onglet).
- Barre de recherche/filtre en haut de page : filtre en live sur nom de groupe, nom de
  service, titre et url, à travers tous les groupes.
- État d'erreur si `/api/sites` échoue (ex: Dokploy injoignable ou token invalide) : bannière
  explicite + bouton "réessayer" — pas d'échec silencieux.
- Design sobre, dense en information mais aéré, orienté outil perso/dev (référence : dashboards
  type Vercel/Railway/Linear), dark mode par défaut avec bascule light, micro-interactions
  discrètes sur hover des cartes et l'ouverture/fermeture des accordéons.

## Gestion des erreurs

| Cas | Comportement |
|---|---|
| API Dokploy injoignable / token invalide | `/api/sites` renvoie 502 avec message explicite ; front affiche bannière + bouton réessayer |
| Un site individuel down/timeout | Reste affiché avec badge rouge, infos dégradées (nom Dokploy à la place du titre scrapé) |
| Mauvais mot de passe | Message générique, pas de lockout |
| Aucun projet Dokploy trouvé | État vide explicite ("aucun site détecté") plutôt qu'une page blanche |

## Tests

- Tests unitaires : mapping réponse API Dokploy (mockée) → structure groupée par projet.
- Tests unitaires : parsing des métadonnées (title/description/favicon) à partir de fixtures
  HTML (cas nominal, HTML sans meta, favicon absent).
- Tests unitaires : agrégation avec `Promise.allSettled` — un site qui échoue ne bloque pas les
  autres.
- Guide de test manuel + fichier `.http` livrés à la fin du plan d'implémentation (convention
  projet).

## Hors scope (YAGNI)

- Pas de monitoring historique / alerting (juste un badge instantané au chargement).
- Pas de gestion multi-utilisateurs / rôles.
- Pas d'édition manuelle de la liste (tout est déduit de Dokploy + scraping, jamais de source
  manuelle parallèle à maintenir).
- Pas de webhook Dokploy pour rafraîchir en push — le fetch au chargement de page suffit.

## Nom & emplacement

Projet : **Alex Hub**
Dossier local : `~/Desktop/dev/alex-hub`
Stack : Next.js (App Router, API routes + front dans le même projet)
Déploiement : Dokploy, comme les autres projets du VPS OVH (voir `.agent/infra.md` de snoroc
pour les conventions d'infra communes : credentials jamais en dur, variables d'env côté
Dokploy). Pas de domaine personnel réservé pour ce projet : sous-domaine `nip.io` généré
automatiquement par Dokploy (ex: `alex-hub-<ip>.sslip.nip.io`), pas d'achat de domaine.
