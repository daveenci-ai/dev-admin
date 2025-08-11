import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './db'
import logger from '@/lib/logger'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email
            }
          })

          if (!user || !user.validated) {
            logger.info('Authentication failed: User not found or not validated')
            return null // User doesn't exist or isn't validated
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          )

          if (!isPasswordValid) {
            logger.info('Authentication failed: Invalid password')
            return null
          }

          logger.info('Authentication successful for user:', user.email)
          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name
          }
        } catch (error) {
          logger.error('Authentication error:', error)
          return null
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // Enforce admin domain for auth routes
      try {
        const target = new URL(url, baseUrl)
        const pathname = target.pathname || ''
        if (pathname.startsWith('/auth/')) {
          const adminBase = 'https://admin.daveenci.ai'
          return adminBase + pathname + target.search + target.hash
        }
        // Otherwise keep same-origin redirects
        if (target.origin !== baseUrl) {
          return baseUrl + pathname + target.search + target.hash
        }
        return target.toString()
      } catch {
        return 'https://admin.daveenci.ai/auth/login'
      }
    }
  },
  debug: process.env.NODE_ENV === 'development',
} 