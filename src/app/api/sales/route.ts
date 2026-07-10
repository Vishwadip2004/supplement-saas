import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'
import { saleSchema, validateInput } from '@/lib/security/validation'
import { auditLogger } from '@/lib/security/audit'
import { setCorsHeaders } from '@/lib/cors'
import { checkRateLimit, getClientIp } from '@/lib/security/rateLimit'
import { extractTenantId } from '@/lib/tenant'
import { validateCsrfRequest } from '@/lib/csrf'

export async function GET(request: Request) {
  const ip = getClientIp(request)

  if (!(await checkRateLimit(ip))) {
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

  const tenantId = extractTenantId(session)

  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20', 10)))
    const skip = (page - 1) * limit

    const where = {
      tenantId,
      ...(search && {
        product: {
          name: { contains: search, mode: 'insensitive' as const },
        },
      }),
    }

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, sku: true, sellingPrice: true, quantity: true } },
          customer: { select: { id: true, name: true, email: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.sale.count({ where }),
    ])

    const response = NextResponse.json({
      data: sales,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
    return setCorsHeaders(response, request.headers.get('origin'))
  } catch (error) {
    console.error('Failed to fetch sales:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  if (!validateCsrfRequest(request)) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 })
  }

  const ip = getClientIp(request)

  if (!(await checkRateLimit(ip))) {
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

  if (!['ADMIN', 'MANAGER', 'STAFF'].includes(session.user.role)) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    )
  }

  const tenantId = extractTenantId(session)

  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      )
    }
    const validation = validateInput(saleSchema, body)

    if (!validation.success) {
      const details = process.env.NODE_ENV === 'production'
        ? { _errors: ['Validation failed'] }
        : validation.errors.format()
      return NextResponse.json(
        { error: 'Validation failed', details },
        { status: 400 }
      )
    }

    const data = validation.data
    const customerId = data.customerId
    const paymentMethod = data.paymentMethod
    const isMultiItem = 'items' in data

    if (customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: customerId, tenantId },
        select: { id: true, isActive: true },
      })
      if (!customer || !customer.isActive) {
        return NextResponse.json(
          { error: 'Customer not found' },
          { status: 404 }
        )
      }
    }

    const sale = await prisma.$transaction(async (tx) => {
      if (isMultiItem) {
        const saleRecords = []
        for (const item of data.items) {
          const [product] = await tx.$queryRaw<
            Array<{ id: string; quantity: number; sellingPrice: import('@prisma/client').Prisma.Decimal; name: string; sku: string }>
          >`SELECT * FROM products WHERE id = ${item.productId} AND "tenantId" = ${tenantId} AND "isActive" = true FOR UPDATE`

          if (!product) {
            throw new Error('PRODUCT_NOT_FOUND')
          }

          const unitPrice = item.unitPrice || Number(product.sellingPrice)
          const qty = item.quantity
          if (product.quantity < qty) {
            throw new Error(`INSUFFICIENT_STOCK:${product.quantity}:${product.name}`)
          }

          const safeDiscount = Math.min(item.discount || 0, unitPrice * qty)
          const totalAmount = Math.max(0, (unitPrice * qty) - safeDiscount)

          const [saleRecord] = await Promise.all([
            tx.sale.create({
              data: {
                productId: item.productId,
                quantity: qty,
                unitPrice,
                discount: safeDiscount,
                totalAmount,
                customerId: customerId || null,
                paymentMethod,
                tenantId,
              },
            }),
            tx.product.update({
              where: { id: item.productId, tenantId },
              data: { quantity: { decrement: qty } },
            }),
            tx.stockMovement.create({
              data: {
                productId: item.productId,
                quantity: -qty,
                type: 'OUT',
                reference: 'Sale',
                tenantId,
              },
            }),
          ])
          saleRecords.push(saleRecord)
        }
        return saleRecords
      } else {
        const { productId, quantity, discount } = data as { productId: string; quantity: number; discount?: number }
        const [product] = await tx.$queryRaw<
          Array<{ id: string; quantity: number; sellingPrice: import('@prisma/client').Prisma.Decimal; name: string; sku: string }>
        >`SELECT * FROM products WHERE id = ${productId} AND "tenantId" = ${tenantId} AND "isActive" = true FOR UPDATE`

        if (!product) {
          throw new Error('PRODUCT_NOT_FOUND')
        }

        if (product.quantity < quantity) {
          throw new Error(`INSUFFICIENT_STOCK:${product.quantity}:${product.name}`)
        }

        const unitPrice = Number(product.sellingPrice)
        const safeDiscount = Math.min(discount || 0, unitPrice * quantity)
        const totalAmount = Math.max(0, (unitPrice * quantity) - safeDiscount)

        const [saleRecord] = await Promise.all([
          tx.sale.create({
            data: {
              productId,
              quantity,
              unitPrice,
              discount: safeDiscount,
              totalAmount,
              customerId: customerId || null,
              paymentMethod,
              tenantId,
            },
          }),
          tx.product.update({
            where: { id: productId, tenantId },
            data: { quantity: { decrement: quantity } },
          }),
          tx.stockMovement.create({
            data: {
              productId,
              quantity: -quantity,
              type: 'OUT',
              reference: 'Sale',
              tenantId,
            },
          }),
        ])

        await auditLogger.logDataChange(
          tx,
          tenantId,
          session.user.id,
          'sale',
          saleRecord.id,
          'CREATE',
          { productId, product: product.name, sku: product.sku, quantity, totalAmount: saleRecord.totalAmount }
        )

        return [saleRecord]
      }
    })

    const response = NextResponse.json(isMultiItem ? sale : sale[0], { status: 201 })
    return setCorsHeaders(response, request.headers.get('origin'))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    if (message === 'PRODUCT_NOT_FOUND') {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    if (message.startsWith('INSUFFICIENT_STOCK:')) {
      const parts = message.split(':')
      const available = parts[1]
      const productName = parts[2] || 'product'
      return NextResponse.json({ error: `Insufficient stock for ${productName}. Available: ${available}` }, { status: 400 })
    }
    console.error('Failed to create sale:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}