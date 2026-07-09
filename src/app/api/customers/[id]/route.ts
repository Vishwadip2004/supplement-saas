import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'
import { customerSchema, validateInput } from '@/lib/security/validation'
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
    const customer = await prisma.customer.findUnique({
      where: { id },
    })
    
    if (!customer || !customer.isActive) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(customer)
  } catch (error) {
    console.error('Failed to fetch customer:', error)
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
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      )
    }
    const validation = validateInput(customerSchema, body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors.format() },
        { status: 400 }
      )
    }
    
    const existing = await prisma.customer.findUnique({
      where: { id },
    })
    
    if (!existing) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }
    
    const customer = await prisma.customer.update({
      where: { id },
      data: validation.data,
    })
    
    await auditLogger.logDataChange(
      session.user.id,
      'customer',
      customer.id,
      'UPDATE',
      {
        before: { name: existing.name, email: existing.email },
        after: { name: customer.name, email: customer.email },
      }
    )
    
    return NextResponse.json(customer)
  } catch (error) {
    console.error('Failed to update customer:', error)
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
  
  if (!['ADMIN'].includes(session.user.role)) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    )
  }
  
  try {
    const { id } = await params
    const existing = await prisma.customer.findUnique({
      where: { id },
    })
    
    if (!existing) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }
    
    if (!existing.isActive) {
      return NextResponse.json(
        { error: 'Customer is already deactivated' },
        { status: 400 }
      )
    }
    
    await prisma.customer.update({
      where: { id },
      data: { isActive: false },
    })
    
    await auditLogger.logDataChange(
      session.user.id,
      'customer',
      id,
      'DELETE',
      { name: existing.name, email: existing.email }
    )
    
    return NextResponse.json({ message: 'Customer deleted successfully' })
  } catch (error) {
    console.error('Failed to delete customer:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
