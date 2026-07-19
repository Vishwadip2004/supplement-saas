import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'
import { setCorsHeaders } from '@/lib/cors'
import { checkRateLimit, getClientIp } from '@/lib/security/rateLimit'

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
    const { searchParams } = new URL(request.url)
    const dateFrom = searchParams.get('from')
    const dateTo = searchParams.get('to')
    const reportType = searchParams.get('type') || 'summary'

    const tenantId = session.user?.tenantId
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const startDate = dateFrom ? new Date(dateFrom) : new Date(new Date().setHours(0, 0, 0, 0))
    const endDate = dateTo ? new Date(dateTo + 'T23:59:59.999Z') : new Date()

    if (reportType === 'sales') {
      const sales = await prisma.sale.findMany({
        where: {
          tenantId,
          createdAt: { gte: startDate, lte: endDate },
        },
        include: { product: { select: { name: true, sku: true, hsnCode: true, gstRate: true } } },
        orderBy: { createdAt: 'desc' },
      })

      const summary = {
        totalSales: sales.reduce((sum, s) => sum + Number(s.totalAmount), 0),
        totalTax: sales.reduce((sum, s) => sum + Number(s.totalTax), 0),
        totalCgst: sales.reduce((sum, s) => sum + Number(s.cgst), 0),
        totalSgst: sales.reduce((sum, s) => sum + Number(s.sgst), 0),
        totalIgst: sales.reduce((sum, s) => sum + Number(s.igst), 0),
        totalDiscount: sales.reduce((sum, s) => sum + Number(s.discount), 0),
        invoiceCount: sales.length,
        sales,
      }

      const response = NextResponse.json(summary)
      return setCorsHeaders(response)
    }

    if (reportType === 'products') {
      const products = await prisma.product.findMany({
        where: { tenantId, isActive: true },
        orderBy: { name: 'asc' },
      })

      const productStats = await Promise.all(
        products.map(async (p) => {
          const salesData = await prisma.sale.aggregate({
            where: { tenantId, productId: p.id, createdAt: { gte: startDate, lte: endDate } },
            _sum: { quantity: true, totalAmount: true },
            _count: true,
          })
          const profit = (Number(p.sellingPrice) - Number(p.purchasePrice)) * (salesData._sum.quantity || 0)
          return {
            ...p,
            sold: salesData._sum.quantity || 0,
            revenue: Number(salesData._sum.totalAmount || 0),
            profit,
            orderCount: salesData._count,
          }
        })
      )

      const response = NextResponse.json({
        products: productStats.sort((a, b) => b.revenue - a.revenue),
        totalRevenue: productStats.reduce((s, p) => s + p.revenue, 0),
        totalProfit: productStats.reduce((s, p) => s + p.profit, 0),
        totalSold: productStats.reduce((s, p) => s + p.sold, 0),
      })
      return setCorsHeaders(response)
    }

    if (reportType === 'stock') {
      const products = await prisma.product.findMany({
        where: { tenantId, isActive: true },
        orderBy: { quantity: 'asc' },
      })

      const stockValue = products.reduce((sum, p) => sum + Number(p.purchasePrice) * p.quantity, 0)
      const retailValue = products.reduce((sum, p) => sum + Number(p.sellingPrice) * p.quantity, 0)
      const lowStock = products.filter(p => p.quantity <= p.minStock)
      const outOfStock = products.filter(p => p.quantity === 0)

      const response = NextResponse.json({
        products,
        summary: {
          totalProducts: products.length,
          totalStockValue: stockValue,
          totalRetailValue: retailValue,
          potentialProfit: retailValue - stockValue,
          lowStockCount: lowStock.length,
          outOfStockCount: outOfStock.length,
          lowStock,
          outOfStock,
        },
      })
      return setCorsHeaders(response)
    }

    if (reportType === 'gst') {
      const sales = await prisma.sale.findMany({
        where: {
          tenantId,
          createdAt: { gte: startDate, lte: endDate },
        },
        include: { product: { select: { name: true, hsnCode: true, gstRate: true } } },
      })

      const gstByRate: Record<string, { taxable: number; cgst: number; sgst: number; igst: number; count: number }> = {}

      for (const sale of sales) {
        const rate = Number(sale.product.gstRate || 18)
        const rateKey = String(rate)
        if (!gstByRate[rateKey]) {
          gstByRate[rateKey] = { taxable: 0, cgst: 0, sgst: 0, igst: 0, count: 0 }
        }
        const taxable = Number(sale.totalAmount) - Number(sale.totalTax)
        gstByRate[rateKey].taxable += taxable
        gstByRate[rateKey].cgst += Number(sale.cgst)
        gstByRate[rateKey].sgst += Number(sale.sgst)
        gstByRate[rateKey].igst += Number(sale.igst)
        gstByRate[rateKey].count += 1
      }

      const gstConfig: Record<string, string> = {}
      const configs = await prisma.systemConfig.findMany({
        where: { key: { in: ['gstin', 'businessName', 'businessState', 'stateCode'] } },
      })
      for (const c of configs) gstConfig[c.key] = c.value

      const response = NextResponse.json({
        period: { from: startDate, to: endDate },
        business: gstConfig,
        gstByRate,
        totalTaxable: Object.values(gstByRate).reduce((s, r) => s + r.taxable, 0),
        totalCgst: Object.values(gstByRate).reduce((s, r) => s + r.cgst, 0),
        totalSgst: Object.values(gstByRate).reduce((s, r) => s + r.sgst, 0),
        totalIgst: Object.values(gstByRate).reduce((s, r) => s + r.igst, 0),
        totalInvoiceCount: sales.length,
      })
      return setCorsHeaders(response)
    }

    return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
  } catch (error) {
    console.error('Error generating report:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
