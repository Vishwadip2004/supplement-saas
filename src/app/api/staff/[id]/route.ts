import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { auditLogger } from '@/lib/security/audit'
import { setCorsHeaders } from '@/lib/cors'
import { checkRateLimit, getClientIp } from '@/lib/security/rateLimit'
import { extractTenantId } from '@/lib/tenant'
import { validateCsrfRequest } from '@/lib/csrf'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!validateCsrfRequest(request)) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 })
  }

  const ip = getClientIp(request)
  if (!(await checkRateLimit(ip))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Only admins can update staff' }, { status: 403 })
  }

  let tenantId: string
  try {
    tenantId = extractTenantId(session)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await request.json()
    const { name, email, role: userRole, isActive, newPassword } = body

    const existing = await prisma.user.findFirst({
      where: { id, tenantId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (existing.id === session.user?.id && isActive === false) {
      return NextResponse.json({ error: 'Cannot deactivate your own account' }, { status: 400 })
    }

    if (email && email.trim() !== existing.email) {
      const duplicate = await prisma.user.findFirst({
        where: { email: email.trim(), tenantId, id: { not: id } },
      })
      if (duplicate) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
      }
    }

    const updateData: Record<string, unknown> = {}
    if (name) updateData.name = name.trim()
    if (email) updateData.email = email.trim()
    if (userRole && ['ADMIN', 'MANAGER', 'STAFF'].includes(userRole)) updateData.role = userRole
    if (isActive !== undefined) updateData.isActive = Boolean(isActive)

    if (newPassword) {
      if (newPassword.length < 8) {
        return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
      }
      updateData.password = await bcrypt.hash(newPassword, 14)
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        mfaEnabled: true,
        lastLogin: true,
        createdAt: true,
      },
    })

    await auditLogger.logDataChange(
      null,
      tenantId,
      session.user?.id || '',
      'user',
      id,
      'UPDATE',
      { name: updated.name, email: updated.email, role: updated.role, isActive: updated.isActive }
    )

    const response = NextResponse.json(updated)
    return setCorsHeaders(response)
  } catch (error) {
    console.error('Failed to update staff:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!validateCsrfRequest(request)) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 })
  }

  const ip = getClientIp(request)
  if (!(await checkRateLimit(ip))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Only admins can delete staff' }, { status: 403 })
  }

  let tenantId: string
  try {
    tenantId = extractTenantId(session)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params

    const existing = await prisma.user.findFirst({
      where: { id, tenantId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (existing.id === session.user?.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    })

    await auditLogger.logDataChange(
      null,
      tenantId,
      session.user?.id || '',
      'user',
      id,
      'DELETE',
      { name: existing.name, email: existing.email }
    )

    const response = NextResponse.json({ success: true, message: 'Staff member deactivated' })
    return setCorsHeaders(response)
  } catch (error) {
    console.error('Failed to delete staff:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
