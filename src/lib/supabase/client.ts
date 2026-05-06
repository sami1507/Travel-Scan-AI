// Browser client for client components
import { createBrowserClient } from '@supabase/ssr'

export function createClient(persistSession: boolean = true) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createBrowserClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession,
      storageKey: 'travelscan-auth',
      storage: persistSession ? undefined : {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      },
    },
  })
}
