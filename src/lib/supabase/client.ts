// Browser client for client components
import { createBrowserClient } from '@supabase/ssr'

export function createClient(persistSession: boolean = true) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createBrowserClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        if (typeof document === 'undefined') return null
        const value = document.cookie
          .split('; ')
          .find((row) => row.startsWith(`${name}=`))
          ?.split('=')[1]
        return value ? decodeURIComponent(value) : null
      },
      set(name: string, value: string, options: any) {
        if (typeof document === 'undefined') return
        let cookie = `${name}=${encodeURIComponent(value)}`
        if (options?.maxAge) cookie += `; max-age=${options.maxAge}`
        if (options?.path) cookie += `; path=${options.path}`
        if (options?.domain) cookie += `; domain=${options.domain}`
        if (options?.sameSite) cookie += `; samesite=${options.sameSite}`
        if (options?.secure) cookie += '; secure'
        document.cookie = cookie
      },
      remove(name: string, options: any) {
        if (typeof document === 'undefined') return
        let cookie = `${name}=; max-age=0`
        if (options?.path) cookie += `; path=${options.path}`
        if (options?.domain) cookie += `; domain=${options.domain}`
        document.cookie = cookie
      },
    },
  })
}
