# Auth GitHub + mot de passe en secours Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Alex Hub's hand-rolled session system with Auth.js (next-auth v5), configured
with a GitHub OAuth provider (restricted to a single allowed GitHub username) and a Credentials
provider (reuses the existing password check) as a fallback.

**Architecture:** Auth.js owns session issuance/verification (signed JWT cookie) instead of the
custom HMAC token system. `middleware.ts` wraps Auth.js's `auth()` to gate every route except
`/login` and `/api/auth/*`, preserving the existing behavior of a JSON 401 for API routes and a
redirect for pages. The GitHub restriction and the password check are both pure, independently
testable functions wired into the Auth.js config — the config itself (framework glue) is not
unit tested, consistent with how `middleware.ts` and the API routes are already handled in this
codebase (verified manually, not unit tested).

**Tech Stack:** Auth.js / next-auth v5 (`next-auth@beta` at the time of writing — Auth.js v5 was
still in beta; **verify the current recommended install command and API shape against
https://authjs.dev before starting**, per the design spec's explicit warning that the v5 API
moved several times during its beta period).

Reference spec: `docs/superpowers/specs/2026-08-16-github-auth-design.md`

**Manual prerequisite (must be done by Alexandre before Task 2):** create a GitHub OAuth App at
https://github.com/settings/developers with Homepage URL
`https://alex-hub.51.178.37.35.nip.io` and Authorization callback URL
`https://alex-hub.51.178.37.35.nip.io/api/auth/callback/github`. Get the Client ID, generate a
Client Secret. Both values are needed to fill in Dokploy env vars in Task 2 — do not proceed
past Task 1 without them.

---

## Task 1: Install Auth.js, extract testable auth-restriction logic

**Files:**
- Modify: `package.json`
- Modify: `src/lib/auth.ts`
- Modify: `tests/lib/auth.test.ts`
- Modify: `.env.example`

- [ ] **Step 1: Install Auth.js**

Run: `npm install next-auth@beta`
Expected: adds `next-auth` to `package.json` dependencies. **Verify the installed version's
docs at https://authjs.dev/getting-started/installation?framework=Next.js before writing Task 2
— if the recommended API differs from what's shown below (e.g. a stable v5 has since shipped
with a different config shape), follow the current docs instead of this plan's exact syntax.
The architecture decisions (two providers, signIn restriction callback, session replaces the
custom HMAC system) stay the same regardless of exact API surface.**

- [ ] **Step 2: Write the failing test for the GitHub username restriction**

Add to `tests/lib/auth.test.ts` (keep the existing `checkPassword` tests, this is additive):

```typescript
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
```

Add the matching import at the top of the test file: `isAllowedGithubUser` alongside the
existing `checkPassword` import from `@/lib/auth`.

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test -- tests/lib/auth.test.ts`
Expected: FAIL — `isAllowedGithubUser` is not exported by `@/lib/auth`.

- [ ] **Step 4: Update `src/lib/auth.ts`**

Remove `createSessionToken`, `isValidSessionToken`, `SESSION_COOKIE_NAME`, and the now-unused
`hmac`/`bufferToHex`/`SESSION_TTL_MS` helpers that existed only to support them (Auth.js takes
over session issuance entirely). Keep `checkPassword` and `timingSafeEqualStrings` exactly as
they are. Add:

```typescript
export function isAllowedGithubUser(login: string | undefined): boolean {
  const allowed = process.env.ALLOWED_GITHUB_USERNAME
  if (!allowed) {
    throw new Error('ALLOWED_GITHUB_USERNAME manquant')
  }
  return login === allowed
}
```

The full file after this change should contain only: `getSecret`-equivalent removed (no longer
needed — `checkPassword` doesn't use it), `timingSafeEqualStrings`, `checkPassword`,
`isAllowedGithubUser`. Double-check nothing else in the codebase still imports
`createSessionToken`/`isValidSessionToken`/`SESSION_COOKIE_NAME` before removing them (Task 3
and Task 4 below are exactly the call sites that need updating in the same change set — do
Tasks 1-4 of this plan as one coherent unit if `tsc` complains about dangling imports between
steps, rather than leaving the build broken between commits).

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -- tests/lib/auth.test.ts`
Expected: PASS (`checkPassword` tests + the 4 new `isAllowedGithubUser` tests; the old
`createSessionToken`/`isValidSessionToken` tests must be deleted from this file since those
functions no longer exist).

- [ ] **Step 6: Update `.env.example`**

Replace the "Auth du hub" section with:

