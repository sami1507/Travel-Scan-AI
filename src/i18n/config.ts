// i18n configuration
export const locales = [
  'en', // English
  'ar', // Arabic (RTL)
  'he', // Hebrew (RTL)
  'es', // Spanish
  'pt', // Portuguese (Brazilian)
  'fr', // French
  'de', // German
  'it', // Italian
  'tr', // Turkish
  'ja', // Japanese
] as const

export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'en'

export const localeNames: Record<Locale, string> = {
  en: 'English',
  ar: 'العربية',
  he: 'עברית',
  es: 'Español',
  pt: 'Português',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
  tr: 'Türkçe',
  ja: '日本語',
}

export const localeFlags: Record<Locale, string> = {
  en: '🇬🇧',
  ar: '🇸🇦',
  he: '🇮🇱',
  es: '🇪🇸',
  pt: '🇧🇷',
  fr: '🇫🇷',
  de: '🇩🇪',
  it: '🇮🇹',
  tr: '🇹🇷',
  ja: '🇯🇵',
}

export const rtlLocales: Locale[] = ['ar', 'he']

export function isRTL(locale: Locale): boolean {
  return rtlLocales.includes(locale)
}
