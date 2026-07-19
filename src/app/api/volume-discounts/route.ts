import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'
import { volumeDiscountSchema, volumeDiscountUpdateSchema, validateInput } from '@/lib/security/validation'
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
    const discounts = await prisma.volumeDiscount.findMany({
      where: { tenantId, isActive: true },
      orderBy: { minQuantity: 'asc' },
    })

    const response = NextResponse.json({ data: discounts })
    return setCorsHeaders(response, request.headers.get('origin'))
  } catch (error) {
    console.error('Failed to fetch volume discounts:', error)
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

    const validation = validateInput(volumeDiscountSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.errors.format() }, { status: 400 })
    }

    const { name, description, minQuantity, discountType, discountValue } = validation.data

    const discount = await prisma.volumeDiscount.create({
      data: {
        name,
        description: description || null,
        minQuantity,
        discountType: discountType || 'PERCENTAGE',
        discountValue,
        tenantId,
      },
    })

    await auditLogger.logDataChange(
      null,
      tenantId,
      session.user.id,
      'volumeDiscount',
      discount.id,
      'CREATE',
      { name, minQuantity, discountType, discountValue }
    )

    const response = NextResponse.json(discount, { status: 201 })
    return setCorsHeaders(response, request.headers.get('origin'))
  } catch (error) {
    console.error('Failed to create volume discount:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
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

    const validation = validateInput(volumeDiscountUpdateSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.errors.format() }, { status: 400 })
    }

    const { id, name, description, minQuantity, discountType, discountValue } = validation.data

    const existing = await prisma.volumeDiscount.findFirst({ where: { id, tenantId } })
    if (!existing) {
      return NextResponse.json({ error: 'Volume discount not found' }, { status: 404 })
    }

    const discount = await prisma.volumeDiscount.update({
      where: { id },
      data: {
        name: name || existing.name,
        description: description !== undefined ? description : existing.description,
        minQuantity: minQuantity || existing.minQuantity,
        discountType: discountType || existing.discountType,
        discountValue: discountValue || existing.discountValue,
      },
    })

    await auditLogger.logDataChange(
      null,
      tenantId,
      session.user.id,
      'volumeDiscount',
      discount.id,
      'UPDATE',
      { name: discount.name }
    )

    const response = NextResponse.json(discount)
    return setCorsHeaders(response, request.headers.get('origin'))
  } catch (error) {
    console.error('Failed to update volume discount:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
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
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const existing = await prisma.volumeDiscount.findFirst({ where: { id, tenantId } })
    if (!existing) {
      return NextResponse.json({ error: 'Volume discount not found' }, { status: 404 })
    }

    await prisma.volumeDiscount.update({
      where: { id },
      data: { isActive: false },
    })

    await auditLogger.logDataChange(
      null,
      tenantId,
      session.user.id,
      'volumeDiscount',
      id,
      'DELETE',
      { name: existing.name }
    )

    const response = NextResponse.json({ message: 'Volume discount deactivated' })
    return setCorsHeaders(response, request.headers.get('origin'))
  } catch (error) {
    console.error('Failed to delete volume discount:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
