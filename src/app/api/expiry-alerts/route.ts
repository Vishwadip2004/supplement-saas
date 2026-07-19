import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'
import { setCorsHeaders } from '@/lib/cors'
import { checkRateLimit, getClientIp } from '@/lib/security/rateLimit'
import { extractTenantId } from '@/lib/tenant'

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
    const now = new Date()
    const thirtyDays = new Date(now)
    thirtyDays.setDate(thirtyDays.getDate() + 30)
    const sixtyDays = new Date(now)
    sixtyDays.setDate(sixtyDays.getDate() + 60)
    const ninetyDays = new Date(now)
    ninetyDays.setDate(ninetyDays.getDate() + 90)

    const expired = await prisma.lot.findMany({
      where: {
        tenantId,
        quantity: { gt: 0 },
        expiryDate: { lt: now },
      },
      include: { product: { select: { id: true, name: true, sku: true, category: true } } },
      orderBy: { expiryDate: 'asc' },
    })

    const expiring30 = await prisma.lot.findMany({
      where: {
        tenantId,
        quantity: { gt: 0 },
        expiryDate: { gte: now, lte: thirtyDays },
      },
      include: { product: { select: { id: true, name: true, sku: true, category: true } } },
      orderBy: { expiryDate: 'asc' },
    })

    const expiring60 = await prisma.lot.findMany({
      where: {
        tenantId,
        quantity: { gt: 0 },
        expiryDate: { gt: thirtyDays, lte: sixtyDays },
      },
      include: { product: { select: { id: true, name: true, sku: true, category: true } } },
      orderBy: { expiryDate: 'asc' },
    })

    const expiring90 = await prisma.lot.findMany({
      where: {
        tenantId,
        quantity: { gt: 0 },
        expiryDate: { gt: sixtyDays, lte: ninetyDays },
      },
      include: { product: { select: { id: true, name: true, sku: true, category: true } } },
      orderBy: { expiryDate: 'asc' },
    })

    const response = NextResponse.json({
      expired: expired.map(l => ({
        ...l,
        daysExpired: Math.floor((now.getTime() - new Date(l.expiryDate!).getTime()) / (1000 * 60 * 60 * 24)),
      })),
      expiring30: expiring30.map(l => ({
        ...l,
        daysUntilExpiry: Math.floor((new Date(l.expiryDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      })),
      expiring60: expiring60.map(l => ({
        ...l,
        daysUntilExpiry: Math.floor((new Date(l.expiryDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      })),
      expiring90: expiring90.map(l => ({
        ...l,
        daysUntilExpiry: Math.floor((new Date(l.expiryDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      })),
      summary: {
        expiredCount: expired.length,
        expiredQuantity: expired.reduce((s, l) => s + l.quantity, 0),
        expiredValue: expired.reduce((s, l) => s + (Number(l.purchasePrice || 0) * l.quantity), 0),
        expiring30Count: expiring30.length,
        expiring60Count: expiring60.length,
        expiring90Count: expiring90.length,
      },
    })
    return setCorsHeaders(response, request.headers.get('origin'))
  } catch (error) {
    console.error('Failed to fetch expiry alerts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
