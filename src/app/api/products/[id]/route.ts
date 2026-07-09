import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'
import { productSchema, validateInput } from '@/lib/security/validation'
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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id } = await params
    const product = await prisma.product.findUnique({
      where: { id },
    })
    
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(product)
  } catch (error) {
    console.error('Failed to fetch product:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
  
  if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    )
  }
  
  try {
    const { id } = await params
    const body = await request.json()
    const validation = validateInput(productSchema, body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors.format() },
        { status: 400 }
      )
    }
    
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    })
    
    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }
    
    const product = await prisma.product.update({
      where: { id },
      data: validation.data,
    })
    
    await auditLogger.logDataChange(
      session.user.id,
      'product',
      product.id,
      'UPDATE',
      { before: { name: existingProduct.name, sku: existingProduct.sku }, after: { name: product.name, sku: product.sku } }
    )
    
    return NextResponse.json(product)
  } catch (error) {
    console.error('Failed to update product:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
  
  if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    )
  }
  
  try {
    const { id } = await params
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    })
    
    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }
    
    if (!existingProduct.isActive) {
      return NextResponse.json(
        { error: 'Product is already deactivated' },
        { status: 400 }
      )
    }
    
    const product = await prisma.product.update({
      where: { id },
      data: { isActive: false },
    })
    
    await auditLogger.logDataChange(
      session.user.id,
      'product',
      product.id,
      'DELETE',
      { name: product.name, sku: product.sku }
    )
    
    return NextResponse.json(product)
  } catch (error) {
    console.error('Failed to delete product:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
