// Travel analysis API endpoint
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { travelAnalysisEngine } from '@/lib/analysis/engine'
import { logger } from '@/lib/utils'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { validateRequest, schemas } from '@/lib/validation'
import { errorTracker } from '@/lib/monitoring/error-tracker'
import { canUserAnalyze, incrementAnalysisUsage } from '@/lib/services/subscription'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

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

    // Subscription usage gate
    const usageCheck = await canUserAnalyze(user.id)
    if (!usageCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Analysis limit reached',
          code: 'LIMIT_REACHED',
          analysesUsed: usageCheck.analysesUsed,
          analysesLimit: usageCheck.analysesLimit,
          upgradeUrl: '/dashboard/pricing',
        },
        { status: 429 }
      )
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

    // Normalize request - parse missing fields from query
    let normalizedTripLength = tripLength
    let normalizedDepartureCity = departureCity
    let tripLengthSource: 'explicit' | 'parsed_from_query' | 'default' = 'explicit'
    let departureCitySource: 'explicit' | 'parsed_from_query' | 'unknown' = 'explicit'
    
    // Parse tripLength from query if missing
    if (!normalizedTripLength && query) {
      const tripLengthMatch = query.match(/(\d+)\s*(day|days)/i)
      if (tripLengthMatch) {
        normalizedTripLength = parseInt(tripLengthMatch[1], 10)
        tripLengthSource = 'parsed_from_query'
      }
    }
    
    // Parse departureCity from query if missing
    if (!normalizedDepartureCity && query) {
      // Match patterns like "from Tel Aviv (TLV) - Israel" or "Traveling from Tel Aviv"
      const departureCityMatch = query.match(/from\s+(.+?)(?:\.|,?\s*passport:|,?\s*-?\s*passport|$)/i)
      if (departureCityMatch) {
        normalizedDepartureCity = departureCityMatch[1].trim()
        departureCitySource = 'parsed_from_query'
      }
    }
    
    if (!normalizedDepartureCity) {
      departureCitySource = 'unknown'
    }
    
    logger.info('Travel analysis requested', {
      userId: user.id,
      query,
      destination,
      departureCity: normalizedDepartureCity,
      budget,
      tripLength: normalizedTripLength,
      tripStructure,
      forceFresh,
      freshRunId,
      excludeCountries,
      diversityMode,
    })
    
    logger.info('Normalized Analysis Request', {
      departureCity: normalizedDepartureCity,
      tripLength: normalizedTripLength,
      source: {
        tripLength: tripLengthSource,
        departureCity: departureCitySource,
      },
    })

    // Run analysis with personalization
    const analysis = await travelAnalysisEngine.analyze({
      query,
      destination,
      departureCity: normalizedDepartureCity,
      budget,
      tripLength: normalizedTripLength,
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

    // Increment usage counter (non-blocking)
    incrementAnalysisUsage(user.id).catch(() => {})

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
