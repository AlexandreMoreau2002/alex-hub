import { expect, it } from 'vitest'
import { formatStatusMeta, hostOf, initialOf } from '@/lib/format'

it('formats an up site with its latency', () => {
  expect(formatStatusMeta({ status: 'up', latencyMs: 128, httpStatus: 200 })).toBe('128 ms')
})

it('formats an up site with unknown latency', () => {
  expect(formatStatusMeta({ status: 'up', latencyMs: null, httpStatus: 200 })).toBe('—')
})

it('formats a down site with an http status code', () => {
  expect(formatStatusMeta({ status: 'down', latencyMs: null, httpStatus: 504 })).toBe('504')
})

it('formats a down site with no http status as a timeout', () => {
  expect(formatStatusMeta({ status: 'down', latencyMs: null, httpStatus: null })).toBe('timeout')
})

it('extracts the host from a url', () => {
  expect(hostOf('https://app.snoroc.fr/path')).toBe('app.snoroc.fr')
})

it('falls back to the raw string when the url is invalid', () => {
  expect(hostOf('not-a-url')).toBe('not-a-url')
})

it('extracts an uppercase initial from a title', () => {
  expect(initialOf('snoroc')).toBe('S')
})

it('falls back to a question mark for an empty title', () => {
  expect(initialOf('   ')).toBe('?')
})
