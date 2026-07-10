const CSRF_COOKIE_NAME = 'csrf-token'
const CSRF_HEADER_NAME = 'x-csrf-token'

export function getCsrfCookieName(): string {
  return CSRF_COOKIE_NAME
}

export function getCsrfHeaderName(): string {
  return CSRF_HEADER_NAME
}

export function validateCsrfRequest(request: Request): boolean {
  const cookieHeader = request.headers.get('cookie') || ''
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [key, ...val] = c.trim().split('=')
      return [key, val.join('=')]
    })
  )

  const cookieToken = cookies[CSRF_COOKIE_NAME]
  const headerToken = request.headers.get(CSRF_HEADER_NAME)

  if (!cookieToken || !headerToken) return false

  return cookieToken === headerToken
}
