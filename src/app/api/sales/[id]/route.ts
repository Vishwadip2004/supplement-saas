import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'
import { checkRateLimit, getClientIp } from '@/lib/security/rateLimit'
import { extractTenantId } from '@/lib/tenant'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getClientIp(request)

  if (!checkRateLimit(ip)) {
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

  if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    )
  }

  const tenantId = extractTenantId(session)

  try {
    const { id } = await params

    const sale = await prisma.sale.findFirst({
      where: { id, tenantId },
      include: {
        product: true,
        customer: true,
      },
    })

    if (!sale) {
      return NextResponse.json(
        { error: 'Sale not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(sale)
  } catch (error) {
    console.error('Failed to fetch sale:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
