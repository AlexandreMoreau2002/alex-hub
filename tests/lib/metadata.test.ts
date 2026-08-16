import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  extractDescription,
  extractFavicon,
  extractTitle,
  fetchSiteMetadata,
  resolveFavicon,
} from '@/lib/metadata'

beforeEach(() => {
  vi.useFakeTimers().setSystemTime(new Date('2026-08-16T10:00:00Z'))
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('extractTitle', () => {
  it('extracts the title tag content', () => {
    expect(extractTitle('<html><head><title>Snoroc</title></head></html>')).toBe('Snoroc')
  })

  it('returns null when there is no title tag', () => {
    expect(extractTitle('<html><head></head></html>')).toBeNull()
  })
})

describe('extractDescription', () => {
  it('extracts meta description regardless of attribute order', () => {
    expect(extractDescription('<meta content="Ma description" name="description">')).toBe('Ma description')
  })

  it('returns null when there is no meta description', () => {
    expect(extractDescription('<head></head>')).toBeNull()
  })
})

describe('extractFavicon / resolveFavicon', () => {
  it('extracts a relative favicon href and resolves it against the page url', () => {
    const favicon = extractFavicon('<link rel="icon" href="/static/favicon.png">')
    expect(resolveFavicon('https://snoroc.fr/', favicon)).toBe('https://snoroc.fr/static/favicon.png')
  })

  it('falls back to /favicon.ico when no link tag is present', () => {
    expect(resolveFavicon('https://snoroc.fr/', null)).toBe('https://snoroc.fr/favicon.ico')
  })

  it('falls back to /favicon.ico when the scraped favicon uses a javascript: scheme', () => {
    const favicon = extractFavicon('<link rel="icon" href="javascript:alert(1)">')
    expect(resolveFavicon('https://snoroc.fr/', favicon)).toBe('https://snoroc.fr/favicon.ico')
  })

  it('falls back to /favicon.ico for other non-http(s) schemes (e.g. data:)', () => {
    const favicon = extractFavicon('<link rel="icon" href="data:text/html,<script>alert(1)</script>">')
    expect(resolveFavicon('https://snoroc.fr/', favicon)).toBe('https://snoroc.fr/favicon.ico')
  })
})

describe('fetchSiteMetadata', () => {
  it('returns parsed metadata with latency for a successful response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () =>
          '<html><head><title>Snoroc</title><meta name="description" content="Desc"><link rel="icon" href="/favicon.png"></head></html>',
      })
    )

    const result = await fetchSiteMetadata('https://snoroc.fr')

    expect(result).toEqual({
      status: 'up',
      httpStatus: 200,
      latencyMs: 0,
      title: 'Snoroc',
      description: 'Desc',
      favicon: 'https://snoroc.fr/favicon.png',
    })
  })

  it('returns a down status without throwing when fetch rejects (timeout/network error)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')))

    const result = await fetchSiteMetadata('https://dead-site.fr')

    expect(result).toEqual({
      status: 'down',
      httpStatus: null,
      latencyMs: null,
      title: null,
      description: null,
      favicon: null,
    })
  })

  it('returns a down status with the http code and latency when the response is a 5xx server error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503, text: async () => '' }))

    const result = await fetchSiteMetadata('https://slow-site.fr')

    expect(result).toEqual({
      status: 'down',
      httpStatus: 503,
      latencyMs: 0,
      title: null,
      description: null,
      favicon: null,
    })
  })

  it('returns an up status for a 4xx response — the server responded, it just has no root route (common for API-only backends)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, text: async () => '' }))

    const result = await fetchSiteMetadata('https://api.example.com')

    expect(result).toEqual({
      status: 'up',
      httpStatus: 404,
      latencyMs: 0,
      title: null,
      description: null,
      favicon: null,
    })
  })
})
