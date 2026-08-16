import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import GitHub from 'next-auth/providers/github'
import { checkPassword, isAllowedGithubUser } from '@/lib/auth'

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true, // requis derrière le reverse proxy Traefik de Dokploy
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
          // id constant volontaire : une seule identité possible pour la connexion par mot
          // de passe (pas de notion de compte multiple ici).
          if (checkPassword(password)) {
            return { id: 'alex-hub-password-user' }
          }
        } catch (error) {
          // password comparison error (e.g. ALEX_HUB_PASSWORD manquant côté serveur) — log
          // pour le diagnostic, mais on répond comme un échec normal côté client, pas de fuite
          // d'info sur la cause exacte.
          console.error('checkPassword a échoué (config serveur ?) :', error)
          return null
        }
        return null
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      // Allow-list explicite par provider plutôt qu'un `return true` par défaut : un futur
      // provider ajouté à `providers` sans mise à jour de ce callback est refusé par défaut
      // (fail-closed) plutôt qu'autorisé silencieusement.
      if (account?.provider === 'github') {
        try {
          return isAllowedGithubUser(profile?.login as string | undefined)
        } catch (error) {
          console.error('isAllowedGithubUser a échoué (ALLOWED_GITHUB_USERNAME manquant ?) :', error)
          return false
        }
      }
      if (account?.provider === 'credentials') {
        return true
      }
      return false
    },
  },
})
