import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'
import { lotSchema, validateInput } from '@/lib/security/validation'
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
    const productId = searchParams.get('productId') || ''
    const batchNumber = searchParams.get('batchNumber') || ''
    const expiringSoon = searchParams.get('expiringSoon') === 'true'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '50', 10)))
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {
      tenantId,
      quantity: { gt: 0 },
      ...(productId && { productId }),
      ...(batchNumber && { batchNumber }),
    }

    if (expiringSoon) {
      const ninetyDays = new Date()
      ninetyDays.setDate(ninetyDays.getDate() + 90)
      where.expiryDate = { lte: ninetyDays, gt: new Date() }
    }

    const [lots, total] = await Promise.all([
      prisma.lot.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, sku: true, category: true, brand: true } },
        },
        orderBy: { expiryDate: 'asc' },
        skip,
        take: limit,
      }),
      prisma.lot.count({ where }),
    ])

    const response = NextResponse.json({
      data: lots,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
    return setCorsHeaders(response, request.headers.get('origin'))
  } catch (error) {
    console.error('Failed to fetch lots:', error)
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

    const validation = validateInput(lotSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.errors.format() }, { status: 400 })
    }

    const { productId, batchNumber, expiryDate, quantity, purchasePrice, landedCost, coaUrl, coaNotes } = validation.data

    const product = await prisma.product.findFirst({
      where: { id: productId, tenantId, isActive: true },
      select: { id: true, name: true },
    })
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const existingLot = await prisma.lot.findUnique({
      where: { tenantId_productId_batchNumber: { tenantId, productId, batchNumber } },
    })

    let lotRecord
    if (existingLot) {
      const [updated] = await prisma.$transaction([
        prisma.lot.update({
          where: { id: existingLot.id },
          data: {
            quantity: { increment: quantity },
            expiryDate: expiryDate ? new Date(expiryDate) : existingLot.expiryDate,
            purchasePrice: purchasePrice || existingLot.purchasePrice,
            landedCost: landedCost || existingLot.landedCost,
            coaUrl: coaUrl || existingLot.coaUrl,
            coaNotes: coaNotes || existingLot.coaNotes,
          },
        }),
        prisma.product.update({
          where: { id: productId, tenantId },
          data: { quantity: { increment: quantity } },
        }),
      ])
      lotRecord = updated
    } else {
      const [created] = await prisma.$transaction([
        prisma.lot.create({
          data: {
            productId,
            batchNumber,
            expiryDate: expiryDate ? new Date(expiryDate) : null,
            quantity,
            purchasePrice: purchasePrice || null,
            landedCost: landedCost || null,
            coaUrl: coaUrl || null,
            coaNotes: coaNotes || null,
            tenantId,
          },
        }),
        prisma.product.update({
          where: { id: productId, tenantId },
          data: { quantity: { increment: quantity } },
        }),
      ])
      lotRecord = created
    }

    const lot = lotRecord

    await auditLogger.logDataChange(
      null,
      tenantId,
      session.user.id,
      'lot',
      lot.id,
      existingLot ? 'UPDATE' : 'CREATE',
      { batchNumber, productId, quantity, productName: product.name }
    )

    const response = NextResponse.json(lot, { status: 201 })
    return setCorsHeaders(response, request.headers.get('origin'))
  } catch (error) {
    console.error('Failed to create lot:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
