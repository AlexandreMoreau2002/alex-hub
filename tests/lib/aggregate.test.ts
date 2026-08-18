import { afterEach, beforeEach, expect, it, vi } from 'vitest'

vi.mock('@/lib/dokploy', () => ({
  fetchDokployProjects: vi.fn(),
}))
vi.mock('@/lib/metadata', () => ({
  fetchSiteMetadata: vi.fn(),
}))

import { fetchDokployProjects } from '@/lib/dokploy'
import { fetchSiteMetadata } from '@/lib/metadata'
import { clearSitesCache, getSites } from '@/lib/aggregate'

beforeEach(() => {
  clearSitesCache()
  vi.useFakeTimers().setSystemTime(new Date('2026-08-16T10:00:00Z'))
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

it('groups services by project and merges metadata including latency', async () => {
  vi.mocked(fetchDokployProjects).mockResolvedValue([
    {
      projectId: 'p1',
      name: 'Snoroc',
      services: [{ serviceId: 'a1', name: 'Front Prod', domains: [{ host: 'snoroc.fr', https: true, path: '/' }] }],
    },
  ])
  vi.mocked(fetchSiteMetadata).mockResolvedValue({
    status: 'up',
    httpStatus: 200,
    latencyMs: 128,
    title: 'Snoroc',
    description: 'Desc',
    favicon: 'https://snoroc.fr/favicon.ico',
  })

  const result = await getSites()

  expect(result).toEqual({
    groups: [
      {
        name: 'Snoroc',
        services: [
          {
            name: 'Front Prod',
            url: 'https://snoroc.fr',
            status: 'up',
            title: 'Snoroc',
            description: 'Desc',
            favicon: 'https://snoroc.fr/favicon.ico',
            latencyMs: 128,
            httpStatus: 200,
            environment: 'prod',
          },
        ],
      },
    ],
  })
})

it('splits a project into separate prod/dev groups based on the domain, not the Dokploy environment name', async () => {
  vi.mocked(fetchDokployProjects).mockResolvedValue([
    {
      projectId: 'p1',
      name: 'Snoroc',
      services: [
        { serviceId: 'a1', name: 'Front Prod', domains: [{ host: 'snoroc.fr', https: true, path: '/' }] },
        { serviceId: 'a2', name: 'Back Prod', domains: [{ host: 'api.snoroc.fr', https: true, path: '/' }] },
        { serviceId: 'a3', name: 'Front Dev', domains: [{ host: 'dev.snoroc.fr', https: true, path: '/' }] },
        { serviceId: 'a4', name: 'Back Dev', domains: [{ host: 'dev-api.snoroc.fr', https: true, path: '/' }] },
      ],
    },
  ])
  vi.mocked(fetchSiteMetadata).mockResolvedValue({
    status: 'up',
    httpStatus: 200,
    latencyMs: 50,
    title: null,
    description: null,
    favicon: null,
  })

  const result = await getSites()

  expect(result.groups.map((group) => group.name)).toEqual(['Snoroc', 'Snoroc · Dev'])
  expect(result.groups[0].services.map((service) => service.name)).toEqual(['Front Prod', 'Back Prod'])
  expect(result.groups[0].services.every((service) => service.environment === 'prod')).toBe(true)
  expect(result.groups[1].services.map((service) => service.name)).toEqual(['Front Dev', 'Back Dev'])
  expect(result.groups[1].services.every((service) => service.environment === 'dev')).toBe(true)
})

it('keeps a degraded entry when a metadata fetch throws unexpectedly, without affecting other sites', async () => {
  vi.mocked(fetchDokployProjects).mockResolvedValue([
    {
      projectId: 'p1',
      name: 'Snoroc',
      services: [
        { serviceId: 'a1', name: 'Front Prod', domains: [{ host: 'snoroc.fr', https: true, path: '/' }] },
        { serviceId: 'a2', name: 'Back Prod', domains: [{ host: 'api.snoroc.fr', https: true, path: '/' }] },
      ],
    },
  ])
  vi.mocked(fetchSiteMetadata).mockImplementation(async (url: string) => {
    if (url.includes('api.')) throw new Error('boom')
    return { status: 'up', httpStatus: 200, latencyMs: 61, title: 'Snoroc', description: null, favicon: null }
  })

  const result = await getSites()

  expect(result.groups[0].services).toEqual([
    {
      name: 'Front Prod',
      url: 'https://snoroc.fr',
      status: 'up',
      title: 'Snoroc',
      description: null,
      favicon: null,
      latencyMs: 61,
      httpStatus: 200,
      environment: 'prod',
    },
    {
      name: 'Back Prod',
      url: 'https://api.snoroc.fr',
      status: 'down',
      title: 'Back Prod',
      description: null,
      favicon: null,
      latencyMs: null,
      httpStatus: null,
      environment: 'prod',
    },
  ])
})

it('builds distinct URLs for services sharing a host but exposed on different paths (Quest api/web)', async () => {
  vi.mocked(fetchDokployProjects).mockResolvedValue([
    {
      projectId: 'p1',
      name: 'Quest',
      services: [
        {
          serviceId: 'a1',
          name: 'quest-api',
          domains: [{ host: 'quest-dev.example.io', https: true, path: '/api' }],
        },
        {
          serviceId: 'a2',
          name: 'quest-web',
          domains: [{ host: 'quest-dev.example.io', https: true, path: '/' }],
        },
      ],
    },
  ])
  vi.mocked(fetchSiteMetadata).mockImplementation(async (url: string) => {
    if (url.endsWith('/api')) {
      return { status: 'up', httpStatus: 404, latencyMs: 10, title: null, description: null, favicon: null }
    }
    return {
      status: 'up',
      httpStatus: 200,
      latencyMs: 10,
      title: 'Quest · Ton atlas de progression',
      description: 'Transforme tes objectifs en quêtes explorables.',
      favicon: null,
    }
  })

  const result = await getSites()

  const urls = result.groups[0].services.map((service) => service.url)
  expect(urls).toEqual(['https://quest-dev.example.io/api', 'https://quest-dev.example.io'])
  expect(new Set(urls).size).toBe(2)
})

it('omits projects that have no service with a configured domain', async () => {
  vi.mocked(fetchDokployProjects).mockResolvedValue([{ projectId: 'p1', name: 'Empty', services: [] }])

  const result = await getSites()

  expect(result.groups).toEqual([])
})

it('serves cached results within the 60s TTL without calling Dokploy again', async () => {
  vi.mocked(fetchDokployProjects).mockResolvedValue([])

  await getSites()
  await getSites()

  expect(fetchDokployProjects).toHaveBeenCalledTimes(1)
})

it('refetches once the 60s cache TTL has expired', async () => {
  vi.mocked(fetchDokployProjects).mockResolvedValue([])

  await getSites()
  vi.setSystemTime(new Date('2026-08-16T10:01:01Z'))
  await getSites()

  expect(fetchDokployProjects).toHaveBeenCalledTimes(2)
})
