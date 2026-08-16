'use client'

import { Suspense, useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import styles from './login.module.css'

// Message affiché quand Auth.js redirige vers /login?error=... — notamment le cas où
// GitHub a authentifié la personne, mais que ce n'est pas le compte autorisé
// (ALLOWED_GITHUB_USERNAME), ou que l'OAuth App est mal configurée côté serveur.
function githubErrorMessage(error: string | null): string | null {
  if (!error) return null
  if (error === 'AccessDenied') {
    return "Ce compte GitHub n'est pas autorisé à accéder à Alex Hub."
  }
  return 'Connexion GitHub impossible. Réessaie ou utilise le mot de passe.'
}

function GithubErrorBanner() {
  const searchParams = useSearchParams()
  const message = githubErrorMessage(searchParams.get('error'))
  return message ? <p className={styles.error}>{message}</p> : null
}

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
      <Suspense fallback={null}>
        <GithubErrorBanner />
      </Suspense>
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
