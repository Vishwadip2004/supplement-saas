import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'
import { auditLogger } from '@/lib/security/audit'
import { setCorsHeaders } from '@/lib/cors'
import { checkRateLimit, getClientIp } from '@/lib/security/rateLimit'
import { extractTenantId } from '@/lib/tenant'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getClientIp(request)

  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenantId = extractTenantId(session)

  try {
    const { id } = await params

    const order = await prisma.purchaseOrder.findFirst({
      where: { id, tenantId },
      include: {
        supplier: true,
        items: { include: { product: { select: { name: true, sku: true, quantity: true } } } },
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 })
    }

    const response = NextResponse.json(order)
    return setCorsHeaders(response, request.headers.get('origin'))
  } catch (error) {
    console.error('Failed to fetch purchase order:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getClientIp(request)

  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenantId = extractTenantId(session)

  try {
    const { id } = await params
    const body = await request.json()
    const { status } = body as { status?: string }

    if (!status || !['APPROVED', 'RECEIVED', 'CANCELLED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const existing = await prisma.purchaseOrder.findFirst({
      where: { id, tenantId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 })
    }

    if (existing.status !== 'PENDING' && status !== 'RECEIVED') {
      return NextResponse.json({ error: 'Cannot change status from current state' }, { status: 400 })
    }

    const updated = await prisma.$transaction(async (tx) => {
      const order = await tx.purchaseOrder.update({
        where: { id, tenantId },
        data: { status: status as 'PENDING' | 'APPROVED' | 'RECEIVED' | 'CANCELLED' },
        include: {
          supplier: { select: { name: true } },
          items: { include: { product: { select: { name: true, sku: true } } } },
        },
      })

      if (status === 'RECEIVED') {
        const items = await tx.purchaseOrderItem.findMany({
          where: { purchaseOrderId: id },
        })
        for (const item of items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { quantity: { increment: item.quantity } },
          })

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              quantity: item.quantity,
              type: 'IN',
              reference: `PO-${order.id.slice(0, 8)}`,
              notes: `Purchase order received`,
              tenantId,
            },
          })
        }
      }

      return order
    })

    await auditLogger.logDataChange(
      tenantId,
      session.user.id,
      'purchaseOrder',
      id,
      'UPDATE',
      { status, previousStatus: existing.status }
    )

    const response = NextResponse.json(updated)
    return setCorsHeaders(response, request.headers.get('origin'))
  } catch (error) {
    console.error('Failed to update purchase order:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getClientIp(request)

  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!['ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenantId = extractTenantId(session)

  try {
    const { id } = await params

    const existing = await prisma.purchaseOrder.findFirst({
      where: { id, tenantId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 })
    }

    if (existing.status !== 'PENDING') {
      return NextResponse.json({ error: 'Can only delete pending orders' }, { status: 400 })
    }

    await prisma.purchaseOrder.delete({
      where: { id, tenantId },
    })

    await auditLogger.logDataChange(
      tenantId,
      session.user.id,
      'purchaseOrder',
      id,
      'DELETE',
      { supplierId: existing.supplierId, totalAmount: existing.totalAmount }
    )

    const response = NextResponse.json({ message: 'Purchase order deleted' })
    return setCorsHeaders(response, request.headers.get('origin'))
  } catch (error) {
    console.error('Failed to delete purchase order:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
