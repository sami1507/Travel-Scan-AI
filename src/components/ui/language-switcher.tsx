'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { locales, localeNames, localeFlags, type Locale } from '@/i18n/config'
import { ChevronDown, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LanguageSwitcherProps {
  currentLocale?: Locale
  variant?: 'nav' | 'landing'
}

export function LanguageSwitcher({ currentLocale = 'en', variant = 'nav' }: LanguageSwitcherProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (locale: Locale) => {
    document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
    setOpen(false)
    router.refresh()
  }

  const isLanding = variant === 'landing'

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(prev => !prev)}
        aria-label="Select language"
        aria-expanded={open}
        className={cn(
          'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors',
          isLanding
            ? 'text-white/80 hover:text-white hover:bg-white/10'
            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
        )}
      >
        <Globe className="h-3.5 w-3.5 shrink-0" />
        <span className="hidden sm:inline">{localeFlags[currentLocale]}</span>
        <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className={cn(
          'absolute right-0 z-50 mt-1 w-44 rounded-xl border shadow-xl overflow-hidden',
          isLanding
            ? 'border-white/10 bg-[#0f1729]'
            : 'border-border bg-popover'
        )}>
          {locales.map(locale => (
            <button
              key={locale}
              onClick={() => handleSelect(locale)}
              className={cn(
                'flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors text-left',
                locale === currentLocale
                  ? isLanding
                    ? 'bg-white/10 text-white font-medium'
                    : 'bg-[hsl(199,89%,68%)]/12 text-[hsl(199,60%,35%)] font-medium'
                  : isLanding
                    ? 'text-white/70 hover:bg-white/8 hover:text-white'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <span className="text-base leading-none">{localeFlags[locale]}</span>
              <span>{localeNames[locale]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
