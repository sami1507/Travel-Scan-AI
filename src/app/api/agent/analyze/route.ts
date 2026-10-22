// API route for triggering agent analysis
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getTravelIntelligenceAgent } from '@/lib/agents'
import { logger } from '@/lib/utils'
import { rateLimit, RATE_LIMITS } from '@/lib/security/rate-limiter'
import { validateRequest, schemas } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const rateLimitResponse = await rateLimit(user.id, RATE_LIMITS.AI_INTELLIGENCE)
    if (rateLimitResponse) return rateLimitResponse

    // Parse and validate request body (bounds prevent unbounded-cost AI calls)
    const body = await request.json().catch(() => ({}))
    const validation = validateRequest(schemas.intelligenceRequest, body)
    if (!validation.success) {
      return NextResponse.json({ error: (validation as { success: false; error: string }).error }, { status: 400 })
    }
    const { recordLimit, changeLimit, sourceConfigId } = validation.data

    logger.info('Agent analysis triggered', { userId: user.id, recordLimit, changeLimit, sourceConfigId })

    // Get agent instance
    const agent = getTravelIntelligenceAgent()

    // Run analysis
    const analysis = await agent.analyzeRecentData({
      recordLimit: recordLimit || 50,
      changeLimit: changeLimit || 100,
      sourceConfigId,
    })

    return NextResponse.json({
      success: true,
      analysis,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Agent analysis API error', error)

    return NextResponse.json(
      {
        error: 'Failed to run agent analysis. Please try again.',
        success: false,
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const rateLimitResponse = await rateLimit(user.id, RATE_LIMITS.AI_INTELLIGENCE)
    if (rateLimitResponse) return rateLimitResponse

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const changeType = searchParams.get('changeType') as 'new' | 'modified' | 'removed' | null
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50') || 50, 1), 500)

    logger.info('Agent change analysis triggered', { userId: user.id, changeType, limit })

    // Get agent instance
    const agent = getTravelIntelligenceAgent()

    // Run change analysis
    const analysis = await agent.analyzeChanges(changeType || undefined, limit)

    return NextResponse.json({
      success: true,
      analysis,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Agent change analysis API error', error)

    return NextResponse.json(
      {
        error: 'Failed to run change analysis. Please try again.',
        success: false,
      },
      { status: 500 }
    )
  }
}
