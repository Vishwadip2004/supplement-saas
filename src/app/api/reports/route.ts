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

  if (!['ADMIN', 'MANAGER', 'STAFF'].includes(session.user.role)) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    )
  }

  let tenantId: string
  try {
    tenantId = extractTenantId(session)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

    const where = { tenantId, isActive: true }

    const lowStockProducts = await prisma.product.findMany({
      where,
      select: { quantity: true, minStock: true },
    })
    const lowStockCount = lowStockProducts.filter((p) => p.quantity <= p.minStock).length

    const [totalProducts, expiringSoon, totalSalesResult, todaySalesResult, recentSales] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.count({ where: { ...where, expiryDate: { gte: new Date(), lte: thirtyDaysFromNow } } }),
      prisma.sale.aggregate({ _sum: { totalAmount: true }, where: { tenantId } }),
      prisma.sale.aggregate({ _sum: { totalAmount: true }, where: { tenantId, createdAt: { gte: todayStart } } }),
      prisma.sale.findMany({ where: { tenantId }, take: 10, orderBy: { createdAt: 'desc' }, include: { product: true } }),
    ])

    const response = NextResponse.json({
      totalProducts,
      lowStock: lowStockCount,
      expiringSoon,
      totalSales: totalSalesResult._sum.totalAmount ?? 0,
      todaySales: todaySalesResult._sum.totalAmount ?? 0,
      recentSales,
    })
    return setCorsHeaders(response, request.headers.get('origin'))
  } catch (error) {
    console.error('Failed to fetch reports:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
