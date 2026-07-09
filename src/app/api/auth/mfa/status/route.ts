import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'
import { extractTenantId } from '@/lib/tenant'

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenantId = extractTenantId(session)

  try {
    const user = await prisma.user.findFirst({
      where: { id: session.user.id, tenantId },
      select: { mfaEnabled: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ mfaEnabled: user.mfaEnabled })
  } catch (error) {
    console.error('Failed to check MFA status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
