import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { auditLogger } from '@/lib/security/audit'
import { setCorsHeaders } from '@/lib/cors'
import { checkRateLimit, getClientIp } from '@/lib/security/rateLimit'
import { extractTenantId } from '@/lib/tenant'
import { validateCsrfRequest } from '@/lib/csrf'
import { staffCreateSchema, validateInput } from '@/lib/security/validation'
import crypto from 'crypto'

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let password = ''
  const bytes = crypto.randomBytes(16)
  for (let i = 0; i < 16; i++) {
    password += chars[bytes[i] % chars.length]
  }
  password += '!'
  return password
}

export async function GET(request: Request) {
  const ip = getClientIp(request)
  if (!(await checkRateLimit(ip))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!['ADMIN', 'MANAGER'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
    const role = searchParams.get('role') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20', 10)))
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {
      tenantId,
      isActive: true,
      ...(role && { role }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          mfaEnabled: true,
          lastLogin: true,
          createdAt: true,
        },
      }),
      prisma.user.count({ where }),
    ])

    const pages = Math.ceil(total / limit)

    const response = NextResponse.json({
      data: users,
      pagination: { page, limit, total, pages },
    })
    return setCorsHeaders(response)
  } catch (error) {
    console.error('Failed to fetch staff:', error)
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

  if (session.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Only admins can add staff' }, { status: 403 })
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
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const validation = validateInput(staffCreateSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.errors.format() }, { status: 400 })
    }

    const { name, email, role: userRole } = validation.data

    const existingUser = await prisma.user.findFirst({
      where: { email: email.trim(), tenantId, isActive: true },
    })
    if (existingUser) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 })
    }

    const password = generatePassword()
    const hashedPassword = await bcrypt.hash(password, 14)

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim(),
        password: hashedPassword,
        role: userRole,
        tenantId,
      },
    })

    await auditLogger.logDataChange(
      null,
      tenantId,
      session.user?.id || '',
      'user',
      user.id,
      'CREATE',
      { name: user.name, email: user.email, role: user.role }
    )

    const response = NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      message: 'Staff member created. Share the generated password securely via a trusted channel.',
      generatedPassword: password,
    }, { status: 201 })
    return setCorsHeaders(response)
  } catch (error) {
    console.error('Failed to create staff:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
