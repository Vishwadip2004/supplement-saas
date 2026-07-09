import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function getTenantId(): Promise<string> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    throw new Error('Unauthorized: No tenant context')
  }
  return session.user.tenantId
}

export function extractTenantId(session: { user?: { tenantId?: string } }): string {
  if (!session?.user?.tenantId) {
    throw new Error('Unauthorized: No tenant context')
  }
  return session.user.tenantId
}
