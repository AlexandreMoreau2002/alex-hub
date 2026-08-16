import { expect, it } from 'vitest'
import { filterGroups } from '@/lib/filter'
import type { SiteGroup } from '@/lib/types'

const groups: SiteGroup[] = [
  {
    name: 'Snoroc',
    services: [
      { name: 'Front Prod', url: 'https://snoroc.fr', status: 'up', title: 'Snoroc', description: null, favicon: null },
    ],
  },
  {
    name: 'Cloudbreak',
    services: [
      { name: 'App', url: 'https://cloudbreak.app', status: 'up', title: 'Cloudbreak', description: null, favicon: null },
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
