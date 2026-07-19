import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'
import { verifyTOTP } from '@/lib/mfa'
import { extractTenantId } from '@/lib/tenant'
import { getEncryption } from '@/lib/security/encryption'
import { checkRateLimit, getClientIp } from '@/lib/security/rateLimit'
import { auditLogger } from '@/lib/security/audit'
import { z } from 'zod'
import { validateCsrfRequest } from '@/lib/csrf'

const verifySchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits'),
})

export async function POST(request: Request) {
  if (!validateCsrfRequest(request)) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 })
  }

  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const ip = getClientIp(request)

  if (!(await checkRateLimit(`mfa-verify:${session.user.id}`, 5, 15 * 60 * 1000))) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429 }
    )
  }

  const tenantId = extractTenantId(session)

  try {
    const body = await request.json()
    const validation = verifySchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.format() },
        { status: 400 }
      )
    }

    const { code } = validation.data

    const user = await prisma.user.findFirst({
      where: { id: session.user.id, tenantId },
      select: { id: true, tenantId: true, mfaEnabled: true, mfaSecret: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.mfaEnabled) {
      return NextResponse.json({ error: 'MFA is already enabled' }, { status: 400 })
    }

    if (!user.mfaSecret) {
      return NextResponse.json({ error: 'MFA setup not initiated' }, { status: 400 })
    }

    const encryption = await getEncryption()
    const decryptedSecret = encryption.decrypt(user.mfaSecret)
    const isValid = verifyTOTP(decryptedSecret, code)

    if (!isValid) {
      await auditLogger.logAuth(null, user.tenantId, user.id, 'MFA_VERIFY_FAILED', 'failure', ip)
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { mfaEnabled: true, tokenVersion: { increment: 1 } },
    })

    await auditLogger.logAuth(null, user.tenantId, user.id, 'MFA_ENABLED', 'success', ip)

    return NextResponse.json({ message: 'MFA enabled successfully' })
  } catch (error) {
    console.error('MFA verify failed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
