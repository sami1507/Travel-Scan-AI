// API endpoint to trigger all active sources — invoked by the Vercel Cron job (GET)
// or manually by an admin from the dashboard (POST).
import { NextRequest, NextResponse } from 'next/server'
import { getActiveSourceConfigs } from '@/lib/db/sources'
import { orchestrator } from '@/lib/services/orchestrator'
import { logger } from '@/lib/utils'
import { requireAdmin } from '@/lib/auth/admin-guard'

export const dynamic = 'force-dynamic'

function isAuthorizedCronRequest(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const authHeader = request.headers.get('authorization')
  return authHeader === `Bearer ${secret}`
}

async function runTriggerAll(request: NextRequest) {
  // Block in production unless explicitly enabled
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_TRIGGER_ROUTES !== 'true') {
    return NextResponse.json(
      { error: 'This endpoint is disabled in production' },
      { status: 403 }
    )
  }

  // Vercel Cron authenticates with a shared secret (no user session available);
  // manual/dashboard calls authenticate as an admin user instead.
  if (!isAuthorizedCronRequest(request)) {
    const authError = await requireAdmin()
    if (authError) return authError
  }

  const sourceConfigs = await getActiveSourceConfigs()

  if (sourceConfigs.length === 0) {
    return NextResponse.json({
      success: true,
      message: 'No active sources to scan',
      count: 0,
    })
  }

  logger.info('Triggering all active sources', { count: sourceConfigs.length })

  // Run pipelines asynchronously
  orchestrator.runMultipleSources(sourceConfigs).catch(error => {
    logger.error('Batch scan failed', error)
  })

  return NextResponse.json({
    success: true,
    message: 'Scans started successfully',
    count: sourceConfigs.length,
  })
}

// Vercel Cron sends a GET request to the configured path
export async function GET(request: NextRequest) {
  try {
    return await runTriggerAll(request)
  } catch (error) {
    logger.error('Trigger all API error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Manual trigger from the admin dashboard
export async function POST(request: NextRequest) {
  try {
    return await runTriggerAll(request)
  } catch (error) {
    logger.error('Trigger all API error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
