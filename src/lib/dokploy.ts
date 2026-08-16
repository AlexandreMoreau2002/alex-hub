import type { DokployProject } from './types'

interface RawDomain {
  host: string
  https?: boolean
}

interface RawApplicationSummary {
  applicationId: string
  name: string
}

interface RawEnvironment {
  name: string
  environmentId: string
  applications?: RawApplicationSummary[]
}

interface RawProject {
  projectId: string
  name: string
  environments?: RawEnvironment[]
}

interface RawApplicationDetail {
  applicationId: string
  name: string
  domains?: RawDomain[]
}

export class DokployApiError extends Error {}

async function dokployFetch<T>(path: string): Promise<T> {
  const baseUrl = process.env.DOKPLOY_API_URL
  const token = process.env.DOKPLOY_API_TOKEN

  if (!baseUrl || !token) {
    throw new DokployApiError('DOKPLOY_API_URL ou DOKPLOY_API_TOKEN manquant')
  }

  const response = await fetch(`${baseUrl}${path}`, {
    headers: { 'x-api-key': token },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new DokployApiError(`Dokploy API a répondu ${response.status}`)
  }

  return (await response.json()) as T
}

// NOTE: `project.all` ne renvoie que projectId/name/environments[].applications[]
// (applicationId/name, pas de domaines) — les domaines d'une application ne sont
// exposés que par `application.one?applicationId=...`, d'où le second appel par
// service ci-dessous. Vérifié le 2026-08-17 contre le vrai serveur Dokploy (voir
// docs/superpowers/plans/2026-08-16-alex-hub.md, Task 2 Step 6).
// Seules les `applications` sont supportées (pas `compose`) : aucun service `compose`
// n'existe actuellement sur le VPS, et son shape de domaines n'a pas été vérifié.
export async function fetchDokployProjects(): Promise<DokployProject[]> {
  const rawProjects = await dokployFetch<RawProject[]>('/api/project.all')

  return Promise.all(
    rawProjects.map(async (project) => {
      const summaries = (project.environments ?? []).flatMap((environment) => environment.applications ?? [])

      const services = await Promise.all(
        summaries.map(async (summary) => {
          // Un `application.one` qui échoue pour UNE app (blip réseau, app en train de
          // redémarrer côté Dokploy) ne doit pas faire échouer tout `/api/sites` — même
          // philosophie que `fetchSiteMetadataSafe` dans aggregate.ts : on dégrade ce
          // service précis (aucun domaine trouvé, donc filtré plus bas) plutôt que de
          // propager l'erreur.
          try {
            const detail = await dokployFetch<RawApplicationDetail>(
              `/api/application.one?applicationId=${summary.applicationId}`
            )
            return {
              serviceId: summary.applicationId,
              name: summary.name,
              domains: (detail.domains ?? []).map((domain) => ({
                host: domain.host,
                https: domain.https ?? true,
              })),
            }
          } catch {
            return { serviceId: summary.applicationId, name: summary.name, domains: [] }
          }
        })
      )

      return {
        projectId: project.projectId,
        name: project.name,
        services: services.filter((service) => service.domains.length > 0),
      }
    })
  )
}
