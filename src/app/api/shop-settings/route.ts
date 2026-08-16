import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'
import { auditLogger } from '@/lib/security/audit'
import { setCorsHeaders } from '@/lib/cors'
import { checkRateLimit, getClientIp } from '@/lib/security/rateLimit'
import { extractTenantId } from '@/lib/tenant'
import { validateCsrfRequest } from '@/lib/csrf'
import { shopSettingsSchema, validateInput } from '@/lib/security/validation'

const DEFAULT_SHOP_NAME = 'SupplementShop'

export async function GET(request: Request) {
  const ip = getClientIp(request)
  if (!(await checkRateLimit(ip))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let tenantId: string
  try {
    tenantId = extractTenantId(session)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: `shop_name:${tenantId}` },
    })

    return setCorsHeaders(NextResponse.json({
      shopName: config?.value || DEFAULT_SHOP_NAME,
    }))
  } catch (error) {
    console.error('Error fetching shop settings:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const ip = getClientIp(request)
  if (!(await checkRateLimit(ip))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  if (!validateCsrfRequest(request)) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 })
  }

  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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

    const validation = validateInput(shopSettingsSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.errors.format() }, { status: 400 })
    }

    const { shopName } = validation.data

    await prisma.systemConfig.upsert({
      where: { key: `shop_name:${tenantId}` },
      update: { value: shopName.trim() },
      create: { key: `shop_name:${tenantId}`, value: shopName.trim(), description: 'Custom shop name displayed in sidebar and header' },
    })

    await auditLogger.logDataChange(null, tenantId, session.user?.id || '', 'shop_settings', 'shop_name', 'UPDATE', { shopName: shopName.trim() })

    return setCorsHeaders(NextResponse.json({ shopName: shopName.trim() }))
  } catch (error) {
    console.error('Error updating shop settings:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
