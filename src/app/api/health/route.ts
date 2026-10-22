// Health check for uptime monitors and deploy verification.
// Public response is deliberately minimal; `?detail=1` (admin only) lists missing configuration.
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/admin-guard'
import { getEnvReport } from '@/lib/env'

export const dynamic = 'force-dynamic'

const DB_TIMEOUT_MS = 3000

async function checkDatabase(): Promise<boolean> {
  try {
    const supabase = createAdminClient()
    const query = supabase.from('subscription_plans').select('id', { head: true, count: 'exact' })
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('database check timed out')), DB_TIMEOUT_MS)
    )
    const { error } = await Promise.race([query, timeout])
    return !error
  } catch {
    return false
  }
}

export async function GET(request: NextRequest) {
  const wantsDetail = new URL(request.url).searchParams.get('detail') === '1'

  if (wantsDetail) {
    const authError = await requireAdmin()
    if (authError) return authError
  }

  const env = getEnvReport()
  const databaseUp = await checkDatabase()
  const healthy = env.ok && databaseUp

  const body: Record<string, unknown> = {
    status: healthy ? 'ok' : 'degraded',
    checks: {
      database: databaseUp ? 'ok' : 'down',
      config: env.ok ? 'ok' : 'incomplete',
    },
    timestamp: new Date().toISOString(),
  }

  if (wantsDetail) {
    body.missingRequired = env.missingRequired
    body.integrations = env.integrations
  }

  return NextResponse.json(body, {
    status: healthy ? 200 : 503,
    headers: { 'Cache-Control': 'no-store' },
  })
}
