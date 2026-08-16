import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'
import { auditLogger } from '@/lib/security/audit'
import { setCorsHeaders } from '@/lib/cors'
import { checkRateLimit, getClientIp } from '@/lib/security/rateLimit'
import { extractTenantId } from '@/lib/tenant'
import { validateCsrfRequest } from '@/lib/csrf'
import { z } from 'zod'

const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  emoji: z.string().max(10).optional(),
  color: z.string().max(30).optional(),
  sortOrder: z.number().int().min(0).max(1000).optional(),
})

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getClientIp(request)
  if (!(await checkRateLimit(ip))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  if (!validateCsrfRequest(request)) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 })
  }

  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const role = session.user?.role
  if (role !== 'ADMIN' && role !== 'MANAGER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let tenantId: string
  try {
    tenantId = extractTenantId(session)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const validation = updateCategorySchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 })
    }
    const { name, emoji, color, sortOrder } = validation.data

    const existing = await prisma.category.findFirst({
      where: { id, tenantId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    if (name && name.trim() !== existing.name) {
      const duplicate = await prisma.category.findFirst({
        where: { tenantId, name: name.trim(), id: { not: id } },
      })
      if (duplicate) {
        return NextResponse.json({ error: 'Category name already exists' }, { status: 409 })
      }
    }

    const category = await prisma.category.update({
      where: { id, tenantId },
      data: {
        ...(name && { name: name.trim() }),
        ...(emoji && { emoji }),
        ...(color && { color }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    })

    await auditLogger.logDataChange(null, tenantId, session.user?.id || '', 'category', category.id, 'UPDATE', { name: category.name })

    return setCorsHeaders(NextResponse.json(category))
  } catch (error) {
    console.error('Error updating category:', error)
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getClientIp(request)
  if (!(await checkRateLimit(ip))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  if (!validateCsrfRequest(request)) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 })
  }

  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const role = session.user?.role
  if (role !== 'ADMIN' && role !== 'MANAGER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let tenantId: string
  try {
    tenantId = extractTenantId(session)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params

    let body: { reassignTo?: string } = {}
    try {
      body = await request.json()
    } catch {}

    const existing = await prisma.category.findFirst({
      where: { id, tenantId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    const productCount = await prisma.product.count({
      where: { tenantId, category: existing.name },
    })

    if (productCount > 0) {
      if (!body.reassignTo) {
        return NextResponse.json(
          { error: `Cannot delete category "${existing.name}" - ${productCount} product(s) use it. Reassign products first.`, productCount },
          { status: 409 }
        )
      }

      await prisma.product.updateMany({
        where: { tenantId, category: existing.name },
        data: { category: body.reassignTo },
      })
    }

    await prisma.category.update({
      where: { id, tenantId },
      data: { isActive: false },
    })

    await auditLogger.logDataChange(null, tenantId, session.user?.id || '', 'category', id, 'DELETE', { name: existing.name })

    return setCorsHeaders(NextResponse.json({ success: true }))
  } catch (error) {
    console.error('Error deleting category:', error)
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 })
  }
}
