import { prisma } from '@/lib/prisma'
import { AuditStatus } from '@prisma/client'

export interface AuditLog {
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

export class AuditLogger {
  private static mapStatus(status: AuditLog['status']): AuditStatus {
    const statusMap: Record<AuditLog['status'], AuditStatus> = {
      success: AuditStatus.SUCCESS,
      failure: AuditStatus.FAILURE,
      warning: AuditStatus.WARNING,
    }
    return statusMap[status]
  }

  static async log(data: AuditLog): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: data.userId,
          action: data.action,
          resource: data.resource,
          resourceId: data.resourceId,
          details: data.details ? JSON.stringify(data.details) : null,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          status: this.mapStatus(data.status),
          timestamp: new Date(),
        },
      })
      consecutiveFailures = 0
    } catch (error) {
      consecutiveFailures++
      console.error('Audit log failed:', error)
      
      if (consecutiveFailures >= ALERT_THRESHOLD) {
        console.error(`[SECURITY ALERT] Audit logging has failed ${consecutiveFailures} times consecutively. Immediate attention required.`)
      }
    }
  }
  
  static async logAuth(userId: string, action: string, status: 'success' | 'failure', ipAddress?: string): Promise<void> {
    await this.log({
      userId,
      action,
      resource: 'auth',
      status,
      ipAddress,
    })
  }
  
  static async logDataChange(userId: string, resource: string, resourceId: string, action: string, details?: Record<string, unknown>): Promise<void> {
    await this.log({
      userId,
      action,
      resource,
      resourceId,
      details,
      status: 'success',
    })
  }
}

export const auditLogger = AuditLogger
