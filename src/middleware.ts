import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getCsrfCookieName } from '@/lib/csrf'

function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

const publicPaths = ['/', '/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password', '/auth/error', '/api/auth']

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

  const response = NextResponse.next()

  const existingCsrf = request.cookies.get(getCsrfCookieName())?.value
  if (!existingCsrf) {
    const tokenArray = new Uint8Array(32)
    crypto.getRandomValues(tokenArray)
    const tokenHex = arrayBufferToHex(tokenArray.buffer)
    response.cookies.set(getCsrfCookieName(), tokenHex, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production' && request.url.startsWith('https://'),
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
