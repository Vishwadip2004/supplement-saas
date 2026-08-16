import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const start = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const latency = Date.now() - start

    const tenantCount = await prisma.tenant.count()
    const productCount = await prisma.product.count()
    const saleCount = await prisma.sale.count()

    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      latency: `${latency}ms`,
      data: {
        tenants: tenantCount,
        products: productCount,
        sales: saleCount,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    if (message.includes('fetch failed') || message.includes('ECONNREFUSED')) {
      return NextResponse.json({
        status: 'unhealthy',
        database: 'unreachable',
        error: 'Cannot connect to database. If using Neon, the database may be paused.',
        help: 'Visit https://console.neon.tech to wake up your database, then try again.',
      }, { status: 503 })
    }

    return NextResponse.json({
      status: 'unhealthy',
      database: 'error',
      error: process.env.NODE_ENV === 'production' ? 'Internal database error' : message,
    }, { status: 503 })
  }
}
