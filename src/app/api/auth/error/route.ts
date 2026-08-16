import { redirect } from 'next/navigation'
import { type NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

function isSafeUrl(url: string): boolean {
  return url.startsWith('/') && !url.startsWith('//') && !url.includes('://')
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const error = searchParams.get('error')
  const callbackUrl = searchParams.get('callbackUrl')

  let target = '/auth/error'
  const params = new URLSearchParams()
  if (error) params.set('error', error)
  if (callbackUrl && isSafeUrl(callbackUrl)) params.set('callbackUrl', callbackUrl)
  const qs = params.toString()
  if (qs) target += `?${qs}`

  redirect(target)
}
