import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  extractDescription,
  extractFavicon,
  extractTitle,
  fetchSiteMetadata,
  resolveFavicon,
} from '@/lib/metadata'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
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
})

describe('fetchSiteMetadata', () => {
  it('returns parsed metadata for a successful response', async () => {
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
      title: 'Snoroc',
      description: 'Desc',
      favicon: 'https://snoroc.fr/favicon.png',
    })
  })

  it('returns a down status without throwing when fetch rejects (timeout/network error)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')))

    const result = await fetchSiteMetadata('https://dead-site.fr')

    expect(result).toEqual({ status: 'down', httpStatus: null, title: null, description: null, favicon: null })
  })

  it('returns a down status with the http code when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503, text: async () => '' }))

    const result = await fetchSiteMetadata('https://slow-site.fr')

    expect(result).toEqual({ status: 'down', httpStatus: 503, title: null, description: null, favicon: null })
  })
})
