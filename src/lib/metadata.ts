import type { SiteStatusCode } from './types'

export interface SiteMetadata {
  status: SiteStatusCode
  httpStatus: number | null
  title: string | null
  description: string | null
  favicon: string | null
}

const FETCH_TIMEOUT_MS = 3000

export async function fetchSiteMetadata(url: string): Promise<SiteMetadata> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(url, { signal: controller.signal, redirect: 'follow' })
    const httpStatus = response.status
    const status: SiteStatusCode = response.ok ? 'up' : 'down'

    if (!response.ok) {
      return { status, httpStatus, title: null, description: null, favicon: null }
    }

    const html = await response.text()
    return {
      status,
      httpStatus,
      title: extractTitle(html),
      description: extractDescription(html),
      favicon: resolveFavicon(url, extractFavicon(html)),
    }
  } catch {
    return { status: 'down', httpStatus: null, title: null, description: null, favicon: null }
  } finally {
    clearTimeout(timeout)
  }
}

export function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i)
  return match ? match[1].trim() || null : null
}

export function extractDescription(html: string): string | null {
  const match =
    html.match(/<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i) ??
    html.match(/<meta\s+[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i)
  return match ? match[1].trim() || null : null
}

export function extractFavicon(html: string): string | null {
  const match =
    html.match(/<link\s+[^>]*rel=["'](?:shortcut icon|icon)["'][^>]*href=["']([^"']*)["'][^>]*>/i) ??
    html.match(/<link\s+[^>]*href=["']([^"']*)["'][^>]*rel=["'](?:shortcut icon|icon)["'][^>]*>/i)
  return match ? match[1].trim() : null
}

export function resolveFavicon(pageUrl: string, favicon: string | null): string {
  try {
    const base = new URL(pageUrl)
    if (!favicon) {
      return new URL('/favicon.ico', base).toString()
    }
    return new URL(favicon, base).toString()
  } catch {
    return '/favicon.ico'
  }
}
