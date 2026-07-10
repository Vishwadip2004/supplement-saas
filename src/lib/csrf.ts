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

  const a = new TextEncoder().encode(cookieToken)
  const b = new TextEncoder().encode(headerToken)
  if (a.length !== b.length) return false

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i]
  }
  return result === 0
}
