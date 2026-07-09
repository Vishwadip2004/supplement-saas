import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { checkRateLimit, getClientIp } from '@/lib/security/rateLimit'

export async function POST(request: Request) {
  const ip = getClientIp(request)

  if (!checkRateLimit(`login-check:${ip}`, 10, 15 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 })
    }

    const user = await prisma.user.findFirst({
      where: { email },
      select: { id: true, password: true, isActive: true, mfaEnabled: true },
    })

    if (!user || !user.isActive) {
      return NextResponse.json({ mfaRequired: false })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      return NextResponse.json({ mfaRequired: false })
    }

    return NextResponse.json({
      mfaRequired: user.mfaEnabled,
      userId: user.id,
    })
  } catch (error) {
    console.error('Credential check failed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
