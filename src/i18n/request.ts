// i18n request helper
import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'
import { defaultLocale, type Locale, locales } from './config'

export default getRequestConfig(async () => {
  // Get locale from cookie, falling back to default
  const cookieStore = await cookies()
  const raw = cookieStore.get('NEXT_LOCALE')?.value as Locale | undefined
  const locale: Locale = raw && locales.includes(raw) ? raw : defaultLocale

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  }
})
