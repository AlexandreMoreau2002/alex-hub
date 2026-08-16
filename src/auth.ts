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
