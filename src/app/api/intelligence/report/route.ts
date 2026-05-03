// Intelligence report API endpoint
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getTravelIntelligenceAgent } from '@/lib/intelligence'
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
    const recordLimit = parseInt(searchParams.get('recordLimit') || '100')
    const changeLimit = parseInt(searchParams.get('changeLimit') || '200')
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
