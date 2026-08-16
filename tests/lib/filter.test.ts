import { expect, it } from 'vitest'
import { filterByStatus, filterGroups } from '@/lib/filter'
import type { SiteGroup } from '@/lib/types'

const groups: SiteGroup[] = [
  {
    name: 'Snoroc',
    services: [
      {
        name: 'Front Prod',
        url: 'https://snoroc.fr',
        status: 'up',
        title: 'Snoroc',
        description: null,
        favicon: null,
        latencyMs: 128,
        httpStatus: 200,
        environment: 'prod',
      },
      {
        name: 'Docs',
        url: 'https://docs.snoroc.fr',
        status: 'down',
        title: 'Docs',
        description: null,
        favicon: null,
        latencyMs: null,
        httpStatus: 504,
        environment: 'prod',
      },
    ],
  },
  {
    name: 'Cloudbreak',
    services: [
      {
        name: 'App',
        url: 'https://cloudbreak.app',
        status: 'up',
        title: 'Cloudbreak',
        description: null,
        favicon: null,
        latencyMs: 96,
        httpStatus: 200,
        environment: 'prod',
      },
    ],
  },
]

it('returns every group unchanged when the query is empty', () => {
  expect(filterGroups(groups, '')).toEqual(groups)
})

it('keeps a whole group when the group name matches', () => {
  expect(filterGroups(groups, 'snoroc')).toEqual([groups[0]])
})

it('filters services within a group by title/name/url', () => {
  expect(filterGroups(groups, 'cloudbreak.app')).toEqual([groups[1]])
})

it('returns an empty array when nothing matches', () => {
  expect(filterGroups(groups, 'inexistant')).toEqual([])
})

it('returns every group unchanged for the "all" status filter', () => {
  expect(filterByStatus(groups, 'all')).toEqual(groups)
})

it('keeps only up services for the "up" status filter, dropping empty groups', () => {
  expect(filterByStatus(groups, 'up')).toEqual([
    { name: 'Snoroc', services: [groups[0].services[0]] },
    { name: 'Cloudbreak', services: [groups[1].services[0]] },
  ])
})

it('keeps only down services for the "down" status filter, dropping empty groups', () => {
  expect(filterByStatus(groups, 'down')).toEqual([{ name: 'Snoroc', services: [groups[0].services[1]] }])
})
