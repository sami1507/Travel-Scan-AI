// API route for triggering agent analysis
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getTravelIntelligenceAgent } from '@/lib/agents'
import { logger } from '@/lib/utils'

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

    // Parse request body
    const body = await request.json().catch(() => ({}))
    const { recordLimit, changeLimit, sourceConfigId } = body

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
    
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    
    return NextResponse.json(
      { 
        error: errorMessage,
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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const changeType = searchParams.get('changeType') as 'new' | 'modified' | 'removed' | null
    const limit = parseInt(searchParams.get('limit') || '50')

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
    
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    
    return NextResponse.json(
      { 
        error: errorMessage,
        success: false,
      },
      { status: 500 }
    )
  }
}
