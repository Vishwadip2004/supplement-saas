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
import { calculateGst } from '@/utils/gst'
import { generateInvoiceNumber } from '@/utils/invoice'

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

  let tenantId: string
  try {
    tenantId = extractTenantId(session)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
          product: { select: { id: true, name: true, sku: true, sellingPrice: true, quantity: true, gstRate: true, hsnCode: true } },
          customer: { select: { id: true, name: true, phone: true } },
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
    const paymentMethod = data.paymentMethod
    const customerName = 'customerName' in data ? (data as { customerName?: string }).customerName || null : null
    const notes = 'notes' in data ? (data as { notes?: string }).notes || null : null
    const isMultiItem = 'items' in data

    const gstConfigKeys = ['defaultGstRate', 'invoicePrefix', 'invoiceNextNumber', 'businessState', 'stateCode']
    const tenantScopedKeys = gstConfigKeys.map(k => `${k}:${tenantId}`)
    const gstConfigs = await prisma.systemConfig.findMany({ where: { key: { in: tenantScopedKeys } } })
    const gstSettings: Record<string, string> = {}
    for (const c of gstConfigs) {
      const key = c.key.split(':')[0]
      gstSettings[key] = c.value
    }

    const defaultGstRate = parseFloat(gstSettings.defaultGstRate || '18')
    const invoicePrefix = gstSettings.invoicePrefix || 'INV'
    const businessState = gstSettings.businessState || ''
    const customerState = 'customerState' in data ? (data as { customerState?: string }).customerState || '' : ''
    const interState = businessState !== '' && customerState !== '' && businessState !== customerState

    let sale: unknown

    if (isMultiItem) {
      const saleRecords = []

      const existingConfig = await prisma.systemConfig.findUnique({
        where: { key: `invoiceNextNumber:${tenantId}` }
      })
      const currentVal = existingConfig ? parseInt(existingConfig.value, 10) : 0
      const nextVal = currentVal + 1

      await prisma.systemConfig.upsert({
        where: { key: `invoiceNextNumber:${tenantId}` },
        update: { value: String(nextVal) },
        create: { key: `invoiceNextNumber:${tenantId}`, value: String(nextVal), description: 'Invoice counter' }
      })

      const invoiceNumber = generateInvoiceNumber(invoicePrefix, nextVal)

      for (const item of data.items) {
        const [product] = await prisma.$queryRaw<
          Array<{ id: string; quantity: number; sellingPrice: import('@prisma/client').Prisma.Decimal; name: string; sku: string; gstRate: import('@prisma/client').Prisma.Decimal }>
        >`SELECT * FROM products WHERE id = ${item.productId} AND "tenantId" = ${tenantId} AND "isActive" = true FOR UPDATE`

        if (!product) {
          throw new Error('PRODUCT_NOT_FOUND')
        }

        const unitPrice = item.unitPrice || Number(product.sellingPrice)
        const qty = item.quantity
        if (!qty || qty <= 0 || !Number.isInteger(qty)) {
          throw new Error('INVALID_QUANTITY')
        }
        if (product.quantity < qty) {
          throw new Error(`INSUFFICIENT_STOCK:${product.quantity}:${product.name}`)
        }

        let lotNumber: string | null = null
        let saleExpiryDate: Date | null = null
        let remainingQty = qty

        const lots = await prisma.lot.findMany({
          where: { productId: item.productId, tenantId, quantity: { gt: 0 } },
          orderBy: { expiryDate: 'asc' },
        })

        const lotUpdates: Array<{ id: string; decrement: number }> = []
        for (const lot of lots) {
          if (remainingQty <= 0) break
          const deductFromLot = Math.min(lot.quantity, remainingQty)
          lotUpdates.push({ id: lot.id, decrement: deductFromLot })
          remainingQty -= deductFromLot
          if (!lotNumber) {
            lotNumber = lot.batchNumber
            saleExpiryDate = lot.expiryDate
          }
        }

        const safeDiscount = Math.min(item.discount || 0, unitPrice * qty)
        const totalAmount = Math.max(0, (unitPrice * qty) - safeDiscount)
        const gst = calculateGst(totalAmount, Number(product.gstRate || defaultGstRate), interState, true)

        const [saleRecord] = await prisma.$transaction([
          ...lotUpdates.map(lu =>
            prisma.lot.update({ where: { id: lu.id }, data: { quantity: { decrement: lu.decrement } } })
          ),
          prisma.product.update({ where: { id: item.productId, tenantId }, data: { quantity: { decrement: qty } } }),
          prisma.sale.create({
            data: {
              productId: item.productId,
              quantity: qty,
              unitPrice,
              discount: safeDiscount,
              totalAmount: gst.totalAmount,
              cgst: gst.cgst,
              sgst: gst.sgst,
              igst: gst.igst,
              totalTax: gst.totalTax,
              invoiceNumber,
              paymentMethod,
              customerName,
              notes,
              lotNumber,
              expiryDate: saleExpiryDate,
              tenantId,
            },
          }),
        ])
        saleRecords.push(saleRecord as Record<string, unknown> & { id: string; quantity: number; totalAmount: unknown })
      }

      for (const record of saleRecords) {
        try {
          await auditLogger.logDataChange(
            prisma,
            tenantId,
            session.user.id,
            'sale',
            record.id,
            'CREATE',
            { invoiceNumber, quantity: record.quantity, totalAmount: record.totalAmount }
          )
        } catch (auditError) {
          console.error('Audit logging failed (non-critical):', auditError)
        }
      }

      sale = { saleRecords, invoiceNumber }
    } else {
      const { productId, quantity, discount } = data as { productId: string; quantity: number; discount?: number }
      const [product] = await prisma.$queryRaw<
        Array<{ id: string; quantity: number; sellingPrice: import('@prisma/client').Prisma.Decimal; name: string; sku: string; gstRate: import('@prisma/client').Prisma.Decimal }>
      >`SELECT * FROM products WHERE id = ${productId} AND "tenantId" = ${tenantId} AND "isActive" = true FOR UPDATE`

      if (!product) {
        throw new Error('PRODUCT_NOT_FOUND')
      }

      if (product.quantity < quantity) {
        throw new Error(`INSUFFICIENT_STOCK:${product.quantity}:${product.name}`)
      }

      let lotNumber: string | null = null
      let saleExpiryDate: Date | null = null
      let remainingQty = quantity

      const lots = await prisma.lot.findMany({
        where: { productId, tenantId, quantity: { gt: 0 } },
        orderBy: { expiryDate: 'asc' },
      })

      const lotUpdates: Array<{ id: string; decrement: number }> = []
      for (const lot of lots) {
        if (remainingQty <= 0) break
        const deductFromLot = Math.min(lot.quantity, remainingQty)
        lotUpdates.push({ id: lot.id, decrement: deductFromLot })
        remainingQty -= deductFromLot
        if (!lotNumber) {
          lotNumber = lot.batchNumber
          saleExpiryDate = lot.expiryDate
        }
      }

      const unitPrice = Number(product.sellingPrice)
      const safeDiscount = Math.min(discount || 0, unitPrice * quantity)
      const totalAmount = Math.max(0, (unitPrice * quantity) - safeDiscount)
      const gst = calculateGst(totalAmount, Number(product.gstRate || defaultGstRate), interState, true)

      const existingConfig = await prisma.systemConfig.findUnique({
        where: { key: `invoiceNextNumber:${tenantId}` }
      })
      const currentVal = existingConfig ? parseInt(existingConfig.value, 10) : 0
      const nextVal = currentVal + 1

      await prisma.systemConfig.upsert({
        where: { key: `invoiceNextNumber:${tenantId}` },
        update: { value: String(nextVal) },
        create: { key: `invoiceNextNumber:${tenantId}`, value: String(nextVal), description: 'Invoice counter' }
      })

      const invoiceNumber = generateInvoiceNumber(invoicePrefix, nextVal)

      const [saleRecord] = await prisma.$transaction([
        ...lotUpdates.map(lu =>
          prisma.lot.update({ where: { id: lu.id }, data: { quantity: { decrement: lu.decrement } } })
        ),
        prisma.product.update({ where: { id: productId, tenantId }, data: { quantity: { decrement: quantity } } }),
        prisma.sale.create({
          data: {
            productId,
            quantity,
            unitPrice,
            discount: safeDiscount,
            totalAmount: gst.totalAmount,
            cgst: gst.cgst,
            sgst: gst.sgst,
            igst: gst.igst,
            totalTax: gst.totalTax,
            invoiceNumber,
            paymentMethod,
            customerName,
            notes,
            lotNumber,
            expiryDate: saleExpiryDate,
            tenantId,
          },
        }),
      ])

      await auditLogger.logDataChange(
        prisma,
        tenantId,
        session.user.id,
        'sale',
        (saleRecord as { id: string }).id,
        'CREATE',
        { productId, product: product.name, sku: product.sku, quantity, totalAmount: (saleRecord as { totalAmount: unknown }).totalAmount, invoiceNumber, lotNumber }
      )

      sale = [saleRecord]
    }

    const result = sale as unknown as { saleRecords?: typeof sale; invoiceNumber?: string } | typeof sale[]
    const isMultiResult = Array.isArray(result)
    const responseData = isMultiResult ? { sales: result, invoiceNumber: (result[0] as Record<string, unknown>)?.invoiceNumber } : result
    const response = NextResponse.json(responseData, { status: 201 })
    return setCorsHeaders(response, request.headers.get('origin'))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    if (message === 'PRODUCT_NOT_FOUND') {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    if (message.startsWith('INSUFFICIENT_STOCK:')) {
      return NextResponse.json({ error: 'Insufficient stock for this product' }, { status: 400 })
    }
    if (message === 'INVALID_QUANTITY') {
      return NextResponse.json({ error: 'Quantity must be a positive integer' }, { status: 400 })
    }
    console.error('Failed to create sale:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}