import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'
import { productSchema, validateInput } from '@/lib/security/validation'
import { auditLogger } from '@/lib/security/audit'
import { setCorsHeaders } from '@/lib/cors'

// Rate limiting
const rateLimit = new Map<string, { count: number; lastReset: number }>()
const RATE_LIMIT_WINDOW = 15 * 60 * 1000 // 15 minutes
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

    const where = {
      isActive: true,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { sku: { contains: search, mode: 'insensitive' as const } },
          { category: { contains: search, mode: 'insensitive' as const } },
          { brand: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ])

    const response = NextResponse.json({
      data: products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
    return setCorsHeaders(response, request.headers.get('origin'))
  } catch (error) {
    console.error('Failed to fetch products:', error)
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
  
  // Only ADMIN and MANAGER can create products
  if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    )
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
    const validation = validateInput(productSchema, body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors.format() },
        { status: 400 }
      )
    }
    
    const product = await prisma.product.create({
      data: validation.data,
    })
    
    await auditLogger.logDataChange(
      session.user.id,
      'product',
      product.id,
      'CREATE',
      { name: product.name, sku: product.sku }
    )
    
    const response = NextResponse.json(product, { status: 201 })
    return setCorsHeaders(response, request.headers.get('origin'))
  } catch (error) {
    console.error('Failed to create product:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
