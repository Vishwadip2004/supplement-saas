import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'
import { verifyTOTP } from '@/lib/mfa'
import { extractTenantId } from '@/lib/tenant'
import { getEncryption } from '@/lib/security/encryption'
import { z } from 'zod'

const disableSchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits'),
})

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenantId = extractTenantId(session)

  try {
    const body = await request.json()
    const validation = disableSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.format() },
        { status: 400 }
      )
    }

    const { code } = validation.data

    const user = await prisma.user.findFirst({
      where: { id: session.user.id, tenantId },
      select: { id: true, mfaEnabled: true, mfaSecret: true },
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

    const encryption = await getEncryption()
    const decryptedSecret = encryption.decrypt(user.mfaSecret)
    const isValid = verifyTOTP(decryptedSecret, code)

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { mfaEnabled: false, mfaSecret: null },
    })

    return NextResponse.json({ message: 'MFA disabled successfully' })
  } catch (error) {
    console.error('MFA disable failed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
