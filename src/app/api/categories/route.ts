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

const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100),
  emoji: z.string().max(10).optional(),
  color: z.string().max(30).optional(),
  sortOrder: z.number().int().min(0).max(1000).optional(),
})

const DEFAULT_CATEGORIES = [
  { name: 'Whey Protein', emoji: '💪', color: 'blue' },
  { name: 'Plant Protein', emoji: '🌱', color: 'green' },
  { name: 'Pre-Workout', emoji: '⚡', color: 'orange' },
  { name: 'Creatine', emoji: '🔋', color: 'purple' },
  { name: 'BCAA & Amino Acids', emoji: '🧬', color: 'teal' },
  { name: 'Mass Gainer', emoji: '🏋️', color: 'amber' },
  { name: 'Fat Burner', emoji: '🔥', color: 'red' },
  { name: 'Vitamins & Minerals', emoji: '💊', color: 'yellow' },
  { name: 'Fish Oil & Omega', emoji: '🐟', color: 'sky' },
  { name: 'Joint Support', emoji: '🦴', color: 'stone' },
  { name: 'Probiotics & Digestive', emoji: '🦠', color: 'lime' },
  { name: 'Collagen', emoji: '✨', color: 'pink' },
  { name: 'Sleep & Relaxation', emoji: '😴', color: 'indigo' },
  { name: 'Testosterone & Hormone', emoji: '⚖️', color: 'slate' },
  { name: 'Hydration & Electrolytes', emoji: '💧', color: 'cyan' },
  { name: 'Greens & Superfoods', emoji: '🥬', color: 'emerald' },
  { name: 'Pump & Nitric Oxide', emoji: '💦', color: 'violet' },
  { name: 'Performance & Endurance', emoji: '🏃', color: 'fuchsia' },
  { name: 'Health', emoji: '❤️', color: 'rose' },
  { name: 'Recovery', emoji: '🩹', color: 'orange' },
]

export async function GET(request: Request) {
  const ip = getClientIp(request)
  if (!(await checkRateLimit(ip))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let tenantId: string
  try {
    tenantId = extractTenantId(session)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const categories = await prisma.category.findMany({
      where: { tenantId, isActive: true },
      orderBy: { sortOrder: 'asc' },
    })

    if (categories.length === 0) {
      for (const [i, cat] of DEFAULT_CATEGORIES.entries()) {
        await prisma.category.create({
          data: {
            tenantId,
            name: cat.name,
            emoji: cat.emoji,
            color: cat.color,
            sortOrder: i,
          },
        }).catch(() => {})
      }
      const all = await prisma.category.findMany({
        where: { tenantId, isActive: true },
        orderBy: { sortOrder: 'asc' },
      })
      return setCorsHeaders(NextResponse.json(all))
    }

    return setCorsHeaders(NextResponse.json(categories))
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }
}

export async function POST(request: Request) {
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
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    const validation = categorySchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 })
    }
    const { name, emoji, color, sortOrder } = validation.data

    const existing = await prisma.category.findFirst({
      where: { tenantId, name: name.trim() },
    })

    if (existing) {
      if (existing.isActive) {
        return NextResponse.json({ error: 'Category already exists' }, { status: 409 })
      }
      const reactivated = await prisma.category.update({
        where: { id: existing.id },
        data: {
          isActive: true,
          emoji: emoji || existing.emoji,
          color: color || existing.color,
          sortOrder: sortOrder ?? existing.sortOrder,
        },
      })
      await auditLogger.logDataChange(null, tenantId, session.user?.id || '', 'category', reactivated.id, 'CREATE', { name: reactivated.name })
      return setCorsHeaders(NextResponse.json(reactivated, { status: 201 }))
    }

    const category = await prisma.category.create({
      data: {
        tenantId,
        name: name.trim(),
        emoji: emoji || '📦',
        color: color || 'gray',
        sortOrder: sortOrder ?? 0,
      },
    })

    await auditLogger.logDataChange(null, tenantId, session.user?.id || '', 'category', category.id, 'CREATE', { name: category.name })

    return setCorsHeaders(NextResponse.json(category, { status: 201 }))
  } catch (error) {
    console.error('Error creating category:', error)
    const message = error instanceof Error ? error.message : 'Failed to create category'
    if (message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'Category already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
  }
}
