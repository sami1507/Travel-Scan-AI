// API endpoint to manually trigger a scan
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSourceConfig } from '@/lib/db/sources'
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

    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { sourceConfigId } = body

    if (!sourceConfigId) {
      return NextResponse.json(
        { error: 'sourceConfigId is required' },
        { status: 400 }
      )
    }

    // Get source config and verify ownership
    const sourceConfig = await getSourceConfig(sourceConfigId, user.id)

    if (!sourceConfig) {
      return NextResponse.json(
        { error: 'Source config not found' },
        { status: 404 }
      )
    }

    // Check if source is active
    if (sourceConfig.status !== 'active') {
      return NextResponse.json(
        { error: 'Source is not active' },
        { status: 400 }
      )
    }

    logger.info('Manual scan triggered', { sourceConfigId, userId: user.id })

    // Run the pipeline asynchronously (don't wait for completion)
    orchestrator.runFullPipeline(sourceConfig).catch(error => {
      logger.error('Manual scan failed', error, { sourceConfigId })
    })

    return NextResponse.json({
      success: true,
      message: 'Scan started successfully',
      sourceConfigId,
    })
  } catch (error) {
    logger.error('Trigger scan API error', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
