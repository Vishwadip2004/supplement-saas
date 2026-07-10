import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { userSchema, validateInput } from '@/lib/security/validation'
import { auditLogger } from '@/lib/security/audit'
import { checkRateLimit, getClientIp } from '@/lib/security/rateLimit'
import { z } from 'zod'
import { addPasswordToHistory } from '@/lib/security/passwordHistory'

const registerSchema = userSchema.extend({
  shopName: z.string().min(2).max(100),
  shopSlug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
})

export async function POST(request: Request) {
  const ip = getClientIp(request)

  if (!checkRateLimit(ip, 10)) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    )
  }

  try {
    const body = await request.json()
    const validation = validateInput(registerSchema, body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors.format() },
        { status: 400 }
      )
    }

    const { email, name, password, shopName, shopSlug } = validation.data

    const existingTenant = await prisma.tenant.findUnique({
      where: { slug: shopSlug },
    })
    if (existingTenant) {
      return NextResponse.json(
        { error: 'Shop URL already taken' },
        { status: 409 }
      )
    }

    const existingUser = await prisma.user.findFirst({
      where: { email },
    })
    if (existingUser) {
      return NextResponse.json(
        { error: 'Registration failed' },
        { status: 409 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: { name: shopName, slug: shopSlug },
      })

      const user = await tx.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          role: 'ADMIN',
          tenantId: tenant.id,
        },
      })

      await addPasswordToHistory(tx, user.id, hashedPassword)

      return { tenant, user }
    })

    await auditLogger.logAuth(
      null,
      result.tenant.id,
      result.user.id,
      'REGISTER_SUCCESS',
      'success',
      ip
    )

    return NextResponse.json(
      { message: 'Account created successfully', userId: result.user.id },
      { status: 201 }
    )
  } catch (error) {
    console.error('Registration failed:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
