import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'
import { auditLogger } from '@/lib/security/audit'
import { setCorsHeaders } from '@/lib/cors'
import { checkRateLimit, getClientIp } from '@/lib/security/rateLimit'
import { extractTenantId } from '@/lib/tenant'
import { validateCsrfRequest } from '@/lib/csrf'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!validateCsrfRequest(request)) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 })
  }

  const ip = getClientIp(request)
  if (!(await checkRateLimit(ip))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let tenantId: string
  try {
    tenantId = extractTenantId(session)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params

    const existing = await prisma.lot.findFirst({
      where: { id, tenantId },
      include: { product: { select: { id: true, name: true } } },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Lot not found' }, { status: 404 })
    }

    await prisma.$transaction([
      prisma.product.update({
        where: { id: existing.productId, tenantId },
        data: { quantity: { decrement: existing.quantity } },
      }),
      prisma.lot.delete({
        where: { id, tenantId },
      }),
    ])

    await auditLogger.logDataChange(
      null,
      tenantId,
      session.user.id,
      'lot',
      id,
      'DELETE',
      { batchNumber: existing.batchNumber, productName: existing.product?.name, quantity: existing.quantity }
    )

    const response = NextResponse.json({ success: true })
    return setCorsHeaders(response, request.headers.get('origin'))
  } catch (error) {
    console.error('Failed to delete lot:', error)
    return NextResponse.json({ error: 'Failed to delete lot' }, { status: 500 })
  }
}
