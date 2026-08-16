import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { checkPassword, isAllowedGithubUser } from '@/lib/auth'

const ORIGINAL_ENV = process.env

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV, ALEX_HUB_PASSWORD: 'correct-horse' }
})

afterEach(() => {
  process.env = ORIGINAL_ENV
})

describe('checkPassword', () => {
  it('returns true for the correct password', () => {
    expect(checkPassword('correct-horse')).toBe(true)
  })

  it('returns false for an incorrect password', () => {
    expect(checkPassword('wrong')).toBe(false)
  })
})

describe('isAllowedGithubUser', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, ALLOWED_GITHUB_USERNAME: 'AlexandreMoreau2002' }
  })

  it('allows the configured username', () => {
    expect(isAllowedGithubUser('AlexandreMoreau2002')).toBe(true)
  })

  it('rejects any other username', () => {
    expect(isAllowedGithubUser('someone-else')).toBe(false)
  })

  it('rejects an undefined login', () => {
    expect(isAllowedGithubUser(undefined)).toBe(false)
  })

  it('throws if ALLOWED_GITHUB_USERNAME is not configured', () => {
    process.env.ALLOWED_GITHUB_USERNAME = ''
    expect(() => isAllowedGithubUser('AlexandreMoreau2002')).toThrow()
  })
})
