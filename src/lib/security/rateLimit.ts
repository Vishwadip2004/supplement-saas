const rateLimitStore = new Map<string, { count: number; lastReset: number }>()

const CLEANUP_INTERVAL = 60 * 1000 // Clean up every 60 seconds

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

export function checkRateLimit(
  ip: string,
  maxRequests: number = 100,
  windowMs: number = 15 * 60 * 1000
): boolean {
  const now = Date.now()
  const record = rateLimitStore.get(ip)

  if (!record || now - record.lastReset > windowMs) {
    rateLimitStore.set(ip, { count: 1, lastReset: now })
    return true
  }

  if (record.count >= maxRequests) {
    return false
  }

  record.count++
  return true
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0].trim()
    return ip || 'unknown'
  }
  return request.headers.get('x-real-ip') || 'unknown'
}
