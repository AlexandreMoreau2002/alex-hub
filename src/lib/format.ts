import type { SiteEntry } from './types'

export function formatStatusMeta(site: Pick<SiteEntry, 'status' | 'latencyMs' | 'httpStatus'>): string {
  if (site.status === 'up') {
    return site.latencyMs !== null ? `${site.latencyMs} ms` : '—'
  }
  return site.httpStatus !== null ? `${site.httpStatus}` : 'timeout'
}

export function hostOf(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

export function initialOf(title: string): string {
  return title.trim().charAt(0).toUpperCase() || '?'
}
