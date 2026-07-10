import { PrismaClient, Prisma } from '@prisma/client'
import { securityConfig } from '@/lib/security/config'
import bcrypt from 'bcryptjs'

const HISTORY_COUNT = securityConfig.password.historyCount || 12

type TxClient = PrismaClient | Prisma.TransactionClient

export async function checkPasswordHistory(tx: TxClient, userId: string, newPassword: string): Promise<boolean> {
  const history = await tx.passwordHistory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: HISTORY_COUNT,
    select: { password: true },
  })

  for (const entry of history) {
    const isMatch = await bcrypt.compare(newPassword, entry.password)
    if (isMatch) {
      return false
    }
  }
  return true
}

export async function addPasswordToHistory(tx: TxClient, userId: string, hashedPassword: string): Promise<void> {
  await tx.passwordHistory.create({
    data: {
      userId,
      password: hashedPassword,
    },
  })

  const count = await tx.passwordHistory.count({ where: { userId } })
  if (count > HISTORY_COUNT) {
    const oldest = await tx.passwordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      take: count - HISTORY_COUNT,
      select: { id: true },
    })
    await tx.passwordHistory.deleteMany({
      where: { id: { in: oldest.map(o => o.id) } },
    })
  }
}