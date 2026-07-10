import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getCsrfCookieName } from '@/lib/csrf'

function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

const publicPaths = ['/', '/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password', '/api/auth']

function isPublicPath(pathname: string): boolean {
  return publicPaths.some(path => pathname === path || pathname.startsWith(path + '/'))
}

function isSafeCallbackUrl(url: string): boolean {
  return url.startsWith('/') && !url.startsWith('//') && !url.includes('://')
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!isPublicPath(pathname)) {
    const sessionToken = request.cookies.get('next-auth.session-token')?.value
      || request.cookies.get('__Secure-next-auth.session-token')?.value

    if (!sessionToken) {
      const loginUrl = new URL('/auth/login', request.url)
      if (isSafeCallbackUrl(pathname)) {
        loginUrl.searchParams.set('callbackUrl', pathname)
      }
      return NextResponse.redirect(loginUrl)
    }
  }

  const nonceArray = new Uint8Array(16)
  crypto.getRandomValues(nonceArray)
  const nonce = btoa(String.fromCharCode(...nonceArray))
  const response = NextResponse.next()

  response.headers.set('x-nonce', nonce)

  response.headers.set('X-DNS-Prefetch-Control', 'on')
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set(
    'Content-Security-Policy',
    `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';`
  )
  response.headers.set('X-Powered-By', '')

  const existingCsrf = request.cookies.get(getCsrfCookieName())?.value
  if (!existingCsrf) {
    const tokenArray = new Uint8Array(32)
    crypto.getRandomValues(tokenArray)
    const tokenHex = arrayBufferToHex(tokenArray.buffer)
    response.cookies.set(getCsrfCookieName(), tokenHex, {
      httpOnly: false,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60,
    })
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
}
