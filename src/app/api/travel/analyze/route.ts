// Travel analysis API endpoint
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { travelAnalysisEngine } from '@/lib/analysis/engine'
import { logger } from '@/lib/utils'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { validateRequest, schemas } from '@/lib/validation'
import { errorTracker } from '@/lib/monitoring/error-tracker'

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

    // Rate limiting
    const rateLimitResponse = rateLimit(user.id, RATE_LIMITS.ANALYSIS)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = validateRequest(schemas.analysisRequest, body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: (validation as { success: false; error: string }).error },
        { status: 400 }
      )
    }

    const {
      query,
      destination,
      departureCity,
      budget,
      tripLength,
      travelMonths,
      interests,
      travelStyle,
      pace,
      tripStructure,
      forceFresh,
      freshRunId,
      excludeCountries,
      diversityMode,
    } = validation.data

    logger.info('Travel analysis requested', {
      userId: user.id,
      query,
      destination,
      departureCity,
      budget,
      tripLength,
      tripStructure,
      forceFresh,
      freshRunId,
      excludeCountries,
      diversityMode,
    })

    // Run analysis with personalization
    const analysis = await travelAnalysisEngine.analyze({
      query,
      destination,
      departureCity,
      budget,
      tripLength,
      travelMonths,
      interests,
      travelStyle,
      pace,
      tripStructure,
      userId: user.id, // Enable personalization
      forceFresh,
      freshRunId,
      excludeCountries,
      diversityMode,
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
    errorTracker.trackAnalysisError(error, undefined, undefined)

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
