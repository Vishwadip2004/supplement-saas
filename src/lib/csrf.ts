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
  return true
}
