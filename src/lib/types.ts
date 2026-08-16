export interface DokployDomain {
  host: string
  https: boolean
}

export interface DokployService {
  serviceId: string
  name: string
  domains: DokployDomain[]
}

export interface DokployProject {
  projectId: string
  name: string
  services: DokployService[]
}

export type SiteStatusCode = 'up' | 'down'

export interface SiteEntry {
  name: string
  url: string
  status: SiteStatusCode
  title: string
  description: string | null
  favicon: string | null
}

export interface SiteGroup {
  name: string
  services: SiteEntry[]
}

export interface SitesResponse {
  groups: SiteGroup[]
}
