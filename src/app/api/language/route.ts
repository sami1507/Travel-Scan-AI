// Language switching API
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { locales, type Locale } from '@/i18n/config'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { locale } = body

    // Validate locale
    if (!locale || !locales.includes(locale as Locale)) {
      return NextResponse.json(
        { error: 'Invalid locale' },
        { status: 400 }
      )
    }

    // Set cookie
    const cookieStore = await cookies()
    cookieStore.set('NEXT_LOCALE', locale, {
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/',
      sameSite: 'lax',
    })

    return NextResponse.json({ success: true, locale })
  } catch (error) {
    console.error('Language API error:', error)
    return NextResponse.json(
      { error: 'Failed to set language' },
      { status: 500 }
    )
  }
}
