import { fetchDokployProjects } from './dokploy'
import { fetchSiteMetadata } from './metadata'
import type { SiteEntry, SiteGroup, SitesResponse } from './types'

const CACHE_TTL_MS = 60_000

let cache: { data: SitesResponse; expiresAt: number } | null = null

async function fetchSiteMetadataSafe(url: string) {
  try {
    return await fetchSiteMetadata(url)
  } catch {
    // fetchSiteMetadata already catches network/timeout errors internally; this is a
    // last-resort guard so an unexpected exception on one site never rejects the
    // Promise.all below and blocks the rest of the group.
    return { status: 'down' as const, httpStatus: null, title: null, description: null, favicon: null }
  }
}

export async function getSites(): Promise<SitesResponse> {
  if (cache && cache.expiresAt > Date.now()) {
    return cache.data
  }

  const projects = await fetchDokployProjects()

  const groups: SiteGroup[] = await Promise.all(
    projects
      .filter((project) => project.services.length > 0)
      .map(async (project) => {
        const services = await Promise.all(
          project.services.flatMap((service) =>
            service.domains.map(async (domain) => {
              const url = `${domain.https ? 'https' : 'http'}://${domain.host}`
              const metadata = await fetchSiteMetadataSafe(url)

              const entry: SiteEntry = {
                name: service.name,
                url,
                status: metadata.status,
                title: metadata.title ?? service.name,
                description: metadata.description,
                favicon: metadata.favicon,
              }
              return entry
            })
          )
        )
        return { name: project.name, services }
      })
  )

  const data: SitesResponse = { groups: groups.filter((group) => group.services.length > 0) }
  cache = { data, expiresAt: Date.now() + CACHE_TTL_MS }
  return data
}

export function clearSitesCache(): void {
  cache = null
}
