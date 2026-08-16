import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

let upstashLimiter: Ratelimit | null = null

function getUpstashLimiter(): Ratelimit | null {
  if (upstashLimiter) return upstashLimiter
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  upstashLimiter = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(10, '10 s'),
    analytics: true,
  })
  return upstashLimiter
}

const MAX_STORE_SIZE = 10000
const rateLimitStore = new Map<string, { count: number; lastReset: number }>()

const CLEANUP_INTERVAL = 60 * 1000

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, value] of rateLimitStore.entries()) {
      if (now - value.lastReset > 15 * 60 * 1000) {
        rateLimitStore.delete(key)
      }
    }
  }, CLEANUP_INTERVAL)
}

function checkInMemoryRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const now = Date.now()
  const record = rateLimitStore.get(key)

  if (!record || now - record.lastReset > windowMs) {
    if (rateLimitStore.size >= MAX_STORE_SIZE) {
      const oldestKey = rateLimitStore.keys().next().value
      if (oldestKey) rateLimitStore.delete(oldestKey)
    }
    rateLimitStore.set(key, { count: 1, lastReset: now })
    return true
  }

  if (record.count >= maxRequests) {
    return false
  }

  record.count++
  return true
}

export async function checkRateLimit(
  ip: string,
  maxRequests: number = 300,
  windowMs: number = 15 * 60 * 1000
): Promise<boolean> {
  const limiter = getUpstashLimiter()
  if (limiter) {
    const { success } = await limiter.limit(ip)
    return success
  }
  return checkInMemoryRateLimit(ip, maxRequests, windowMs)
}

export function getClientIp(request: Request): string {
  if (process.env.NODE_ENV === 'production') {
    const realIp = request.headers.get('x-real-ip')
    if (realIp) return realIp
    return 'unknown'
  }
  return request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}
