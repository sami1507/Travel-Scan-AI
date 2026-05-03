// API endpoint to trigger all active sources
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getActiveSourceConfigs } from '@/lib/db/sources'
import { orchestrator } from '@/lib/services/orchestrator'
import { logger } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Authenticate user (or use service key for cron jobs)
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    // Allow both authenticated users and service role
    if (authError && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

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
