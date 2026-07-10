import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getEncryption } from '@/lib/security/encryption'
import { auditLogger } from '@/lib/security/audit'
import { checkRateLimit, getClientIp } from '@/lib/security/rateLimit'
import { z } from 'zod'
import { validateCsrfRequest } from '@/lib/csrf'

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
})

export async function POST(request: Request) {
  if (!validateCsrfRequest(request)) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 })
  }

  const ip = getClientIp(request)

  if (!(await checkRateLimit(`forgot-password:${ip}`, 3, 60 * 60 * 1000))) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    )
  }

  try {
    const body = await request.json()
    const validation = forgotPasswordSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.format() },
        { status: 400 }
      )
    }

    const { email } = validation.data

    const user = await prisma.user.findFirst({
      where: { email },
      select: { id: true, tenantId: true, email: true, isActive: true },
    })

    if (!user || !user.isActive) {
      await auditLogger.logAuth(
        null,
        user?.tenantId || 'unknown',
        user?.id || email,
        'PASSWORD_RESET_REQUESTED',
        'success',
        ip
      )
      return NextResponse.json({ message: 'If the email exists, a reset link has been sent' })
    }

    const encryption = await getEncryption()
    const resetToken = encryption.generateToken(32)
    const resetTokenHash = encryption.hash(resetToken)
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetTokenHash,
        passwordResetExpires: resetExpires,
      },
    })

    await auditLogger.logAuth(null, user.tenantId, user.id, 'PASSWORD_RESET_REQUESTED', 'success', ip)

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV] Password reset link for ${email}: ${resetUrl}`)
    }

    return NextResponse.json({ message: 'If the email exists, a reset link has been sent' })
  } catch (error) {
    console.error('Forgot password failed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}