import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { verifyTOTP } from '@/lib/mfa'
import { extractTenantId } from '@/lib/tenant'
import { getEncryption } from '@/lib/security/encryption'
import { auditLogger } from '@/lib/security/audit'
import { checkRateLimit, getClientIp } from '@/lib/security/rateLimit'
import { z } from 'zod'
import { validateCsrfRequest } from '@/lib/csrf'

const disableSchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits'),
  password: z.string().min(1, 'Password is required'),
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

  if (!(await checkRateLimit(`mfa-disable:${session.user.id}`, 5, 15 * 60 * 1000))) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429 }
    )
  }

  let tenantId: string
  try {
    tenantId = extractTenantId(session)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const validation = disableSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.format() },
        { status: 400 }
      )
    }

    const { code, password } = validation.data

    const user = await prisma.user.findFirst({
      where: { id: session.user.id, tenantId },
      select: { id: true, tenantId: true, mfaEnabled: true, mfaSecret: true, password: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!user.mfaEnabled) {
      return NextResponse.json({ error: 'MFA is not enabled' }, { status: 400 })
    }

    if (!user.mfaSecret) {
      return NextResponse.json({ error: 'MFA secret not found' }, { status: 400 })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      await auditLogger.logAuth(null, user.tenantId, user.id, 'MFA_DISABLE_PASSWORD_FAILED', 'failure', ip)
      return NextResponse.json({ error: 'Invalid password' }, { status: 400 })
    }

    const encryption = await getEncryption()
    const decryptedSecret = encryption.decrypt(user.mfaSecret)
    const isValid = verifyTOTP(decryptedSecret, code)

    if (!isValid) {
      await auditLogger.logAuth(null, user.tenantId, user.id, 'MFA_DISABLE_FAILED', 'failure', ip)
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { mfaEnabled: false, mfaSecret: null, tokenVersion: { increment: 1 } },
    })

    await prisma.session.deleteMany({
      where: { userId: user.id },
    })

    await auditLogger.logDataChange(
      null,
      tenantId,
      session.user.id,
      'user',
      user.id,
      'MFA_DISABLED',
      {}
    )

    return NextResponse.json({ message: 'MFA disabled successfully. Please log in again.' })
  } catch (error) {
    console.error('MFA disable failed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
