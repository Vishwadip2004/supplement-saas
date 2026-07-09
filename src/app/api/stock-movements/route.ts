import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'
import { stockMovementSchema, validateInput } from '@/lib/security/validation'
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
    const type = searchParams.get('type') || ''

    const where: Record<string, unknown> = { tenantId }
    if (type) where.type = type

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
    const validation = validateInput(stockMovementSchema, body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors.format() },
        { status: 400 }
      )
    }

    const { productId, quantity, type, reference, notes } = validation.data

    const product = await prisma.product.findFirst({
      where: { id: productId, tenantId },
      select: { id: true, name: true, quantity: true },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const quantityChange = type === 'IN' ? quantity : -quantity

    const [movement] = await prisma.$transaction([
      prisma.stockMovement.create({
        data: {
          productId,
          quantity: quantityChange,
          type,
          reference,
          notes,
          tenantId,
        },
      }),
      prisma.product.update({
        where: { id: productId },
        data: { quantity: { increment: quantityChange } },
      }),
    ])

    await auditLogger.logDataChange(
      tenantId,
      session.user.id,
      'stockMovement',
      movement.id,
      'CREATE',
      { productId, product: product.name, type, quantity, previousStock: product.quantity }
    )

    const response = NextResponse.json(movement, { status: 201 })
    return setCorsHeaders(response, request.headers.get('origin'))
  } catch (error) {
    console.error('Failed to create stock movement:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
