import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { auditLogger } from '@/lib/security/audit'
import { checkRateLimit, getClientIp } from '@/lib/security/rateLimit'
import { extractTenantId } from '@/lib/tenant'
import { validateCsrfRequest } from '@/lib/csrf'
import { checkPasswordHistory, addPasswordToHistory } from '@/lib/security/passwordHistory'
import { z } from 'zod'

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(12, 'Password must be at least 12 characters').max(128)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
})

export async function POST(request: Request) {
  if (!validateCsrfRequest(request)) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 })
  }

  const ip = getClientIp(request)

  if (!(await checkRateLimit(ip, 5, 15 * 60 * 1000))) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    )
  }

  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const tenantId = extractTenantId(session)

  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    const validation = changePasswordSchema.safeParse(body)
    if (!validation.success) {
      const details = process.env.NODE_ENV === 'production'
        ? { _errors: ['Validation failed'] }
        : validation.error.format()
      return NextResponse.json(
        { error: 'Validation failed', details },
        { status: 400 }
      )
    }

    const { currentPassword, newPassword } = validation.data

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: 'New password must be different from current password' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, password: true, tenantId: true },
    })

    if (!user || user.tenantId !== tenantId) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const isCurrentValid = await bcrypt.compare(currentPassword, user.password)
    if (!isCurrentValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      )
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 14)

    await prisma.$transaction(async (tx) => {
      const isNewPasswordUsed = await checkPasswordHistory(tx, user.id, newPassword)
      if (!isNewPasswordUsed) {
        throw new Error('PASSWORD_REUSE')
      }

      await tx.user.update({
        where: { id: user.id },
        data: { password: hashedNewPassword, tokenVersion: { increment: 1 } },
      })

      await addPasswordToHistory(tx, user.id, hashedNewPassword)

      await tx.session.deleteMany({
        where: { userId: user.id },
      })
    })

    await auditLogger.logAuth(
      null,
      tenantId,
      user.id,
      'PASSWORD_CHANGED',
      'success',
      ip
    )

    return NextResponse.json(
      { message: 'Password changed successfully. Please log in again.' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Password change failed:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    if (message === 'PASSWORD_REUSE') {
      return NextResponse.json(
        { error: 'New password was recently used. Please choose a different password.' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
