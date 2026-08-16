import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { DokployApiError, fetchDokployProjects } from '@/lib/dokploy'

const ORIGINAL_ENV = process.env

beforeEach(() => {
  process.env = {
    ...ORIGINAL_ENV,
    DOKPLOY_API_URL: 'http://dokploy.test',
    DOKPLOY_API_TOKEN: 'token',
  }
})

afterEach(() => {
  process.env = ORIGINAL_ENV
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('maps raw Dokploy projects into grouped services with domains', async () => {
  const rawResponse = [
    {
      projectId: 'p1',
      name: 'Snoroc',
      applications: [
        { applicationId: 'a1', name: 'Front Prod', domains: [{ host: 'snoroc.fr', https: true }] },
        { applicationId: 'a2', name: 'Worker', domains: [] },
      ],
      compose: [],
    },
  ]

  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => rawResponse,
    })
  )

  const projects = await fetchDokployProjects()

  expect(projects).toEqual([
    {
      projectId: 'p1',
      name: 'Snoroc',
      services: [
        {
          serviceId: 'a1',
          name: 'Front Prod',
          domains: [{ host: 'snoroc.fr', https: true }],
        },
      ],
    },
  ])
})

it('throws DokployApiError when the API responds with a non-2xx status', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) }))

  await expect(fetchDokployProjects()).rejects.toBeInstanceOf(DokployApiError)
})

it('throws DokployApiError when env vars are missing', async () => {
  process.env.DOKPLOY_API_TOKEN = ''

  await expect(fetchDokployProjects()).rejects.toBeInstanceOf(DokployApiError)
})
