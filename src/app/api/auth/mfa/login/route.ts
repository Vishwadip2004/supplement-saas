import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'
import { verifyTOTP } from '@/lib/mfa'
import { getEncryption } from '@/lib/security/encryption'
import { checkRateLimit, getClientIp } from '@/lib/security/rateLimit'
import { auditLogger } from '@/lib/security/audit'
import { extractTenantId } from '@/lib/tenant'
import { z } from 'zod'
import { validateCsrfRequest } from '@/lib/csrf'

const loginMfaSchema = z.object({
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

  if (!(await checkRateLimit(`mfa:${session.user.id}`, 5, 15 * 60 * 1000))) {
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

    const { code } = validation.data
    let tenantId: string
    try {
      tenantId = extractTenantId(session)
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findFirst({
      where: { id: session.user.id, tenantId },
      select: { id: true, tenantId: true, mfaEnabled: true, mfaSecret: true, isActive: true },
    })

    if (!user || !user.isActive || !user.mfaEnabled || !user.mfaSecret) {
      return NextResponse.json({ error: 'MFA is not enabled for this account' }, { status: 400 })
    }

    const encryption = await getEncryption()
    const decryptedSecret = encryption.decrypt(user.mfaSecret)
    const isValid = verifyTOTP(decryptedSecret, code)

    if (!isValid) {
      await auditLogger.logAuth(null, user.tenantId, user.id, 'MFA_FAILED', 'failure', ip)
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
    }

    await auditLogger.logAuth(null, user.tenantId, user.id, 'MFA_SUCCESS', 'success', ip)

    return NextResponse.json({ verified: true })
  } catch (error) {
    console.error('MFA login verify failed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
