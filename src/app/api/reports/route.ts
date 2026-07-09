import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'

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

export async function GET(request: Request) {
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
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

    const lowStockProducts = await prisma.product.findMany({
      where: { isActive: true },
      select: { quantity: true, minStock: true },
    })
    const lowStockCount = lowStockProducts.filter((p) => p.quantity <= p.minStock).length

    const [totalProducts, expiringSoon, totalSalesResult, todaySalesResult, totalCustomers, recentSales] = await Promise.all([
      prisma.product.count({ where: { isActive: true } }),
      prisma.product.count({ where: { isActive: true, expiryDate: { gte: new Date(), lte: thirtyDaysFromNow } } }),
      prisma.sale.aggregate({ _sum: { totalAmount: true } }),
      prisma.sale.aggregate({ _sum: { totalAmount: true }, where: { createdAt: { gte: todayStart } } }),
      prisma.customer.count(),
      prisma.sale.findMany({ take: 10, orderBy: { createdAt: 'desc' }, include: { product: true } }),
    ])

    return NextResponse.json({
      totalProducts,
      lowStock: lowStockCount,
      expiringSoon,
      totalSales: totalSalesResult._sum.totalAmount ?? 0,
      todaySales: todaySalesResult._sum.totalAmount ?? 0,
      totalCustomers,
      recentSales,
    })
  } catch (error) {
    console.error('Failed to fetch reports:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
