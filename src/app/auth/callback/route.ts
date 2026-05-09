import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error_description = requestUrl.searchParams.get('error_description')
  const error_code = requestUrl.searchParams.get('error')
  const next = requestUrl.searchParams.get('next') || '/dashboard'
  
  // Use NEXT_PUBLIC_APP_URL for production, fallback to origin
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || requestUrl.origin

  // Handle OAuth errors
  if (error_code) {
    console.error('OAuth error:', error_code, error_description)
    const friendlyError = error_description?.includes('access_denied') 
      ? 'Sign in was cancelled'
      : 'Unable to sign in with Google. Please try again.'
    return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent(friendlyError)}`)
  }

  if (code) {
    try {
      // Create response to set cookies
      const response = NextResponse.redirect(`${baseUrl}${next}`)
      const cookieStore = await cookies()
      
      // Create Supabase client with cookie handling for OAuth callback
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
          cookies: {
            get(name: string) {
              return cookieStore.get(name)?.value
            },
            set(name: string, value: string, options: CookieOptions) {
              cookieStore.set({ name, value, ...options })
              response.cookies.set({ name, value, ...options })
            },
            remove(name: string, options: CookieOptions) {
              cookieStore.set({ name, value: '', ...options })
              response.cookies.set({ name, value: '', ...options })
            },
          },
        }
      )
      
      // Exchange code for session - this handles PKCE verification automatically
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Auth callback error:', error)
        
        // Provide user-friendly error messages
        const friendlyError = error.message.includes('code challenge')
          ? 'Authentication session expired. Please try signing in again.'
          : error.message.includes('invalid')
          ? 'Invalid authentication code. Please try signing in again.'
          : 'Unable to complete sign in. Please try again.'
        
        return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent(friendlyError)}`)
      }
      
      // Session is set in cookies by exchangeCodeForSession
      // Don't check data.session as it may be null even when cookies are set correctly
      console.log('Auth callback success - redirecting to:', next)
      
      // Successful authentication - return the response with cookies set
      return response
    } catch (error) {
      console.error('Auth callback exception:', error)
      return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent('Authentication failed. Please try again.')}`)
    }
  }

  // No code provided - redirect to login
  return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent('No authentication code provided')}`)
}
