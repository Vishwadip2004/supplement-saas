import { NextResponse } from 'next/server'

function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function GET() {
  const tokenArray = new Uint8Array(32)
  crypto.getRandomValues(tokenArray)
  const tokenHex = arrayBufferToHex(tokenArray.buffer)

  const response = NextResponse.json({ csrfToken: tokenHex })
  response.cookies.set('csrf-token', tokenHex, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60,
  })
  return response
}
