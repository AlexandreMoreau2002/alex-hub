export type EnvironmentLabel = 'prod' | 'preprod' | 'dev'

// Détecte l'environnement depuis le sous-domaine réel, PAS depuis le nom d'environnement
// Dokploy — celui-ci s'est déjà révélé peu fiable (ex: Quest et Cloudbreak sont nommés
// "production" côté Dokploy alors qu'ils tournent réellement en dev, voir la page Notion
// "Serveur OVH"). Les marqueurs doivent être délimités par un début/fin de chaîne, un point
// ou un tiret, pour éviter les faux positifs sur des noms comme "devops" ou "development".
const PREPROD_PATTERN = /(^|[.-])(preprod|pre-prod|staging|stage)([.-]|$)/i
const DEV_PATTERN = /(^|[.-])dev([.-]|$)/i

export function detectEnvironment(host: string): EnvironmentLabel {
  const normalized = host.toLowerCase()
  if (PREPROD_PATTERN.test(normalized)) return 'preprod'
  if (DEV_PATTERN.test(normalized)) return 'dev'
  return 'prod'
}

export function formatEnvironmentLabel(environment: EnvironmentLabel): string {
  switch (environment) {
    case 'dev':
      return 'Dev'
    case 'preprod':
      return 'Preprod'
    case 'prod':
      return 'Prod'
  }
}
