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
        mfaVerified: { label: 'MFA Verified', type: 'text' },
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

        const user = await prisma.user.findFirst({
          where: { email: credentials.email },
        })

        if (!checkRateLimit(`login:${ip}`, 5, 15 * 60 * 1000)) {
          if (user) {
            await auditLogger.logAuth(null, user.tenantId, user.id, 'LOGIN_LOCKED_OUT', 'failure', ip)
          }
          throw new Error('Account temporarily locked due to too many failed attempts')
        }

        if (!user || !user.isActive) {
          await auditLogger.logAuth(
            null,
            user?.tenantId || 'unknown',
            null,
            'LOGIN_FAILED',
            'failure',
            ip
          )
          throw new Error('Invalid credentials')
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password)

        if (!isPasswordValid) {
          await prisma.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: { increment: 1 } },
          }).catch(() => {})

          const updatedUser = await prisma.user.findUnique({ where: { id: user.id } })
          if (updatedUser && updatedUser.failedLoginAttempts >= 10) {
            await prisma.user.update({
              where: { id: user.id },
              data: { isActive: false },
            })
            await auditLogger.logAuth(null, user.tenantId, user.id, 'ACCOUNT_LOCKED', 'failure', ip)
            throw new Error('Account has been locked due to too many failed attempts')
          }

          await auditLogger.logAuth(
            null,
            user.tenantId,
            user.id,
            'LOGIN_FAILED',
            'failure',
            ip
          )
          throw new Error('Invalid credentials')
        }

        if (user.mfaEnabled && credentials.mfaVerified !== 'true') {
          throw new Error('MFA_REQUIRED')
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date(), failedLoginAttempts: 0 },
        })

        await auditLogger.logAuth(
          null,
          user.tenantId,
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
          tenantId: user.tenantId,
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt' as const,
    maxAge: 8 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as { role: string; id: string; tenantId: string }
        token.role = u.role
        token.id = u.id
        token.tenantId = u.tenantId
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string
        session.user.id = token.id as string
        session.user.tenantId = token.tenantId as string
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
