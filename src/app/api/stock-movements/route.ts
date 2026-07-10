import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'
import { stockMovementSchema, validateInput } from '@/lib/security/validation'
import { auditLogger } from '@/lib/security/audit'
import { setCorsHeaders } from '@/lib/cors'
import { checkRateLimit, getClientIp } from '@/lib/security/rateLimit'
import { extractTenantId } from '@/lib/tenant'
import { validateCsrfRequest } from '@/lib/csrf'

export async function GET(request: Request) {
  const ip = getClientIp(request)

  if (!(await checkRateLimit(ip))) {
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
    const type = searchParams.get('type') || ''

    const where: Record<string, unknown> = { tenantId }
    if (type && ['IN', 'OUT', 'ADJUSTMENT'].includes(type)) {
      where.type = type
    }

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        include: { product: { select: { name: true, sku: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.stockMovement.count({ where }),
    ])

    const response = NextResponse.json({
      data: movements,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
    return setCorsHeaders(response, request.headers.get('origin'))
  } catch (error) {
    console.error('Failed to fetch stock movements:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
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

  const tenantId = extractTenantId(session)

  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    const validation = validateInput(stockMovementSchema, body)

    if (!validation.success) {
      const details = process.env.NODE_ENV === 'production'
        ? { _errors: ['Validation failed'] }
        : validation.errors.format()
      return NextResponse.json(
        { error: 'Validation failed', details },
        { status: 400 }
      )
    }

    const { productId, quantity, type, reference, notes } = validation.data

    const movement = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: { id: productId, tenantId, isActive: true },
        select: { id: true, name: true, quantity: true },
      })

      if (!product) {
        throw new Error('PRODUCT_NOT_FOUND')
      }

      const quantityChange = type === 'IN' ? quantity : -quantity

      if (type !== 'IN' && product.quantity + quantityChange < 0) {
        throw new Error(`INSUFFICIENT_STOCK:${product.quantity}`)
      }

      const [movementRecord] = await Promise.all([
        tx.stockMovement.create({
          data: {
            productId,
            quantity: quantityChange,
            type,
            reference,
            notes,
            tenantId,
          },
        }),
        tx.product.update({
          where: { id: productId, tenantId },
          data: { quantity: { increment: quantityChange } },
        }),
      ])

      await auditLogger.logDataChange(
        tx,
        tenantId,
        session.user.id,
        'stockMovement',
        movementRecord.id,
        'CREATE',
        { productId, product: product.name, type, quantity, previousStock: product.quantity }
      )

      return { movementRecord, productName: product.name, previousStock: product.quantity }
    })

    const response = NextResponse.json(movement.movementRecord, { status: 201 })
    return setCorsHeaders(response, request.headers.get('origin'))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    if (message === 'PRODUCT_NOT_FOUND') {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    if (message.startsWith('INSUFFICIENT_STOCK:')) {
      const available = message.split(':')[1]
      return NextResponse.json({ error: `Insufficient stock. Available: ${available}` }, { status: 400 })
    }
    console.error('Failed to create stock movement:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}