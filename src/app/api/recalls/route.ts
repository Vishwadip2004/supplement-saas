import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'
import { recallSchema, validateInput } from '@/lib/security/validation'
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

  let tenantId: string
  try {
    tenantId = extractTenantId(session)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || ''
    const batchNumber = searchParams.get('batchNumber') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20', 10)))
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = { tenantId }
    if (status && ['ACTIVE', 'COMPLETED', 'CANCELLED'].includes(status)) {
      where.status = status
    }

    const [recalls, total] = await Promise.all([
      prisma.recall.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.recall.count({ where }),
    ])

    let sales: unknown[] = []
    if (batchNumber) {
      const recall = recalls.find(r => r.batchNumber === batchNumber) || await prisma.recall.findFirst({
        where: { tenantId, batchNumber },
      })
      if (recall) {
        const affectedProductNames = recall.productName ? [recall.productName] : []
        sales = await prisma.sale.findMany({
          where: {
            tenantId,
            OR: [
              { lotNumber: batchNumber },
              ...(affectedProductNames.length > 0 ? [{ product: { name: { in: affectedProductNames } } }] : []),
            ],
          },
          include: {
            product: { select: { name: true, sku: true } },
          },
          orderBy: { createdAt: 'desc' },
        })
      }
    }

    const response = NextResponse.json({
      data: recalls,
      sales,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
    return setCorsHeaders(response, request.headers.get('origin'))
  } catch (error) {
    console.error('Failed to fetch recalls:', error)
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

  let tenantId: string
  try {
    tenantId = extractTenantId(session)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const validation = validateInput(recallSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.errors.format() }, { status: 400 })
    }

    const { batchNumber, reason, notes } = validation.data

    const lots = await prisma.lot.findMany({
      where: { tenantId, batchNumber, quantity: { gt: 0 } },
      include: { product: { select: { name: true } } },
    })

    if (lots.length === 0) {
      return NextResponse.json({ error: 'No active lots found with this batch number' }, { status: 404 })
    }

    const affectedQuantity = lots.reduce((sum, lot) => sum + lot.quantity, 0)
    const productName = lots[0]?.product?.name || 'Unknown'

    const recallRecord = await prisma.recall.create({
      data: {
        batchNumber,
        productName,
        reason,
        affectedQuantity,
        notes: notes || null,
        tenantId,
      },
    })

    await prisma.$transaction([
      ...lots.flatMap(lot => [
        prisma.lot.update({ where: { id: lot.id }, data: { quantity: 0 } }),
        prisma.product.update({ where: { id: lot.productId, tenantId }, data: { quantity: { decrement: lot.quantity } } }),
      ]),
    ])

    const recall = recallRecord

    await auditLogger.logDataChange(
      null,
      tenantId,
      session.user.id,
      'recall',
      recall.id,
      'CREATE',
      { batchNumber, reason, affectedQuantity }
    )

    const affectedProductNames = [...new Set(lots.map(l => l.product?.name).filter(Boolean))]

    const sales = await prisma.sale.findMany({
      where: {
        tenantId,
        OR: [
          { lotNumber: batchNumber },
          { product: { name: { in: affectedProductNames } } },
        ],
      },
      include: {
        product: { select: { name: true, sku: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const response = NextResponse.json({ recall, sales }, { status: 201 })
    return setCorsHeaders(response, request.headers.get('origin'))
  } catch (error) {
    console.error('Failed to create recall:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
