import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'
import { supplierSchema, validateInput } from '@/lib/security/validation'
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

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
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

  const { id } = await params

  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id },
    })

    if (!supplier || !supplier.isActive) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(supplier)
  } catch (error) {
    console.error('Failed to fetch supplier:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request, { params }: RouteContext) {
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

  const { id } = await params

  try {
    const existing = await prisma.supplier.findUnique({
      where: { id },
    })

    if (!existing || !existing.isActive) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const validation = validateInput(supplierSchema, body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors.format() },
        { status: 400 }
      )
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: validation.data,
    })

    await auditLogger.logDataChange(
      session.user.id,
      'supplier',
      supplier.id,
      'UPDATE',
      { name: supplier.name }
    )

    return NextResponse.json(supplier)
  } catch (error) {
    console.error('Failed to update supplier:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
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

  const { id } = await params

  try {
    const existing = await prisma.supplier.findUnique({
      where: { id },
    })

    if (!existing || !existing.isActive) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      )
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: { isActive: false },
    })

    await auditLogger.logDataChange(
      session.user.id,
      'supplier',
      supplier.id,
      'DELETE',
      { name: supplier.name }
    )

    return NextResponse.json({ message: 'Supplier deleted' })
  } catch (error) {
    console.error('Failed to delete supplier:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
