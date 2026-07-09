import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'
import { customerSchema, validateInput } from '@/lib/security/validation'
import { auditLogger } from '@/lib/security/audit'
import { setCorsHeaders } from '@/lib/cors'
import { checkRateLimit, getClientIp } from '@/lib/security/rateLimit'
import { extractTenantId } from '@/lib/tenant'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getClientIp(request)
  
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
  
  const tenantId = extractTenantId(session)
  
  try {
    const { id } = await params
    const customer = await prisma.customer.findFirst({
      where: { id, tenantId },
    })
    
    if (!customer || !customer.isActive) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }
    
    const response = NextResponse.json(customer)
    return setCorsHeaders(response, request.headers.get('origin'))
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
  const ip = getClientIp(request)
  
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
  
  const tenantId = extractTenantId(session)
  
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
    
    const existing = await prisma.customer.findFirst({
      where: { id, tenantId },
    })
    
    if (!existing || !existing.isActive) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }
    
    const customer = await prisma.customer.update({
      where: { id, tenantId },
      data: validation.data,
    })
    
    await auditLogger.logDataChange(
      tenantId,
      session.user.id,
      'customer',
      customer.id,
      'UPDATE',
      {
        before: { name: existing.name, email: existing.email },
        after: { name: customer.name, email: customer.email },
      }
    )
    
    const response = NextResponse.json(customer)
    return setCorsHeaders(response, request.headers.get('origin'))
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
  const ip = getClientIp(request)
  
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
  
  const tenantId = extractTenantId(session)
  
  try {
    const { id } = await params
    const existing = await prisma.customer.findFirst({
      where: { id, tenantId },
    })
    
    if (!existing || !existing.isActive) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }
    
    await prisma.customer.update({
      where: { id, tenantId },
      data: { isActive: false },
    })
    
    await auditLogger.logDataChange(
      tenantId,
      session.user.id,
      'customer',
      id,
      'DELETE',
      { name: existing.name, email: existing.email }
    )
    
    const response = NextResponse.json({ message: 'Customer deleted successfully' })
    return setCorsHeaders(response, request.headers.get('origin'))
  } catch (error) {
    console.error('Failed to delete customer:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
