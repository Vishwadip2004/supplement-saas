import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'
import { productUpdateSchema, validateInput } from '@/lib/security/validation'
import { auditLogger } from '@/lib/security/audit'
import { setCorsHeaders } from '@/lib/cors'
import { checkRateLimit, getClientIp } from '@/lib/security/rateLimit'
import { extractTenantId } from '@/lib/tenant'
import { validateCsrfRequest } from '@/lib/csrf'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
  
  try {
    const { id } = await params
    const product = await prisma.product.findFirst({
      where: { id, tenantId },
    })
    
    if (!product || !product.isActive) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }
    
    const response = NextResponse.json(product)
    return setCorsHeaders(response, request.headers.get('origin'))
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
  
  if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    )
  }
  
  let tenantId: string
  try {
    tenantId = extractTenantId(session)
  } catch {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
  
  try {
    const { id } = await params
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      )
    }
    const validation = validateInput(productUpdateSchema, body)
    
    if (!validation.success) {
      const details = process.env.NODE_ENV === 'production'
        ? { _errors: ['Validation failed'] }
        : validation.errors.format()
      return NextResponse.json(
        { error: 'Validation failed', details },
        { status: 400 }
      )
    }
    
    const existingProduct = await prisma.product.findFirst({
      where: { id, tenantId },
    })
    
    if (!existingProduct || !existingProduct.isActive) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }
    
    const prismaData = { ...validation.data }
    if (prismaData.expiryDate && typeof prismaData.expiryDate === 'string') {
      prismaData.expiryDate = new Date(prismaData.expiryDate) as unknown as string
    }

    const batchNumber = prismaData.batchNumber as string | undefined
    const expiryDate = prismaData.expiryDate as unknown as Date | undefined

    const lotOps = []
    if (batchNumber) {
      const existingLot = await prisma.lot.findUnique({
        where: { tenantId_productId_batchNumber: { tenantId, productId: id, batchNumber } },
      })

      if (existingLot && expiryDate) {
        lotOps.push(
          prisma.lot.update({ where: { id: existingLot.id }, data: { expiryDate } })
        )
      } else if (!existingLot) {
        lotOps.push(
          prisma.lot.create({
            data: {
              productId: id,
              tenantId,
              batchNumber,
              expiryDate: expiryDate || null,
              quantity: existingProduct.quantity,
              purchasePrice: (prismaData.purchasePrice as number) || Number(existingProduct.purchasePrice),
            },
          })
        )
      }
    }

    const [product] = await prisma.$transaction([
      prisma.product.update({ where: { id, tenantId }, data: prismaData }),
      ...lotOps,
    ])
    
    await auditLogger.logDataChange(
      null,
      tenantId,
      session.user.id,
      'product',
      product.id,
      'UPDATE',
      { before: { name: existingProduct.name, sku: existingProduct.sku }, after: { name: product.name, sku: product.sku } }
    )
    
    const response = NextResponse.json(product)
    return setCorsHeaders(response, request.headers.get('origin'))
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
  
  if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    )
  }
  
  let tenantId: string
  try {
    tenantId = extractTenantId(session)
  } catch {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
  
  try {
    const { id } = await params
    const existingProduct = await prisma.product.findFirst({
      where: { id, tenantId },
    })
    
    if (!existingProduct || !existingProduct.isActive) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }
    
    const product = await prisma.product.update({
      where: { id, tenantId },
      data: { isActive: false },
    })
    
    await auditLogger.logDataChange(
      null,
      tenantId,
      session.user.id,
      'product',
      product.id,
      'DELETE',
      { name: product.name, sku: product.sku }
    )
    
    const response = NextResponse.json(product)
    return setCorsHeaders(response, request.headers.get('origin'))
  } catch (error) {
    console.error('Failed to delete product:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
