function timingSafeEqualStrings(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}

export function checkPassword(candidate: string): boolean {
  const expected = process.env.ALEX_HUB_PASSWORD
  if (!expected) {
    throw new Error('ALEX_HUB_PASSWORD manquant')
  }
  return timingSafeEqualStrings(candidate, expected)
}

export function isAllowedGithubUser(login: string | undefined): boolean {
  const allowed = process.env.ALLOWED_GITHUB_USERNAME
  if (!allowed) {
    throw new Error('ALLOWED_GITHUB_USERNAME manquant')
  }
  return login === allowed
}
