import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'
import { createTOTPSecret, getTOTPUri } from '@/lib/mfa'
import { extractTenantId } from '@/lib/tenant'
import { getEncryption } from '@/lib/security/encryption'
import { validateCsrfRequest } from '@/lib/csrf'

export async function POST(request: Request) {
  if (!validateCsrfRequest(request)) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 })
  }

  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenantId = extractTenantId(session)

  try {
    const user = await prisma.user.findFirst({
      where: { id: session.user.id, tenantId },
      select: { id: true, email: true, mfaEnabled: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.mfaEnabled) {
      return NextResponse.json({ error: 'MFA is already enabled' }, { status: 400 })
    }

    const totp = createTOTPSecret(user.email)
    const uri = getTOTPUri(totp.secret.base32, user.email)
    const encryption = await getEncryption()
    const encryptedSecret = encryption.encrypt(totp.secret.base32)

    await prisma.user.update({
      where: { id: user.id },
      data: { mfaSecret: encryptedSecret },
    })

    return NextResponse.json({
      uri,
    })
  } catch (error) {
    console.error('MFA setup failed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
