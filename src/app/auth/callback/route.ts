import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

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
    return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent(error_description || error_code)}`)
  }

  if (code) {
    try {
      const supabase = await createServerSupabaseClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Auth callback error:', error)
        return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent(error.message)}`)
      }
      
      // Successful authentication - redirect to intended destination
      return NextResponse.redirect(`${baseUrl}${next}`)
    } catch (error) {
      console.error('Auth callback exception:', error)
      return NextResponse.redirect(`${baseUrl}/login?error=Authentication failed`)
    }
  }

  // No code provided - redirect to login
  return NextResponse.redirect(`${baseUrl}/login?error=No authentication code provided`)
}
