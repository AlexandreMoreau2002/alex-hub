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

it('maps projects/environments/applications into grouped services, fetching domains per application', async () => {
  const projectAll = [
    {
      projectId: 'p1',
      name: 'Snoroc',
      environments: [
        {
          name: 'production',
          environmentId: 'e1',
          applications: [{ applicationId: 'a1', name: 'Front Prod', applicationStatus: 'done' }],
        },
      ],
    },
  ]
  const applicationOne = {
    applicationId: 'a1',
    name: 'Front Prod',
    domains: [{ host: 'snoroc.fr', https: true, path: '/' }],
  }

  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (url.includes('/api/project.all')) {
        return { ok: true, status: 200, json: async () => projectAll }
      }
      if (url.includes('/api/application.one')) {
        return { ok: true, status: 200, json: async () => applicationOne }
      }
      throw new Error(`unexpected url ${url}`)
    })
  )

  const projects = await fetchDokployProjects()

  expect(projects).toEqual([
    {
      projectId: 'p1',
      name: 'Snoroc',
      services: [{ serviceId: 'a1', name: 'Front Prod', domains: [{ host: 'snoroc.fr', https: true, path: '/' }] }],
    },
  ])
})

it('drops an application that has no configured domain', async () => {
  const projectAll = [
    {
      projectId: 'p1',
      name: 'Snoroc',
      environments: [
        { name: 'production', environmentId: 'e1', applications: [{ applicationId: 'a2', name: 'Worker' }] },
      ],
    },
  ]

  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (url.includes('/api/project.all')) return { ok: true, status: 200, json: async () => projectAll }
      if (url.includes('/api/application.one')) {
        return { ok: true, status: 200, json: async () => ({ applicationId: 'a2', name: 'Worker', domains: [] }) }
      }
      throw new Error('unexpected url')
    })
  )

  const projects = await fetchDokployProjects()

  expect(projects).toEqual([{ projectId: 'p1', name: 'Snoroc', services: [] }])
})

it('degrades a single application to no domains when its application.one call fails, without failing the whole request', async () => {
  const projectAll = [
    {
      projectId: 'p1',
      name: 'Snoroc',
      environments: [
        {
          name: 'production',
          environmentId: 'e1',
          applications: [
            { applicationId: 'a1', name: 'Front Prod' },
            { applicationId: 'a2', name: 'Back Prod' },
          ],
        },
      ],
    },
  ]

  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (url.includes('/api/project.all')) return { ok: true, status: 200, json: async () => projectAll }
      if (url.includes('applicationId=a1')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ applicationId: 'a1', name: 'Front Prod', domains: [{ host: 'snoroc.fr', https: true, path: '/' }] }),
        }
      }
      if (url.includes('applicationId=a2')) {
        return { ok: false, status: 500, json: async () => ({}) }
      }
      throw new Error('unexpected url')
    })
  )

  const projects = await fetchDokployProjects()

  expect(projects).toEqual([
    {
      projectId: 'p1',
      name: 'Snoroc',
      services: [{ serviceId: 'a1', name: 'Front Prod', domains: [{ host: 'snoroc.fr', https: true, path: '/' }] }],
    },
  ])
})

it('merges applications across multiple environments of the same project', async () => {
  const projectAll = [
    {
      projectId: 'p1',
      name: 'Snoroc',
      environments: [
        { name: 'production', environmentId: 'e1', applications: [{ applicationId: 'a1', name: 'Front Prod' }] },
        { name: 'dev', environmentId: 'e2', applications: [{ applicationId: 'a2', name: 'Front Dev' }] },
      ],
    },
  ]

  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (url.includes('/api/project.all')) return { ok: true, status: 200, json: async () => projectAll }
      if (url.includes('applicationId=a1')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ applicationId: 'a1', name: 'Front Prod', domains: [{ host: 'snoroc.fr', https: true, path: '/' }] }),
        }
      }
      if (url.includes('applicationId=a2')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ applicationId: 'a2', name: 'Front Dev', domains: [{ host: 'dev.snoroc.fr', https: true, path: '/' }] }),
        }
      }
      throw new Error('unexpected url')
    })
  )

  const projects = await fetchDokployProjects()

  expect(projects[0].services).toHaveLength(2)
  expect(projects[0].services.map((service) => service.name).sort()).toEqual(['Front Dev', 'Front Prod'])
})

it('throws DokployApiError when project.all responds with a non-2xx status', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) }))

  await expect(fetchDokployProjects()).rejects.toBeInstanceOf(DokployApiError)
})

it('throws DokployApiError when env vars are missing', async () => {
  process.env.DOKPLOY_API_TOKEN = ''

  await expect(fetchDokployProjects()).rejects.toBeInstanceOf(DokployApiError)
})
