import { PrismaClient, Prisma } from '@prisma/client'
import { AuditStatus } from '@prisma/client'
import fs from 'fs'
import path from 'path'

export interface AuditLog {
  tenantId: string
  userId?: string
  action: string
  resource: string
  resourceId?: string
  details?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  status: 'success' | 'failure' | 'warning'
}

let consecutiveFailures = 0
const ALERT_THRESHOLD = 5
const FALLBACK_LOG_DIR = path.join(process.cwd(), 'logs', 'audit-fallback')

function ensureFallbackDir() {
  if (!fs.existsSync(FALLBACK_LOG_DIR)) {
    fs.mkdirSync(FALLBACK_LOG_DIR, { recursive: true })
  }
}

function writeFallbackLog(data: AuditLog): void {
  try {
    ensureFallbackDir()
    const logEntry = {
      ...data,
      details: data.details ? JSON.stringify(data.details) : null,
      timestamp: new Date().toISOString(),
      fallback: true,
    }
    const fileName = `audit-${new Date().toISOString().split('T')[0]}.log`
    fs.appendFileSync(path.join(FALLBACK_LOG_DIR, fileName), JSON.stringify(logEntry) + '\n')
  } catch (e) {
    console.error('[CRITICAL] Failed to write fallback audit log:', e)
  }
}

type TxClient = PrismaClient | Prisma.TransactionClient

export class AuditLogger {
  private static mapStatus(status: AuditLog['status']): AuditStatus {
    const statusMap: Record<AuditLog['status'], AuditStatus> = {
      success: AuditStatus.SUCCESS,
      failure: AuditStatus.FAILURE,
      warning: AuditStatus.WARNING,
    }
    return statusMap[status]
  }

  static async log(tx: TxClient | null, data: AuditLog): Promise<void> {
    const logData = {
      tenantId: data.tenantId,
      userId: data.userId,
      action: data.action,
      resource: data.resource,
      resourceId: data.resourceId,
      details: data.details ? JSON.stringify(data.details) : null,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      status: this.mapStatus(data.status),
      timestamp: new Date(),
    }

    if (tx) {
      try {
        await tx.auditLog.create({ data: logData })
        consecutiveFailures = 0
        return
      } catch (error) {
        console.error('Audit log failed, writing to fallback:', error)
      }
    } else {
      try {
        const prisma = (await import('@/lib/prisma')).default
        await prisma.auditLog.create({ data: logData })
        consecutiveFailures = 0
        return
      } catch (error) {
        console.error('Audit log failed, writing to fallback:', error)
      }
    }

    consecutiveFailures++
    writeFallbackLog(data)

    if (consecutiveFailures >= ALERT_THRESHOLD) {
      console.error(`[SECURITY ALERT] Audit logging has failed ${consecutiveFailures} times consecutively. Immediate attention required.`)
    }
  }

  static async logAuth(tx: TxClient | null, tenantId: string, userId: string | null, action: string, status: 'success' | 'failure', ipAddress?: string): Promise<void> {
    await this.log(tx, { tenantId, userId: userId || undefined, action, resource: 'auth', status, ipAddress })
  }

  static async logDataChange(tx: TxClient | null, tenantId: string, userId: string, resource: string, resourceId: string, action: string, details?: Record<string, unknown>): Promise<void> {
    await this.log(tx, { tenantId, userId, action, resource, resourceId, details, status: 'success' })
  }
}

export const auditLogger = AuditLogger