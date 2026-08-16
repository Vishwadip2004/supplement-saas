import crypto from 'crypto'

const CSRF_COOKIE_NAME = 'csrf-token'
const CSRF_HEADER_NAME = 'x-csrf-token'

export function getCsrfCookieName(): string {
  return CSRF_COOKIE_NAME
}

export function getCsrfHeaderName(): string {
  return CSRF_HEADER_NAME
}

export function validateCsrfRequest(request: Request): boolean {
  const headerToken = request.headers.get(CSRF_HEADER_NAME)
  if (!headerToken) return false
  if (headerToken.length < 16) return false

  const cookieHeader = request.headers.get('cookie') || ''
  const cookieMatch = cookieHeader.split(';').find(c => c.trim().startsWith(`${CSRF_COOKIE_NAME}=`))
  const cookieToken = cookieMatch ? cookieMatch.split('=')[1]?.trim() : null

  if (!cookieToken) return false

  try {
    const headerBuf = Buffer.from(headerToken, 'utf8')
    const cookieBuf = Buffer.from(cookieToken, 'utf8')
    if (headerBuf.length !== cookieBuf.length) return false
    return crypto.timingSafeEqual(headerBuf, cookieBuf)
  } catch {
    return false
  }
}
