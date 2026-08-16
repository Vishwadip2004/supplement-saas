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

  if (!['ADMIN', 'MANAGER'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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

      const aggregatedSales = await prisma.sale.groupBy({
        by: ['productId'],
        where: {
          tenantId,
          createdAt: { gte: startDate, lte: endDate },
        },
        _sum: { quantity: true, totalAmount: true },
        _count: true,
      })

      const salesMap = new Map(aggregatedSales.map(s => [s.productId, s]))

      const productStats = products.map((p) => {
        const salesData = salesMap.get(p.id)
        const sold = salesData?._sum.quantity || 0
        const revenue = Number(salesData?._sum.totalAmount || 0)
        const profit = (Number(p.sellingPrice) - Number(p.purchasePrice)) * sold
        return {
          ...p,
          sold,
          revenue,
          profit,
          orderCount: salesData?._count || 0,
        }
      })

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
      const gstConfigKeys = ['gstin', 'businessName', 'businessState', 'stateCode']
      const tenantScopedKeys = gstConfigKeys.map(k => `${k}:${tenantId}`)
      const configs = await prisma.systemConfig.findMany({
        where: { key: { in: tenantScopedKeys } },
      })
      for (const c of configs) {
        const key = c.key.split(':')[0]
        gstConfig[key] = c.value
      }

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

    if (reportType === 'overview') {
      const [sales, products, , expiringProducts, recentSales] = await Promise.all([
        prisma.sale.findMany({
          where: { tenantId, createdAt: { gte: startDate, lte: endDate } },
          include: { product: { select: { name: true, sku: true, purchasePrice: true, sellingPrice: true, gstRate: true } } },
        }),
        prisma.product.findMany({ where: { tenantId, isActive: true } }),
        prisma.product.findMany({ where: { tenantId, isActive: true, quantity: { lte: 10 } } }),
        prisma.lot.findMany({
          where: {
            tenantId,
            expiryDate: { not: null, lte: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) },
            quantity: { gt: 0 },
          },
          include: { product: { select: { name: true } } },
          orderBy: { expiryDate: 'asc' },
          take: 20,
        }),
        prisma.sale.findMany({
          where: { tenantId },
          include: { product: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
      ])

      const totalRevenue = sales.reduce((sum, s) => sum + Number(s.totalAmount), 0)
      const totalCost = sales.reduce((sum, s) => sum + Number(s.product.purchasePrice) * s.quantity, 0)
      const totalProfit = totalRevenue - totalCost
      const totalTax = sales.reduce((sum, s) => sum + Number(s.totalTax), 0)
      const totalDiscount = sales.reduce((sum, s) => sum + Number(s.discount), 0)
      const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

      const productStats = products.map(p => {
        const productSales = sales.filter(s => s.productId === p.id)
        const sold = productSales.reduce((sum, s) => sum + s.quantity, 0)
        const revenue = productSales.reduce((sum, s) => sum + Number(s.totalAmount), 0)
        const cost = productSales.reduce((sum, s) => sum + Number(p.purchasePrice) * s.quantity, 0)
        return { id: p.id, name: p.name, sku: p.sku, category: p.category, sold, revenue, profit: revenue - cost, stock: p.quantity }
      }).sort((a, b) => b.profit - a.profit)

      const topSelling = [...productStats].sort((a, b) => b.sold - a.sold).slice(0, 5)
      const topProfit = productStats.slice(0, 5)
      const slowMoving = productStats.filter(p => p.sold === 0 && p.stock > 0).slice(0, 5)

      const lowStock = products.filter(p => p.quantity > 0 && p.quantity <= p.minStock)
        .sort((a, b) => a.quantity - b.quantity)
        .slice(0, 10)
      const outOfStock = products.filter(p => p.quantity === 0).length

      const stockValue = products.reduce((sum, p) => sum + Number(p.purchasePrice) * p.quantity, 0)
      const retailValue = products.reduce((sum, p) => sum + Number(p.sellingPrice) * p.quantity, 0)

      const dailySales: Record<string, { revenue: number; profit: number; count: number }> = {}
      for (const sale of sales) {
        const day = new Date(sale.createdAt).toISOString().split('T')[0]
        if (!dailySales[day]) dailySales[day] = { revenue: 0, profit: 0, count: 0 }
        dailySales[day].revenue += Number(sale.totalAmount)
        dailySales[day].profit += Number(sale.totalAmount) - Number(sale.product.purchasePrice) * sale.quantity
        dailySales[day].count++
      }
      const salesTrend = Object.entries(dailySales)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, data]) => ({ date, ...data }))

      const monthlySales: Record<string, { revenue: number; cost: number; profit: number; count: number }> = {}
      for (const sale of sales) {
        const month = new Date(sale.createdAt).toISOString().slice(0, 7)
        if (!monthlySales[month]) monthlySales[month] = { revenue: 0, cost: 0, profit: 0, count: 0 }
        const revenue = Number(sale.totalAmount)
        const cost = Number(sale.product.purchasePrice) * sale.quantity
        monthlySales[month].revenue += revenue
        monthlySales[month].cost += cost
        monthlySales[month].profit += revenue - cost
        monthlySales[month].count++
      }
      const monthlyProfit = Object.entries(monthlySales)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, data]) => ({ month, ...data, margin: data.revenue > 0 ? Math.round(((data.revenue - data.cost) / data.revenue) * 10000) / 100 : 0 }))

      const paymentBreakdown: Record<string, number> = {}
      for (const sale of sales) {
        paymentBreakdown[sale.paymentMethod] = (paymentBreakdown[sale.paymentMethod] || 0) + Number(sale.totalAmount)
      }

      const gstByRate: Record<string, { taxable: number; tax: number }> = {}
      for (const sale of sales) {
        const rate = String(Number(sale.product.gstRate || 18))
        if (!gstByRate[rate]) gstByRate[rate] = { taxable: 0, tax: 0 }
        gstByRate[rate].taxable += Number(sale.totalAmount) - Number(sale.totalTax)
        gstByRate[rate].tax += Number(sale.totalTax)
      }

      const response = NextResponse.json({
        period: { from: startDate, to: endDate },
        kpi: {
          totalRevenue,
          totalCost,
          totalProfit,
          profitMargin: Math.round(profitMargin * 100) / 100,
          totalTax,
          totalDiscount,
          totalInvoices: sales.length,
          avgOrderValue: sales.length > 0 ? Math.round((totalRevenue / sales.length) * 100) / 100 : 0,
          totalProducts: products.length,
          stockValue,
          retailValue,
        },
        topSelling,
        topProfit,
        slowMoving,
        lowStock,
        outOfStockCount: outOfStock,
        expiringSoon: expiringProducts.map(ep => ({
          id: ep.id,
          batchNumber: ep.batchNumber,
          productName: ep.product.name,
          expiryDate: ep.expiryDate,
          quantity: ep.quantity,
        })),
        salesTrend,
        monthlyProfit,
        paymentBreakdown,
        gstSummary: gstByRate,
        recentSales: recentSales.map(s => ({
          id: s.id,
          invoiceNumber: s.invoiceNumber,
          product: s.product.name,
          amount: Number(s.totalAmount),
          date: s.createdAt,
        })),
      })
      return setCorsHeaders(response)
    }

    return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
  } catch (error) {
    console.error('Error generating report:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
