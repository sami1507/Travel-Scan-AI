// Intelligence report API endpoint
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getTravelIntelligenceAgent } from '@/lib/intelligence'
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

    logger.info('Intelligence report requested', { 
      userId: user.id, 
      recordLimit, 
      changeLimit, 
      sourceConfigId 
    })

    // Get agent instance
    const agent = getTravelIntelligenceAgent()

    // Generate evidence-based report
    const report = await agent.generateIntelligenceReport({
      recordLimit: recordLimit || 100,
      changeLimit: changeLimit || 200,
      sourceConfigId,
    })

    return NextResponse.json({
      success: true,
      report,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Intelligence report API error', error)
    
    return NextResponse.json(
      {
        error: 'Failed to generate intelligence report. Please try again.',
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

    // Get query parameters (bounded)
    const { searchParams } = new URL(request.url)
    const recordLimit = Math.min(Math.max(parseInt(searchParams.get('recordLimit') || '100') || 100, 1), 500)
    const changeLimit = Math.min(Math.max(parseInt(searchParams.get('changeLimit') || '200') || 200, 1), 1000)
    const sourceConfigId = searchParams.get('sourceConfigId') || undefined

    logger.info('Intelligence report requested (GET)', { 
      userId: user.id, 
      recordLimit, 
      changeLimit, 
      sourceConfigId 
    })

    // Get agent instance
    const agent = getTravelIntelligenceAgent()

    // Generate evidence-based report
    const report = await agent.generateIntelligenceReport({
      recordLimit,
      changeLimit,
      sourceConfigId,
    })

    return NextResponse.json({
      success: true,
      report,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Intelligence report API error (GET)', error)
    
    return NextResponse.json(
      {
        error: 'Failed to generate intelligence report. Please try again.',
        success: false,
      },
      { status: 500 }
    )
  }
}
