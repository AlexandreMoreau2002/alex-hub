import type { DokployProject } from './types'

interface RawDomain {
  host: string
  https?: boolean
}

interface RawDeployable {
  applicationId?: string
  composeId?: string
  name: string
  domains?: RawDomain[]
}

interface RawProject {
  projectId: string
  name: string
  applications?: RawDeployable[]
  compose?: RawDeployable[]
}

export class DokployApiError extends Error {}

export async function fetchDokployProjects(): Promise<DokployProject[]> {
  const baseUrl = process.env.DOKPLOY_API_URL
  const token = process.env.DOKPLOY_API_TOKEN

  if (!baseUrl || !token) {
    throw new DokployApiError('DOKPLOY_API_URL ou DOKPLOY_API_TOKEN manquant')
  }

  const response = await fetch(`${baseUrl}/api/project.all`, {
    headers: { 'x-api-key': token },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new DokployApiError(`Dokploy API a répondu ${response.status}`)
  }

  const raw = (await response.json()) as RawProject[]
  return raw.map(mapProject)
}

function mapProject(project: RawProject): DokployProject {
  const deployables = [...(project.applications ?? []), ...(project.compose ?? [])]

  return {
    projectId: project.projectId,
    name: project.name,
    services: deployables
      .filter((deployable) => (deployable.domains ?? []).length > 0)
      .map((deployable) => ({
        serviceId: deployable.applicationId ?? deployable.composeId ?? deployable.name,
        name: deployable.name,
        domains: (deployable.domains ?? []).map((domain) => ({
          host: domain.host,
          https: domain.https ?? true,
        })),
      })),
  }
}
