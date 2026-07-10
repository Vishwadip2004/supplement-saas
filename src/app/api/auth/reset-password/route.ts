import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { getEncryption } from '@/lib/security/encryption'
import { auditLogger } from '@/lib/security/audit'
import { checkRateLimit, getClientIp } from '@/lib/security/rateLimit'
import { z } from 'zod'
import { checkPasswordHistory, addPasswordToHistory } from '@/lib/security/passwordHistory'

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(12, 'Password must be at least 12 characters')
    .max(128)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
})

export async function POST(request: Request) {
  const ip = getClientIp(request)

  if (!checkRateLimit(`reset-password:${ip}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    )
  }

  try {
    const body = await request.json()
    const validation = resetPasswordSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.format() },
        { status: 400 }
      )
    }

    const { token, email, password } = validation.data

    const user = await prisma.user.findFirst({
      where: { email },
      select: {
        id: true,
        tenantId: true,
        passwordResetToken: true,
        passwordResetExpires: true,
        isActive: true,
      },
    })

    if (!user || !user.isActive || !user.passwordResetToken || !user.passwordResetExpires) {
      await auditLogger.logAuth(null, 'unknown', email, 'PASSWORD_RESET_FAILED', 'failure', ip)
      return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 })
    }

    if (user.passwordResetExpires < new Date()) {
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordResetToken: null, passwordResetExpires: null },
      })
      await auditLogger.logAuth(null, user.tenantId, user.id, 'PASSWORD_RESET_EXPIRED', 'failure', ip)
      return NextResponse.json({ error: 'Reset token has expired' }, { status: 400 })
    }

    const encryption = await getEncryption()
    const tokenHash = encryption.hash(token)
    if (tokenHash !== user.passwordResetToken) {
      await auditLogger.logAuth(null, user.tenantId, user.id, 'PASSWORD_RESET_FAILED', 'failure', ip)
      return NextResponse.json({ error: 'Invalid reset token' }, { status: 400 })
    }

    const canUsePassword = await checkPasswordHistory(prisma, user.id, password)
    if (!canUsePassword) {
      return NextResponse.json(
        { error: 'You cannot reuse a recent password. Please choose a different password.' },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 14)

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          passwordResetToken: null,
          passwordResetExpires: null,
          failedLoginAttempts: 0,
          isActive: true,
        },
      })
      await tx.session.deleteMany({ where: { userId: user.id } })
      await addPasswordToHistory(tx, user.id, hashedPassword)
    })

    await auditLogger.logAuth(null, user.tenantId, user.id, 'PASSWORD_RESET_SUCCESS', 'success', ip)

    return NextResponse.json({ message: 'Password has been reset successfully' })
  } catch (error) {
    console.error('Reset password failed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}