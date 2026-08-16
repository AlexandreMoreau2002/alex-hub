import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { checkPassword, createSessionToken, isValidSessionToken } from '@/lib/auth'

const ORIGINAL_ENV = process.env

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV, ALEX_HUB_PASSWORD: 'correct-horse', ALEX_HUB_SESSION_SECRET: 'super-secret' }
})

afterEach(() => {
  process.env = ORIGINAL_ENV
  vi.useRealTimers()
})

describe('checkPassword', () => {
  it('returns true for the correct password', () => {
    expect(checkPassword('correct-horse')).toBe(true)
  })

  it('returns false for an incorrect password', () => {
    expect(checkPassword('wrong')).toBe(false)
  })
})

describe('session tokens', () => {
  it('creates a token that is valid immediately', async () => {
    const token = await createSessionToken()
    expect(await isValidSessionToken(token)).toBe(true)
  })

  it('rejects a tampered token', async () => {
    const token = await createSessionToken()
    const tampered = token.slice(0, -1) + (token.endsWith('0') ? '1' : '0')
    expect(await isValidSessionToken(tampered)).toBe(false)
  })

  it('rejects an expired token', async () => {
    vi.useFakeTimers().setSystemTime(new Date('2026-08-16T10:00:00Z'))
    const token = await createSessionToken()
    vi.setSystemTime(new Date('2026-08-23T10:00:01Z')) // 7 jours + 1s plus tard
    expect(await isValidSessionToken(token)).toBe(false)
  })

  it('rejects undefined/empty tokens', async () => {
    expect(await isValidSessionToken(undefined)).toBe(false)
    expect(await isValidSessionToken('')).toBe(false)
  })
})
