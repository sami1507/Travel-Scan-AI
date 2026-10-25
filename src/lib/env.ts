// Environment configuration report. Pure (takes the env as an argument) so it is testable and
// never returns secret values — only which variables/integrations are present.

type Env = Record<string, string | undefined>

export const REQUIRED_ENV = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'OPENAI_API_KEY',
] as const

// Optional integrations: each is enabled only when all of its variables are set.
export const INTEGRATIONS: Record<string, { vars: string[]; effect: string }> = {
  anthropic: { vars: ['ANTHROPIC_API_KEY'], effect: 'Chat-mode intake and Claude verification' },
  tavily: { vars: ['TAVILY_API_KEY'], effect: 'AI price estimation from web search' },
  duffel: { vars: ['DUFFEL_API_TOKEN'], effect: 'Live flight prices (else AI-estimated)' },
  hotelbeds: { vars: ['HOTELBEDS_API_KEY', 'HOTELBEDS_API_SECRET'], effect: 'Live hotel prices (else AI-estimated)' },
  googlePlaces: { vars: ['GOOGLE_PLACES_API_KEY'], effect: 'Venue enrichment' },
  stripe: {
    vars: ['STRIPE_SECRET_KEY', 'STRIPE_PRO_PRICE_ID', 'STRIPE_WEBHOOK_SECRET'],
    effect: 'Subscriptions and billing',
  },
  redis: { vars: ['KV_REST_API_URL', 'KV_REST_API_TOKEN'], effect: 'Shared rate limiting and caching across instances' },
  exchangeRates: { vars: ['EXCHANGERATE_API_KEY'], effect: 'Live exchange rates (else static snapshot)' },
  cron: { vars: ['CRON_SECRET'], effect: 'Authenticated scheduled scans' },
}

export interface EnvReport {
  ok: boolean
  missingRequired: string[]
  integrations: Record<string, { enabled: boolean; effect: string; missing: string[] }>
}

const isSet = (env: Env, name: string) => Boolean(env[name] && env[name]!.trim().length > 0)

export function getEnvReport(env: Env = process.env): EnvReport {
  const missingRequired = REQUIRED_ENV.filter((name) => !isSet(env, name))

  const integrations: EnvReport['integrations'] = {}
  for (const [name, { vars, effect }] of Object.entries(INTEGRATIONS)) {
    const missing = vars.filter((v) => !isSet(env, v))
    integrations[name] = { enabled: missing.length === 0, effect, missing }
  }

  return { ok: missingRequired.length === 0, missingRequired, integrations }
}
