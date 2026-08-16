import type { SiteGroup } from './types'

export function filterGroups(groups: SiteGroup[], query: string): SiteGroup[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return groups

  return groups
    .map((group) => {
      if (group.name.toLowerCase().includes(normalized)) {
        return group
      }

      const services = group.services.filter(
        (service) =>
          service.name.toLowerCase().includes(normalized) ||
          service.title.toLowerCase().includes(normalized) ||
          service.url.toLowerCase().includes(normalized)
      )
      return { ...group, services }
    })
    .filter((group) => group.services.length > 0)
}

export type StatusFilterValue = 'all' | 'up' | 'down'

export function filterByStatus(groups: SiteGroup[], filter: StatusFilterValue): SiteGroup[] {
  if (filter === 'all') return groups

  return groups
    .map((group) => ({ ...group, services: group.services.filter((service) => service.status === filter) }))
    .filter((group) => group.services.length > 0)
}
