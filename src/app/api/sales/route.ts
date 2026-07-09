import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'
import { saleSchema, validateInput } from '@/lib/security/validation'
import { auditLogger } from '@/lib/security/audit'

const rateLimit = new Map<string, { count: number; lastReset: number }>()
const RATE_LIMIT_WINDOW = 15 * 60 * 1000
const MAX_REQUESTS = 100

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const userRateLimit = rateLimit.get(ip)

  if (!userRateLimit || now - userRateLimit.lastReset > RATE_LIMIT_WINDOW) {
    rateLimit.set(ip, { count: 1, lastReset: now })
    return true
  }

  if (userRateLimit.count >= MAX_REQUESTS) {
    return false
  }

  userRateLimit.count++
  return true
}

export async function GET(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown'

  if (!checkRateLimit(ip)) {
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

  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20', 10)))
    const skip = (page - 1) * limit

    const where = search
      ? {
          product: {
            name: { contains: search, mode: 'insensitive' as const },
          },
        }
      : {}

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: {
          product: true,
          customer: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.sale.count({ where }),
    ])

    return NextResponse.json({
      data: sales,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Failed to fetch sales:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown'

  if (!checkRateLimit(ip)) {
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

  try {
    const body = await request.json()
    const validation = validateInput(saleSchema, body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors.format() },
        { status: 400 }
      )
    }

    const { productId, quantity, unitPrice, discount, customerId, paymentMethod } = validation.data

    const product = await prisma.product.findUnique({
      where: { id: productId },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    if (product.quantity < quantity) {
      return NextResponse.json(
        { error: 'Insufficient stock' },
        { status: 400 }
      )
    }

    const totalAmount = (unitPrice * quantity) - (discount || 0)

    const [sale] = await prisma.$transaction([
      prisma.sale.create({
        data: {
          productId,
          quantity,
          unitPrice,
          discount: discount || 0,
          totalAmount,
          customerId: customerId || null,
          paymentMethod,
        },
      }),
      prisma.product.update({
        where: { id: productId },
        data: { quantity: product.quantity - quantity },
      }),
      prisma.stockMovement.create({
        data: {
          productId,
          quantity: -quantity,
          type: 'OUT',
          reference: `Sale`,
        },
      }),
    ])

    await auditLogger.logDataChange(
      session.user.id,
      'sale',
      sale.id,
      'CREATE',
      { productId, quantity, totalAmount }
    )

    return NextResponse.json(sale, { status: 201 })
  } catch (error) {
    console.error('Failed to create sale:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