```
# Auth du hub (Auth.js — GitHub OAuth + mot de passe en secours)
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
AUTH_SECRET=
ALLOWED_GITHUB_USERNAME=AlexandreMoreau2002
ALEX_HUB_PASSWORD=
```

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/lib/auth.ts tests/lib/auth.test.ts .env.example
git commit -m "chore: install Auth.js, replace hand-rolled session helpers with isAllowedGithubUser"
```

---

## Task 2: Auth.js configuration

**Files:**
- Create: `src/auth.ts`

**Do not start this task until Alexandre has provided the real `AUTH_GITHUB_ID` and
`AUTH_GITHUB_SECRET` values (see the manual prerequisite at the top of this plan) — without
them the GitHub provider cannot be exercised end-to-end in Task 6's manual verification.**

- [ ] **Step 1: Create `src/auth.ts`**

Verify this shape against the current Auth.js docs before writing it (see Task 1 Step 1 note).
As of the v5 beta, the pattern is:

```typescript
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import GitHub from 'next-auth/providers/github'
import { checkPassword, isAllowedGithubUser } from '@/lib/auth'

export const { handlers, auth, signIn, signOut } = NextAuth({
  pages: {
    signIn: '/login',
  },
  providers: [
    GitHub,
    Credentials({
      credentials: { password: {} },
      authorize: async (credentials) => {
        const password = typeof credentials?.password === 'string' ? credentials.password : ''
        try {
          if (checkPassword(password)) {
            return { id: 'alex-hub-password-user' }
          }
        } catch {
          return null
        }
        return null
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === 'github') {
        try {
          return isAllowedGithubUser(profile?.login as string | undefined)
        } catch {
          return false
        }
      }
      return true
    },
  },
})
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors from `src/auth.ts` itself (errors from files not yet updated — middleware,
login page, the old API routes — are expected until Tasks 3-5 land; only check that this new
file compiles cleanly in isolation).

- [ ] **Step 3: Commit**

```bash
git add src/auth.ts
git commit -m "feat: Auth.js config with GitHub (restricted) and password providers"
```

---

## Task 3: Auth.js route handler

**Files:**
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Delete: `src/app/api/login/route.ts`
- Delete: `src/app/api/logout/route.ts`

- [ ] **Step 1: Create `src/app/api/auth/[...nextauth]/route.ts`**

```typescript
import { handlers } from '@/auth'

export const { GET, POST } = handlers
```

- [ ] **Step 2: Delete the old hand-rolled login/logout routes**

```bash
git rm src/app/api/login/route.ts src/app/api/logout/route.ts
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: errors remaining should only come from `middleware.ts` (Task 4) and
`src/app/login/page.tsx` (Task 5) still referencing the removed exports — nothing from the
files touched in this task.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/auth
git commit -m "feat: Auth.js route handler, remove hand-rolled login/logout routes"
```

---

## Task 4: Middleware — gate routes via Auth.js

**Files:**
- Modify: `src/middleware.ts`

- [ ] **Step 1: Replace `src/middleware.ts`**

```typescript
import { NextResponse } from 'next/server'

import { auth } from '@/auth'

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth).*)'],
}

export default auth((request) => {
  const { pathname } = request.nextUrl

  if (pathname === '/login') {
    return NextResponse.next()
  }

  if (request.auth) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const loginUrl = new URL('/login', request.url)
  return NextResponse.redirect(loginUrl)
})
```

Note the matcher excludes `api/auth` entirely (the OAuth callback and credentials sign-in POST
must be reachable without an existing session — that's the whole point of those routes) — this
replaces the old `PUBLIC_PATHS` array approach, which only needs to keep `/login` since
`/api/login` no longer exists.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: only `src/app/login/page.tsx` (Task 5) should still error.

- [ ] **Step 3: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: gate routes through Auth.js session instead of the hand-rolled cookie check"
```

---

## Task 5: Login page — GitHub button + password fallback

**Files:**
- Modify: `src/app/login/page.tsx`
- Modify: `src/app/login/login.module.css`

- [ ] **Step 1: Replace `src/app/login/page.tsx`**

```tsx
'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import styles from './login.module.css'

export default function LoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    const result = await signIn('credentials', { password, redirect: false })

    setSubmitting(false)

    if (!result || result.error) {
      setError('Mot de passe incorrect')
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Alex hub</h1>
      <button type="button" onClick={() => signIn('github', { callbackUrl: '/' })} className={styles.github}>
        Se connecter avec GitHub
      </button>
      <div className={styles.divider}>ou</div>
      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Mot de passe"
          className={styles.input}
        />
        {error ? <p className={styles.error}>{error}</p> : null}
        <button type="submit" disabled={submitting} className={styles.submit}>
          {submitting ? 'Connexion…' : 'Entrer'}
        </button>
      </form>
    </main>
  )
}
```

- [ ] **Step 2: Add the new styles to `src/app/login/login.module.css`**

Append (keep every existing rule in this file untouched):

```css
.github {
  height: 44px;
  border: 0;
  border-radius: var(--radius-md);
  background: var(--fg);
  color: var(--bg);
  font-size: 14px;
  font-weight: 600;
  transition: transform var(--dur-fast) var(--ease);
}

.github:hover {
  transform: translateY(-1px);
}

.divider {
  margin: 16px 0;
  text-align: center;
  font-size: 12px;
  color: var(--fg-subtle);
}
```

- [ ] **Step 3: Type-check and build**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/login/page.tsx src/app/login/login.module.css
git commit -m "feat: GitHub sign-in button and password fallback on the login page"
```

---

## Task 6: Deployment config, docs, and manual verification

**Files:**
- Modify: `README.md`
- Modify: `docs/alex-hub/guide-test.md`
- Modify: `http/alex-hub.http`

- [ ] **Step 1: Update `README.md`'s env var list**

Replace the "Auth du hub" bullet list with the same 5 variables from Task 1 Step 6
(`AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, `AUTH_SECRET`, `ALLOWED_GITHUB_USERNAME`,
`ALEX_HUB_PASSWORD`), and add one line noting the GitHub OAuth App must be created manually
first (link to https://github.com/settings/developers, callback URL
`<domain>/api/auth/callback/github`).

- [ ] **Step 2: Update `docs/alex-hub/guide-test.md`**

Add a new scenario before the existing "Scénario 1 — accès protégé par mot de passe" (renumber
subsequent scenarios by one):

```markdown
## Scénario 1 — connexion GitHub

1. Ouvre `/login` en navigation privée.
2. Clique sur "Se connecter avec GitHub".
3. **Attendu** : redirection vers GitHub, autorisation de l'OAuth App, puis retour sur `/` déjà
   connecté.
4. Déconnecte-toi (si un bouton de déconnexion existe — sinon vide le cookie de session
   manuellement pour le test), reconnecte-toi une seconde fois : doit fonctionner sans
   re-demander l'autorisation GitHub (déjà accordée).
5. **Cas limite — compte non autorisé** : si tu as un second compte GitHub de test, tente de te
   connecter avec. **Attendu** : refusé, retour à `/login`, même si GitHub lui-même a validé
   l'authentification (c'est `isAllowedGithubUser` qui bloque, pas GitHub).
```

- [ ] **Step 3: Update `http/alex-hub.http`**

Replace the whole file — the old `/api/login`/`/api/logout` requests no longer exist:

```http
### Variables
@baseUrl = http://localhost:3000

### 1. Liste des sites (nécessite une session active — se connecter au préalable via le
### navigateur sur /login, puis copier le cookie de session Auth.js depuis les devtools ici)
GET {{baseUrl}}/api/sites
Cookie: authjs.session-token=PASTE_YOUR_SESSION_COOKIE_HERE
```

Note the exact Auth.js session cookie name (`authjs.session-token` as of the v5 beta, may be
`next-auth.session-token` depending on the exact version — check the `Set-Cookie` header from a
real browser login and correct this file if the name differs) — this is inherently harder to
script via `.http` request chaining than the old password-based login, since OAuth requires a
real browser round-trip with GitHub. The Credentials provider path can still be scripted:

```http
### Alternative : connexion par mot de passe (provider Credentials), scriptable
# @name login
POST {{baseUrl}}/api/auth/callback/credentials
Content-Type: application/x-www-form-urlencoded

password=YOUR_PASSWORD_HERE
```

(Exact Auth.js Credentials POST shape — including any required CSRF token fetched from
`/api/auth/csrf` first — must be verified against the real running app once Task 2's API shape
is confirmed; adjust this file then rather than trusting this plan's guess.)

- [ ] **Step 4: Full manual verification**

Run: `npm run test`
Expected: all tests pass (the `createSessionToken`/`isValidSessionToken` tests are gone, replaced
by `isAllowedGithubUser` tests — total count will be lower than before this plan, that's
expected).

Run: `npx tsc --noEmit && npm run build`
Expected: both succeed.

Manually walk through `docs/alex-hub/guide-test.md` end-to-end against a real deployment
(GitHub login, password fallback login, unauthorized GitHub account rejection, and every
pre-existing scenario) before considering this feature done — this plan's automated coverage is
intentionally limited to the two pure functions (`checkPassword`, `isAllowedGithubUser`); the
OAuth dance itself can only be verified by hand against the real GitHub OAuth App.

- [ ] **Step 5: Commit**

```bash
git add README.md docs/alex-hub/guide-test.md http/alex-hub.http
git commit -m "docs: update README, test guide and .http file for Auth.js"
```
