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

  try {
    const keys = Object.keys(GST_DEFAULTS)
    const configs = await prisma.systemConfig.findMany({
      where: { key: { in: keys } },
    })

    const gstSettings: Record<string, string> = { ...GST_DEFAULTS }
    for (const config of configs) {
      gstSettings[config.key] = config.value
    }

    const response = NextResponse.json(gstSettings)
    setCorsHeaders(response)
    return response
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
    const body = await request.json()

    const allowedKeys = Object.keys(GST_DEFAULTS)
    const updates: { key: string; value: string; description: string }[] = []

    for (const key of allowedKeys) {
      if (body[key] !== undefined) {
        updates.push({
          key,
          value: String(body[key]),
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

    const response = NextResponse.json({ success: true, message: 'GST settings updated' })
    setCorsHeaders(response)
    return response
  } catch (error) {
    console.error('Error updating GST settings:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
