import { NextRequest, NextResponse } from 'next/server'
import { checkPassword, createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const password = typeof body?.password === 'string' ? body.password : ''

  let valid: boolean
  try {
    valid = checkPassword(password)
  } catch {
    return NextResponse.json({ error: 'Configuration serveur invalide' }, { status: 500 })
  }

  if (!valid) {
    return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 })
  }

  const token = await createSessionToken()
  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  })
  return response
}
