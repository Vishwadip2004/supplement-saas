import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'
import { purchaseOrderSchema, validateInput } from '@/lib/security/validation'
import { auditLogger } from '@/lib/security/audit'
import { setCorsHeaders } from '@/lib/cors'
import { checkRateLimit, getClientIp } from '@/lib/security/rateLimit'
import { extractTenantId } from '@/lib/tenant'

export async function GET(request: Request) {
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
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20', 10)))
    const skip = (page - 1) * limit
    const status = searchParams.get('status') || ''

    const where: Record<string, unknown> = { tenantId }
    if (status) where.status = status

    const [orders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: {
          supplier: { select: { name: true } },
          items: { include: { product: { select: { name: true, sku: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.purchaseOrder.count({ where }),
    ])

    const response = NextResponse.json({
      data: orders,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
    return setCorsHeaders(response, request.headers.get('origin'))
  } catch (error) {
    console.error('Failed to fetch purchase orders:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
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
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    const validation = validateInput(purchaseOrderSchema, body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors.format() },
        { status: 400 }
      )
    }

    const { supplierId, notes, items } = validation.data

    const supplier = await prisma.supplier.findFirst({
      where: { id: supplierId, tenantId },
      select: { id: true },
    })
    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    for (const item of items) {
      const product = await prisma.product.findFirst({
        where: { id: item.productId, tenantId },
        select: { id: true },
      })
      if (!product) {
        return NextResponse.json({ error: `Product not found: ${item.productId}` }, { status: 404 })
      }
    }

    const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)

    const order = await prisma.purchaseOrder.create({
      data: {
        supplierId,
        totalAmount,
        notes,
        tenantId,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        },
      },
      include: {
        supplier: { select: { name: true } },
        items: { include: { product: { select: { name: true, sku: true } } } },
      },
    })

    await auditLogger.logDataChange(
      tenantId,
      session.user.id,
      'purchaseOrder',
      order.id,
      'CREATE',
      { supplierId, totalAmount, itemCount: items.length }
    )

    const response = NextResponse.json(order, { status: 201 })
    return setCorsHeaders(response, request.headers.get('origin'))
  } catch (error) {
    console.error('Failed to create purchase order:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
