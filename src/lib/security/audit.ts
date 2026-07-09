import { prisma } from '@/lib/prisma'

export interface AuditLog {
  userId?: string
  action: string
  resource: string
  resourceId?: string
  details?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  status: 'success' | 'failure' | 'warning'
}

export class AuditLogger {
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
          status: data.status,
          timestamp: new Date(),
        },
      })
    } catch (error) {
      console.error('Audit log failed:', error)
      // Don't throw - audit logging should never break the main flow
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
  
  static async logDataChange(userId: string, resource: string, resourceId: string, action: string, details?: Record<string, any>): Promise<void> {
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
