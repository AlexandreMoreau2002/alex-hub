import { detectEnvironment, formatEnvironmentLabel, type EnvironmentLabel } from './environment'
import { fetchDokployProjects } from './dokploy'
import { fetchSiteMetadata } from './metadata'
import type { SiteEntry, SiteGroup, SitesResponse } from './types'

const CACHE_TTL_MS = 60_000

// Ordre d'affichage des environnements au sein d'un même projet Dokploy.
const ENV_ORDER: EnvironmentLabel[] = ['prod', 'preprod', 'dev']

let cache: { data: SitesResponse; expiresAt: number } | null = null

async function fetchSiteMetadataSafe(url: string) {
  try {
    return await fetchSiteMetadata(url)
  } catch {
    // fetchSiteMetadata already catches network/timeout errors internally; this is a
    // last-resort guard so an unexpected exception on one site never rejects the
    // Promise.all below and blocks the rest of the group.
    return {
      status: 'down' as const,
      httpStatus: null,
      latencyMs: null,
      title: null,
      description: null,
      favicon: null,
    }
  }
}

// Un projet Dokploy peut regrouper plusieurs environnements réels (ex: Snoroc a des
// domaines prod ET dev). On les scinde en groupes distincts d'après l'environnement
// détecté depuis le sous-domaine (voir environment.ts) — le nom d'environnement Dokploy
// lui-même n'est pas fiable (cf. Quest/Cloudbreak nommés "production" alors qu'ils
// tournent en dev). Le groupe prod garde le nom du projet tel quel ; les autres
// environnements reçoivent un suffixe (« Snoroc · Dev »).
function groupByEnvironment(projectName: string, entries: SiteEntry[]): SiteGroup[] {
  const byEnvironment = new Map<EnvironmentLabel, SiteEntry[]>()
  for (const entry of entries) {
    const bucket = byEnvironment.get(entry.environment)
    if (bucket) {
      bucket.push(entry)
    } else {
      byEnvironment.set(entry.environment, [entry])
    }
  }

  return ENV_ORDER.filter((environment) => byEnvironment.has(environment)).map((environment) => ({
    name: environment === 'prod' ? projectName : `${projectName} · ${formatEnvironmentLabel(environment)}`,
    services: byEnvironment.get(environment) as SiteEntry[],
  }))
}

export async function getSites(): Promise<SitesResponse> {
  if (cache && cache.expiresAt > Date.now()) {
    return cache.data
  }

  const projects = await fetchDokployProjects()

  const groupsPerProject = await Promise.all(
    projects
      .filter((project) => project.services.length > 0)
      .map(async (project) => {
        const entries = await Promise.all(
          project.services.flatMap((service) =>
            service.domains.map(async (domain) => {
              // Dokploy stocke systématiquement un path même pour les apps sans préfixe
              // (toujours "/"), donc on ne l'ajoute à l'URL que s'il distingue vraiment le
              // service (ex: quest-api sur /api vs quest-web sur /) — sinon deux services
              // partageant un host avec pour seule différence "/" produiraient une URL avec
              // un slash final superflu, sans changer le service réellement ciblé.
              const path = domain.path === '/' ? '' : domain.path
              const url = `${domain.https ? 'https' : 'http'}://${domain.host}${path}`
              const metadata = await fetchSiteMetadataSafe(url)

              const entry: SiteEntry = {
                name: service.name,
                url,
                status: metadata.status,
                title: metadata.title ?? service.name,
                description: metadata.description,
                favicon: metadata.favicon,
                latencyMs: metadata.latencyMs,
                httpStatus: metadata.httpStatus,
                environment: detectEnvironment(domain.host),
              }
              return entry
            })
          )
        )

        return groupByEnvironment(project.name, entries)
      })
  )

  const data: SitesResponse = { groups: groupsPerProject.flat() }
  cache = { data, expiresAt: Date.now() + CACHE_TTL_MS }
  return data
}

export function clearSitesCache(): void {
  cache = null
}
