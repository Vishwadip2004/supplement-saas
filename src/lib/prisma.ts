import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set')
    }

    const isNeon = databaseUrl.includes('neon.tech')

    if (isNeon) {
      // Use PrismaPg (TCP) which supports interactive transactions.
      // PrismaNeonHttp does NOT support transactions.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { PrismaPg } = require('@prisma/adapter-pg')
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Pool } = require('pg')
      const pool = new Pool({
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 30000,
        idleTimeoutMillis: 30000,
        max: 5,
      })
      const adapter = new PrismaPg(pool)
      globalForPrisma.prisma = new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
      })
    } else {
      globalForPrisma.prisma = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
      })
    }
  }
  return globalForPrisma.prisma
}

// Export a proxy that lazily initializes prisma on first use
const prisma = new Proxy({} as PrismaClient, {
  get(_, prop, receiver) {
    const target = getPrisma()
    const value = Reflect.get(target, prop, receiver)
    if (typeof value === 'function') {
      return value.bind(target)
    }
    return value
  },
})

export default prisma
