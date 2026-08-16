import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'
import { auditLogger } from '@/lib/security/audit'
import { setCorsHeaders } from '@/lib/cors'
import { checkRateLimit, getClientIp } from '@/lib/security/rateLimit'
import { extractTenantId } from '@/lib/tenant'
import { validateCsrfRequest } from '@/lib/csrf'
import { purchaseOrderStatusSchema, validateInput } from '@/lib/security/validation'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getClientIp(request)

  if (!(await checkRateLimit(ip))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let tenantId: string
  try {
    tenantId = extractTenantId(session)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const validation = validateInput(purchaseOrderStatusSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.errors.format() }, { status: 400 })
    }

    const { status } = validation.data

    const existing = await prisma.purchaseOrder.findFirst({
      where: { id, tenantId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 })
    }

    if (existing.status !== 'PENDING' && status !== 'RECEIVED') {
      return NextResponse.json({ error: 'Cannot change status from current state' }, { status: 400 })
    }

    if ((existing.status === 'CANCELLED' || existing.status === 'RECEIVED') && status === 'RECEIVED') {
      return NextResponse.json({ error: 'Cannot receive a cancelled or already received order' }, { status: 400 })
    }

    const order = await prisma.purchaseOrder.update({
      where: { id, tenantId },
      data: { status: status as 'PENDING' | 'APPROVED' | 'RECEIVED' | 'CANCELLED' },
      include: {
        supplier: { select: { name: true } },
        items: { include: { product: { select: { name: true, sku: true } } } },
      },
    })

    if (status === 'RECEIVED') {
      const items = await prisma.purchaseOrderItem.findMany({
        where: { purchaseOrderId: id },
      })

      const txOps = []
      for (const item of items) {
        txOps.push(
          prisma.product.update({
            where: { id: item.productId, tenantId },
            data: { quantity: { increment: item.quantity } },
          })
        )

        if (item.lotNumber) {
          const existingLot = await prisma.lot.findFirst({
            where: { productId: item.productId, batchNumber: item.lotNumber, tenantId },
          })
          if (existingLot) {
            txOps.push(
              prisma.lot.update({
                where: { id: existingLot.id },
                data: { quantity: { increment: item.quantity } },
              })
            )
          } else {
            txOps.push(
              prisma.lot.create({
                data: {
                  productId: item.productId,
                  batchNumber: item.lotNumber,
                  quantity: item.quantity,
                  purchasePrice: item.unitPrice,
                  landedCost: item.landedCost || null,
                  expiryDate: item.expiryDate || null,
                  tenantId,
                },
              })
            )
          }
        }
      }

      txOps.push(
        prisma.supplier.update({
          where: { id: order.supplierId, tenantId },
          data: { totalOrders: { increment: 1 } },
        })
      )

      await prisma.$transaction(txOps)
    }

    const updated = order

    await auditLogger.logDataChange(
      null,
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

  if (!['ADMIN'].includes(session.user.role)) {
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
      null,
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
