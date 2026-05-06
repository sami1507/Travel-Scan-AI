// i18n configuration
export const locales = [
  'en', // English
  'ar', // Arabic
  'he', // Hebrew
  'fr', // French
  'es', // Spanish
  'de', // German
  'it', // Italian
  'tr', // Turkish
  'ru', // Russian
  'zh', // Chinese
] as const

export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'en'

export const localeNames: Record<Locale, string> = {
  en: 'English',
  ar: 'العربية',
  he: 'עברית',
  fr: 'Français',
  es: 'Español',
  de: 'Deutsch',
  it: 'Italiano',
  tr: 'Türkçe',
  ru: 'Русский',
  zh: '中文',
}

export const rtlLocales: Locale[] = ['ar', 'he']

export function isRTL(locale: Locale): boolean {
  return rtlLocales.includes(locale)
}
