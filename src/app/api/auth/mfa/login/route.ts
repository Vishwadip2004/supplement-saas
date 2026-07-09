import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyTOTP } from '@/lib/mfa'
import { getEncryption } from '@/lib/security/encryption'
import { checkRateLimit, getClientIp } from '@/lib/security/rateLimit'
import { auditLogger } from '@/lib/security/audit'
import { z } from 'zod'

const loginMfaSchema = z.object({
  userId: z.string().uuid(),
  code: z.string().length(6, 'Code must be 6 digits'),
})

export async function POST(request: Request) {
  const ip = getClientIp(request)

  if (!checkRateLimit(`mfa:${ip}`, 5, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429 }
    )
  }

  try {
    const body = await request.json()
    const validation = loginMfaSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.format() },
        { status: 400 }
      )
    }

    const { userId, code } = validation.data

    const user = await prisma.user.findFirst({
      where: { id: userId },
      select: { id: true, tenantId: true, email: true, mfaEnabled: true, mfaSecret: true, isActive: true },
    })

    if (!user || !user.isActive || !user.mfaEnabled || !user.mfaSecret) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const decryptedSecret = getEncryption().decrypt(user.mfaSecret)
    const isValid = verifyTOTP(decryptedSecret, code)

    if (!isValid) {
      await auditLogger.logAuth(user.tenantId, user.id, 'MFA_FAILED', 'failure', ip)
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
    }

    await auditLogger.logAuth(user.tenantId, user.id, 'MFA_SUCCESS', 'success', ip)

    return NextResponse.json({ verified: true })
  } catch (error) {
    console.error('MFA login verify failed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
