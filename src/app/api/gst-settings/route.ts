import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'
import { setCorsHeaders } from '@/lib/cors'
import { checkRateLimit, getClientIp } from '@/lib/security/rateLimit'
import { validateCsrfRequest } from '@/lib/csrf'
import { auditLogger } from '@/lib/security/audit'
import { extractTenantId } from '@/lib/tenant'

const GST_DEFAULTS: Record<string, string> = {
  gstin: '',
  businessName: '',
  businessAddress: '',
  businessState: '',
  stateCode: '27',
  defaultGstRate: '18',
  invoicePrefix: 'INV',
  invoiceNextNumber: '1',
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

  let tenantId: string
  try {
    tenantId = extractTenantId(session)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const keys = Object.keys(GST_DEFAULTS).map(k => `${k}:${tenantId}`)
    const configs = await prisma.systemConfig.findMany({
      where: { key: { in: keys } },
    })

    const gstSettings: Record<string, string> = { ...GST_DEFAULTS }
    for (const config of configs) {
      const key = config.key.split(':')[0]
      gstSettings[key] = config.value
    }

    return setCorsHeaders(NextResponse.json(gstSettings))
  } catch (error) {
    console.error('Error fetching GST settings:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
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

  if (session.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Only admins can update GST settings' }, { status: 403 })
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

    const allowedKeys = Object.keys(GST_DEFAULTS)
    const updates: { key: string; value: string; description: string }[] = []
    const bodyData = body as Record<string, unknown>

    for (const key of allowedKeys) {
      if (bodyData[key] !== undefined) {
        updates.push({
          key: `${key}:${tenantId}`,
          value: String(bodyData[key]),
          description: `GST setting: ${key}`,
        })
      }
    }

    for (const update of updates) {
      await prisma.systemConfig.upsert({
        where: { key: update.key },
        update: { value: update.value },
        create: update,
      })
    }

    await auditLogger.logDataChange(
      null,
      tenantId,
      session.user?.id || '',
      'gst_settings',
      'gst_settings',
      'UPDATE',
      { updatedKeys: updates.map(u => u.key) }
    )

    return setCorsHeaders(NextResponse.json({ success: true, message: 'GST settings updated' }))
  } catch (error) {
    console.error('Error updating GST settings:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
