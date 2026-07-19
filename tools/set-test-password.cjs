require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const bcrypt = require('bcryptjs')

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
  const prisma = new PrismaClient({ adapter })
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', isActive: true } })
  if (!admin) { console.error('No admin found'); process.exit(1) }
  const hash = await bcrypt.hash('TestAdmin123!@#', 14)
  await prisma.user.update({ where: { id: admin.id }, data: { password: hash, tokenVersion: 0 } })
  console.log(`Set password for: ${admin.email} (${admin.tenantId})`)
  await prisma.$disconnect()
}
main()
