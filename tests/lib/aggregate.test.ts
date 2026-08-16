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

it('groups services by project and merges metadata', async () => {
  vi.mocked(fetchDokployProjects).mockResolvedValue([
    {
      projectId: 'p1',
      name: 'Snoroc',
      services: [{ serviceId: 'a1', name: 'Front Prod', domains: [{ host: 'snoroc.fr', https: true }] }],
    },
  ])
  vi.mocked(fetchSiteMetadata).mockResolvedValue({
    status: 'up',
    httpStatus: 200,
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
          },
        ],
      },
    ],
  })
})

it('keeps a degraded entry when a metadata fetch throws unexpectedly, without affecting other sites', async () => {
  vi.mocked(fetchDokployProjects).mockResolvedValue([
    {
      projectId: 'p1',
      name: 'Snoroc',
      services: [
        { serviceId: 'a1', name: 'Front Prod', domains: [{ host: 'snoroc.fr', https: true }] },
        { serviceId: 'a2', name: 'Back Prod', domains: [{ host: 'api.snoroc.fr', https: true }] },
      ],
    },
  ])
  vi.mocked(fetchSiteMetadata).mockImplementation(async (url: string) => {
    if (url.includes('api.')) throw new Error('boom')
    return { status: 'up', httpStatus: 200, title: 'Snoroc', description: null, favicon: null }
  })

  const result = await getSites()

  expect(result.groups[0].services).toEqual([
    { name: 'Front Prod', url: 'https://snoroc.fr', status: 'up', title: 'Snoroc', description: null, favicon: null },
    { name: 'Back Prod', url: 'https://api.snoroc.fr', status: 'down', title: 'Back Prod', description: null, favicon: null },
  ])
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
