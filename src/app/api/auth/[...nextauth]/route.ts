import NextAuth, { type NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { auditLogger } from '@/lib/security/audit'
import { checkRateLimit } from '@/lib/security/rateLimit'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials')
        }

        const forwarded = req?.headers?.['x-forwarded-for']
        const ip = Array.isArray(forwarded)
          ? forwarded[0]
          : typeof forwarded === 'string'
            ? forwarded.split(',')[0].trim()
            : 'unknown'

        if (!checkRateLimit(`login:${ip}`, 5, 15 * 60 * 1000)) {
          await auditLogger.logAuth(
            credentials.email,
            'LOGIN_LOCKED_OUT',
            'failure',
            ip
          )
          throw new Error('Account temporarily locked due to too many failed attempts')
        }
        
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })
        
        if (!user || !user.isActive) {
          await auditLogger.logAuth(
            credentials.email,
            'LOGIN_FAILED',
            'failure',
            ip
          )
          throw new Error('Invalid credentials')
        }
        
        const isPasswordValid = await bcrypt.compare(credentials.password, user.password)
        
        if (!isPasswordValid) {
          await auditLogger.logAuth(
            user.id,
            'LOGIN_FAILED',
            'failure',
            ip
          )
          throw new Error('Invalid credentials')
        }
        
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() },
        })
        
        await auditLogger.logAuth(
          user.id,
          'LOGIN_SUCCESS',
          'success',
          ip
        )
        
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt' as const,
    maxAge: 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as { role: string; id: string }
        token.role = u.role
        token.id = u.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string
        session.user.id = token.id as string
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' ? '__Secure-next-auth.session-token' : 'next-auth.session-token',
      options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      },
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
