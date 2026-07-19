import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'
import { auditLogger } from '@/lib/security/audit'
import { setCorsHeaders } from '@/lib/cors'
import { checkRateLimit, getClientIp } from '@/lib/security/rateLimit'
import { extractTenantId } from '@/lib/tenant'
import { validateCsrfRequest } from '@/lib/csrf'

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
      const created = await prisma.category.createMany({
        data: DEFAULT_CATEGORIES.map((cat, i) => ({
          tenantId,
          name: cat.name,
          emoji: cat.emoji,
          color: cat.color,
          sortOrder: i,
        })),
      })
      const all = await prisma.category.findMany({
        where: { tenantId, isActive: true },
        orderBy: { sortOrder: 'asc' },
      })
      const response = NextResponse.json(all)
      setCorsHeaders(response)
      return response
    }

    const response = NextResponse.json(categories)
    setCorsHeaders(response)
    return response
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
    const body = await request.json()
    const { name, emoji, color, sortOrder } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
    }

    const existing = await prisma.category.findFirst({
      where: { tenantId, name: name.trim() },
    })

    if (existing) {
      return NextResponse.json({ error: 'Category already exists' }, { status: 409 })
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

    const response = NextResponse.json(category, { status: 201 })
    setCorsHeaders(response)
    return response
  } catch (error) {
    console.error('Error creating category:', error)
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
  }
}
