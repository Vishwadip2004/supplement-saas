import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { encode } from 'next-auth/jwt'
import bcrypt from 'bcryptjs'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'
import { auditLogger } from '@/lib/security/audit'
import { validateCsrfRequest } from '@/lib/csrf'
import { checkRateLimit, getClientIp } from '@/lib/security/rateLimit'
import { z } from 'zod'

const switchRoleSchema = z.object({
  targetRole: z.enum(['ADMIN', 'MANAGER', 'STAFF']),
  password: z.string().optional(),
})

export async function POST(request: Request) {
  if (!validateCsrfRequest(request)) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 })
  }

  const ip = getClientIp(request)
  if (!(await checkRateLimit(ip))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const validation = switchRoleSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.error.format() }, { status: 400 })
    }

    const { targetRole, password } = validation.data

    const currentRole = session.user.role

    if (currentRole === targetRole) {
      return NextResponse.json({ error: 'Already using this role' }, { status: 400 })
    }

    if (targetRole === 'ADMIN' || targetRole === 'MANAGER') {
      if (!password) {
        return NextResponse.json({ error: 'Password required to switch to this role' }, { status: 400 })
      }

      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { password: true },
      })

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      const isValid = await bcrypt.compare(password, user.password)
      if (!isValid) {
        return NextResponse.json({ error: 'Incorrect password' }, { status: 403 })
      }
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, name: true, role: true, tenantId: true, tokenVersion: true },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify the user actually has the target role in the database
    if (dbUser.role !== targetRole && targetRole !== 'STAFF') {
      return NextResponse.json({ error: 'You do not have permission to assume this role' }, { status: 403 })
    }

    const token = await encode({
      secret: process.env.NEXTAUTH_SECRET!,
      token: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        role: targetRole,
        tenantId: dbUser.tenantId,
        tokenVersion: dbUser.tokenVersion,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 60 * 60,
        sub: dbUser.id,
      },
    })

    await auditLogger.logAuth(
      null,
      dbUser.tenantId,
      dbUser.id,
      `ROLE_SWITCH_${targetRole}`,
      'success',
      ip
    )

    const isProd = process.env.NODE_ENV === 'production'
    const cookieName = isProd ? '__Secure-next-auth.session-token' : 'next-auth.session-token'

    const response = NextResponse.json({
      success: true,
      role: targetRole,
      name: dbUser.name,
    })

    response.cookies.set(cookieName, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60,
    })

    return response
  } catch (error) {
    console.error('Role switch failed:', error)
    return NextResponse.json({ error: 'Failed to switch role' }, { status: 500 })
  }
}
