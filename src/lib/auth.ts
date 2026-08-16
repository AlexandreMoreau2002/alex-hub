const SESSION_COOKIE_NAME = 'alex_hub_session'
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 jours

function getSecret(): string {
  const secret = process.env.ALEX_HUB_SESSION_SECRET
  if (!secret) {
    throw new Error('ALEX_HUB_SESSION_SECRET manquant')
  }
  return secret
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

async function hmac(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return bufferToHex(signatureBuffer)
}

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

export async function createSessionToken(): Promise<string> {
  const expiresAt = Date.now() + SESSION_TTL_MS
  const payload = `${expiresAt}`
  const signature = await hmac(payload, getSecret())
  return `${payload}.${signature}`
}

export async function isValidSessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return false

  const expectedSignature = await hmac(payload, getSecret())
  if (!timingSafeEqualStrings(signature, expectedSignature)) return false

  const expiresAt = Number(payload)
  return Number.isFinite(expiresAt) && expiresAt > Date.now()
}

export { SESSION_COOKIE_NAME }
