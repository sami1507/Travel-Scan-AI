// Travel analysis API endpoint
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { travelAnalysisEngine } from '@/lib/analysis/engine'
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
    const body = await request.json()
    const {
      query,
      destination,
      budget,
      travelMonths,
      interests,
      travelStyle,
      pace,
    } = body

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }

    logger.info('Travel analysis requested', {
      userId: user.id,
      query,
      destination,
      budget,
    })

    // Run analysis with personalization
    const analysis = await travelAnalysisEngine.analyze({
      query,
      destination,
      budget,
      travelMonths,
      interests,
      travelStyle,
      pace,
      userId: user.id, // Enable personalization
    })

    // Track in history (async, don't block response)
    const { SavedItemsService } = await import('@/lib/services/saved-items')
    SavedItemsService.addToHistory(
      user.id,
      query,
      analysis.userConstraints,
      analysis.topRecommendations
    ).catch(err => logger.error('Failed to track history', err))

    return NextResponse.json({
      success: true,
      analysis,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Travel analysis API error', error)

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
