const CSRF_COOKIE_NAME = 'csrf-token'
const CSRF_HEADER_NAME = 'x-csrf-token'

export function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${CSRF_COOKIE_NAME}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

export async function csrfFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getCsrfToken()
  const headers = new Headers(options.headers)
  if (token) {
    headers.set(CSRF_HEADER_NAME, token)
  }
  return fetch(url, { ...options, headers })
}
