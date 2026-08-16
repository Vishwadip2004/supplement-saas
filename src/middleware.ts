import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const publicPaths = ['/', '/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password', '/auth/error', '/api/auth', '/api/csrf', '/api/health']

function isPublicPath(pathname: string): boolean {
  return publicPaths.some(path => pathname === path || pathname.startsWith(path + '/'))
}

function isSafeCallbackUrl(url: string): boolean {
  return url.startsWith('/') && !url.startsWith('//') && !url.includes('://')
}

function getAllowedOrigins(): string[] {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('NEXT_PUBLIC_APP_URL must be set in production')
    }
    return ['http://localhost:3000']
  }
  return [appUrl]
}

const allowedOrigins = getAllowedOrigins()

function addCorsHeaders(response: NextResponse, request: NextRequest): NextResponse {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin')
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin)
    }
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-csrf-token')
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set('Access-Control-Max-Age', '86400')
  }
  return response
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (request.method === 'OPTIONS' && pathname.startsWith('/api/')) {
    return addCorsHeaders(new NextResponse(null, { status: 204 }), request)
  }

  if (!isPublicPath(pathname)) {
    const sessionToken = request.cookies.get('next-auth.session-token')?.value
      || request.cookies.get('__Secure-next-auth.session-token')?.value

    if (!sessionToken) {
      if (pathname.startsWith('/api/')) {
        return addCorsHeaders(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), request)
      }
      const loginUrl = new URL('/auth/login', request.url)
      if (isSafeCallbackUrl(pathname)) {
        loginUrl.searchParams.set('callbackUrl', pathname)
      }
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
