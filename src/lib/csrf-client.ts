const CSRF_HEADER_NAME = 'x-csrf-token'

let cachedToken: string | null = null
let fetchPromise: Promise<string | null> | null = null

async function fetchCsrfToken(): Promise<string | null> {
  try {
    const res = await fetch('/api/csrf')
    if (!res.ok) return null
    const data = await res.json()
    return data.csrfToken || null
  } catch {
    return null
  }
}

async function getCsrfToken(): Promise<string | null> {
  if (cachedToken) return cachedToken
  if (!fetchPromise) {
    fetchPromise = fetchCsrfToken().then(token => {
      cachedToken = token
      fetchPromise = null
      if (token) {
        setTimeout(() => { cachedToken = null }, 55 * 60 * 1000)
      }
      return token
    })
  }
  return fetchPromise
}

export async function csrfFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getCsrfToken()
  const headers = new Headers(options.headers)
  if (token) {
    headers.set(CSRF_HEADER_NAME, token)
  }
  return fetch(url, { ...options, headers })
}
