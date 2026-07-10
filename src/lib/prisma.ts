import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set')
    }
    const adapter = new PrismaPg({ connectionString: databaseUrl })
    globalForPrisma.prisma = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    })
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
