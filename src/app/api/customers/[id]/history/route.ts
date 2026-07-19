import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'
import { setCorsHeaders } from '@/lib/cors'
import { checkRateLimit, getClientIp } from '@/lib/security/rateLimit'
import { extractTenantId } from '@/lib/tenant'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id } = await params

    const customer = await prisma.customer.findFirst({
      where: { id, tenantId, isActive: true },
    })
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const sales = await prisma.sale.findMany({
      where: { customerId: id, tenantId },
      include: {
        product: { select: { id: true, name: true, sku: true, category: true, brand: true, flavor: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const totalSpent = sales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0)
    const totalItems = sales.reduce((sum, sale) => sum + sale.quantity, 0)

    const productFrequency: Record<string, { name: string; sku: string; quantity: number; lastPurchased: Date }> = {}
    for (const sale of sales) {
      const key = sale.productId
      if (productFrequency[key]) {
        productFrequency[key].quantity += sale.quantity
        if (new Date(sale.createdAt) > productFrequency[key].lastPurchased) {
          productFrequency[key].lastPurchased = new Date(sale.createdAt)
        }
      } else {
        productFrequency[key] = {
          name: sale.product.name,
          sku: sale.product.sku,
          quantity: sale.quantity,
          lastPurchased: new Date(sale.createdAt),
        }
      }
    }

    const frequentProducts = Object.values(productFrequency)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10)

    const categoryFrequency: Record<string, number> = {}
    for (const sale of sales) {
      const cat = sale.product.category
      categoryFrequency[cat] = (categoryFrequency[cat] || 0) + sale.quantity
    }

    const topCategories = Object.entries(categoryFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)

    const response = NextResponse.json({
      customer,
      summary: {
        totalOrders: sales.length,
        totalSpent,
        totalItems,
        averageOrderValue: sales.length > 0 ? totalSpent / sales.length : 0,
        firstPurchase: sales.length > 0 ? sales[sales.length - 1].createdAt : null,
        lastPurchase: sales.length > 0 ? sales[0].createdAt : null,
      },
      frequentProducts,
      topCategories: topCategories.map(([category, quantity]) => ({ category, quantity })),
      recentSales: sales.slice(0, 20),
    })
    return setCorsHeaders(response, request.headers.get('origin'))
  } catch (error) {
    console.error('Failed to fetch customer history:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
