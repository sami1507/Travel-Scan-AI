// API endpoint to trigger all active sources
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getActiveSourceConfigs } from '@/lib/db/sources'
import { orchestrator } from '@/lib/services/orchestrator'
import { logger } from '@/lib/utils'
import { requireAdmin } from '@/lib/auth/admin-guard'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Block in production unless explicitly enabled
    if (process.env.NODE_ENV === 'production' && process.env.ENABLE_TRIGGER_ROUTES !== 'true') {
      return NextResponse.json(
        { error: 'This endpoint is disabled in production' },
        { status: 403 }
      )
    }

    // Require admin authentication
    const authError = await requireAdmin()
    if (authError) return authError

    // Get all active source configs
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
  } catch (error) {
    logger.error('Trigger all API error', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
