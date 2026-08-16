import { expect, it } from 'vitest'
import { detectEnvironment, formatEnvironmentLabel } from '@/lib/environment'

it('detects prod for a bare domain with no environment marker', () => {
  expect(detectEnvironment('snoroc.fr')).toBe('prod')
  expect(detectEnvironment('api.snoroc.fr')).toBe('prod')
})

it('detects dev from a dev- prefix', () => {
  expect(detectEnvironment('dev-api.snoroc.fr')).toBe('dev')
  expect(detectEnvironment('dev-ops.cloudbreak-app.com')).toBe('dev')
})

it('detects dev from a dev. prefix', () => {
  expect(detectEnvironment('dev.snoroc.fr')).toBe('dev')
})

it('detects dev from a -dev suffix on a nip.io subdomain', () => {
  expect(detectEnvironment('quest-dev.51.178.37.35.nip.io')).toBe('dev')
})

it('does not false-positive on a name that merely contains "dev" without a boundary', () => {
  expect(detectEnvironment('devops.example.com')).toBe('prod')
  expect(detectEnvironment('development.example.com')).toBe('prod')
})

it('detects preprod/staging markers', () => {
  expect(detectEnvironment('preprod.example.com')).toBe('preprod')
  expect(detectEnvironment('staging-api.example.com')).toBe('preprod')
  expect(detectEnvironment('pre-prod.example.com')).toBe('preprod')
})

it('is case-insensitive', () => {
  expect(detectEnvironment('DEV-API.SNOROC.FR')).toBe('dev')
})

it('formats environment labels for display', () => {
  expect(formatEnvironmentLabel('prod')).toBe('Prod')
  expect(formatEnvironmentLabel('dev')).toBe('Dev')
  expect(formatEnvironmentLabel('preprod')).toBe('Preprod')
})
