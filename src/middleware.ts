import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { buildCsp, generateNonce } from '@/lib/security/csp'

const SUPPORTED_LOCALES = ['en', 'ar', 'he', 'es', 'pt', 'fr', 'de', 'it', 'tr', 'ja']

function detectLocale(request: NextRequest): string {
  const existing = request.cookies.get('NEXT_LOCALE')?.value
  if (existing && SUPPORTED_LOCALES.includes(existing)) return existing
  const acceptLang = request.headers.get('accept-language') || ''
  for (const locale of SUPPORTED_LOCALES) {
    if (acceptLang.toLowerCase().includes(locale)) return locale
  }
  return 'en'
}

export async function middleware(request: NextRequest) {
  // Per-request nonce: Next.js reads it from the request CSP header and stamps it on
  // its inline bootstrap scripts, so no 'unsafe-inline' is needed for scripts.
  const nonce = generateNonce()
  const csp = buildCsp(nonce, process.env.NODE_ENV === 'production')
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)
  const nextWithNonce = () => NextResponse.next({ request: { headers: requestHeaders } })

  let response = nextWithNonce()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = nextWithNonce()
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = nextWithNonce()
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Allow auth callback to proceed without checks
  if (request.nextUrl.pathname.startsWith('/auth/callback')) {
    return response
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protect dashboard routes
  if (request.nextUrl.pathname.startsWith('/dashboard') && !user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect authenticated users away from auth pages
  if ((request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup') && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Add security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  
  response.headers.set('Content-Security-Policy', csp)

  // Set locale cookie if not already present
  if (!request.cookies.get('NEXT_LOCALE')) {
    const locale = detectLocale(request)
    response.cookies.set('NEXT_LOCALE', locale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    })
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
